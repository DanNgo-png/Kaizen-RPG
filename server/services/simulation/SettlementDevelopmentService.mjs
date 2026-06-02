import {
    SETTLEMENT_NAMES,
    SETTLEMENT_TIERS,
    SETTLEMENT_UPGRADE_PATH,
    normalizeSpecializations,
    serializeSpecializations
} from '../../data/GameDataConstants.mjs';
import {
    COLONY_NODE_DEFAULTS,
    COLONY_PLACEMENT,
    EXPANSION_POLICY,
    POPULATION,
    SETTLEMENT_DEVELOPMENT,
    canTrackSettlementGrowth
} from '../../database/SQLite3/repositories/game/GameRepositoryConstants.mjs';
import { SettlementSpecializationPlanner } from './SettlementSpecializationPlanner.mjs';

export class SettlementDevelopmentService {
    constructor(repo) {
        this.repo = repo;
    }

    get db() {
        return this.repo.db;
    }

    get statements() {
        return this.repo.statements;
    }

    ensureConnection() {
        return this.repo.ensureConnection();
    }

    getNodeById(nodeId) {
        return this.repo.getNodeById(nodeId);
    }

    logNodeHistory(...args) {
        return this.repo.logNodeHistory(...args);
    }

    updateNodeSpecialization(...args) {
        return this.repo.updateNodeSpecialization(...args);
    }

    mapWorldNode(row) {
        return this.repo._mapWorldNode(row);
    }

    updateNodeDevelopment(nodeId, progress, newType, newEvent, buyMod, sellMod, populationTier = POPULATION.DEFAULT_TIER, remainingReqs = '{}') {
        this.ensureConnection();

        if (newEvent === null) {
            this.db.prepare(`
                UPDATE world_nodes 
                SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?, population_tier = ?, expansion_reqs = ?
                WHERE id = ?
            `).run(progress, newType, newEvent, buyMod, sellMod, populationTier, remainingReqs, nodeId);
            return;
        }

        this.db.prepare(`
            UPDATE world_nodes 
            SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?, population_tier = ?
            WHERE id = ?
        `).run(progress, newType, newEvent, buyMod, sellMod, populationTier, nodeId);
    }

    spawnColony(parentNode, specialization = null) {
        this.ensureConnection();
        const allNodes = this.statements.getAllNodes.all();
        const location = this._findColonyLocation(parentNode, allNodes);

        if (!location) return null;

        const newName = this._pickColonyName(parentNode, allNodes);
        const info = this.statements.insertNode.run({
            type: 'Hamlet',
            name: newName,
            x: Math.round(location.x),
            y: Math.round(location.y),
            faction_id: parentNode.faction_id,
            reputation: COLONY_NODE_DEFAULTS.REPUTATION,
            buy_modifier: COLONY_NODE_DEFAULTS.BUY_MODIFIER,
            sell_modifier: COLONY_NODE_DEFAULTS.SELL_MODIFIER,
            specialization: serializeSpecializations(specialization),
            attachments: COLONY_NODE_DEFAULTS.ATTACHMENTS,
            influence: COLONY_NODE_DEFAULTS.INFLUENCE
        });

        return { id: info.lastInsertRowid, name: newName };
    }

    logTradeVolume(nodeId, amount) {
        this.ensureConnection();
        const node = this.getNodeById(nodeId);
        this.trackGrowthRequirement(node, 'trade', amount);
    }

    trackSettlementContractGrowth(growthNode) {
        this.trackGrowthRequirement(growthNode, 'contracts', SETTLEMENT_DEVELOPMENT.CONTRACT_COMPLETION_INCREMENT);
    }

    trackGrowthRequirement(node, requirementKey, amount) {
        const tierData = SETTLEMENT_TIERS[node?.type];
        if (!canTrackSettlementGrowth(node, tierData)) return;

        const requirements = this._readExpansionRequirements(node);
        requirements[requirementKey] = (requirements[requirementKey] || 0) + amount;

        this._saveExpansionRequirements(node.id, requirements);

        if (this._hasMetGrowthRequirements(requirements, tierData)) {
            const eventType = this.shouldTriggerExpansion(node) ? 'settlement_expansion' : 'building_boom';
            this.triggerSettlementGrowthEvent(node.id, eventType);
        }
    }

    calculateInitialDevelopmentProgress(node) {
        const specializations = normalizeSpecializations(node?.specializations ?? node?.specialization);
        const matchingMaterialCount = SETTLEMENT_DEVELOPMENT.BUILDING_MATERIAL_SPECIALIZATIONS
            .filter((specialization) => specializations.includes(specialization))
            .length;
        const maxProgress = this._getMaterialRequirement(node);

        if (matchingMaterialCount === 1) {
            return Math.floor(maxProgress / SETTLEMENT_DEVELOPMENT.FIRST_MATERIAL_PROGRESS_DIVISOR);
        }

        if (matchingMaterialCount === 2) {
            return Math.floor(
                (maxProgress * SETTLEMENT_DEVELOPMENT.SECOND_MATERIAL_PROGRESS_NUMERATOR)
                / SETTLEMENT_DEVELOPMENT.SECOND_MATERIAL_PROGRESS_DIVISOR
            );
        }

        if (matchingMaterialCount >= SETTLEMENT_DEVELOPMENT.BUILDING_MATERIAL_SPECIALIZATIONS.length) {
            return maxProgress;
        }

        return 0;
    }

    triggerSettlementGrowthEvent(nodeId, eventType) {
        const node = this.getNodeById(nodeId);
        if (!node) return;

        const initialProgress = this.calculateInitialDevelopmentProgress(node);
        const maxProgress = this._getMaterialRequirement(node);

        this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ?, development_progress = ? WHERE id = ?')
            .run(eventType, SETTLEMENT_DEVELOPMENT.AUTONOMOUS_PROJECT_EXPIRATION, initialProgress, node.id);

        if (initialProgress >= maxProgress) {
            this.logNodeHistory(node.id, `With all three local building material specializations active, ${node.name} self-funded and completed its expansion project autonomously!`, 'world');
            this.incrementNodeDevelopment(node.id, 0);
            return;
        }

        let message = `Driven by prosperity, ${node.name} has initiated a ${eventType === 'building_boom' ? 'building boom' : 'settlement expansion'}!`;
        if (initialProgress > 0) {
            message += ` Leveraging local materials, they have already completed ${initialProgress}/${maxProgress} of the required work.`;
        } else {
            message += ' They require building materials from external traders to progress.';
        }

        this.logNodeHistory(node.id, message, 'world');
    }

    chooseFirstSpecializationForNode(node, materialItemId) {
        const currentSpecializations = normalizeSpecializations(node?.specializations ?? node?.specialization);
        if (currentSpecializations.length > 0) return null;

        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            node,
            materialItemId,
            currentSpecializations
        );
    }

    chooseColonySpecialization(parentNode, materialItemId) {
        const parentSpecializations = normalizeSpecializations(parentNode?.specializations ?? parentNode?.specialization);
        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            parentNode,
            materialItemId,
            parentSpecializations
        );
    }

    incrementNodeDevelopment(nodeId, increment, itemId = null) {
        const node = this.getNodeById(nodeId);
        if (!node || !node.current_event) return null;

        const maxProgress = this._getMaterialRequirement(node);
        const tierInfo = this._getTierInfo(node);

        let newProgress = (node.development_progress || 0) + increment;
        let newType = node.type;
        let newEvent = node.current_event;
        let buyMod = node.buy_modifier;
        let sellMod = node.sell_modifier;
        let newPopulationTier = node.population_tier || POPULATION.DEFAULT_TIER;
        let remainingReqs = '{}';

        let upgraded = false;
        let popGrown = false;
        let specializationBuilt = null;
        let oldPopLabel = '';
        let newPopLabel = '';
        let spawnedColonyName = null;

        if (newProgress >= maxProgress) {
            newProgress = 0;
            newEvent = null;

            specializationBuilt = this.chooseFirstSpecializationForNode(node, itemId);

            if (specializationBuilt) {
                this.updateNodeSpecialization(node.id, [specializationBuilt]);
            } else if (newPopulationTier < POPULATION.MAX_TIER) {
                oldPopLabel = POPULATION.LABELS[newPopulationTier];
                newPopulationTier += 1;
                newPopLabel = POPULATION.LABELS[newPopulationTier];
                popGrown = true;
            } else {
                const nextTier = SETTLEMENT_UPGRADE_PATH[node.type];
                if (nextTier) {
                    newType = nextTier;
                    newPopulationTier = POPULATION.DEFAULT_TIER;
                    upgraded = true;

                    const nextTierInfo = SETTLEMENT_TIERS[nextTier];
                    if (nextTierInfo) {
                        buyMod = nextTierInfo.buyMult;
                        sellMod = nextTierInfo.sellMult;
                    }
                } else {
                    newPopulationTier = POPULATION.MAX_TIER;
                }
            }

            remainingReqs = JSON.stringify(
                this._carryForwardGrowthRequirements(node, tierInfo)
            );
        }

        if (node.current_event === 'settlement_expansion' && newProgress === 0 && !specializationBuilt) {
            const colonySpecialization = this.chooseColonySpecialization(node, itemId);
            const spawnedNode = this.spawnColony(node, colonySpecialization);
            if (spawnedNode) {
                spawnedColonyName = spawnedNode.name;
                this.logNodeHistory(node.id, `Established the new settlement of ${spawnedNode.name} with a ${colonySpecialization ? 'focus on ' + colonySpecialization : 'focus on local resources'}.`, 'world');
                this.logNodeHistory(spawnedNode.id, `Founded as an outpost by ${node.name}.`, 'world');
            }
        }

        this.updateNodeDevelopment(node.id, newProgress, newType, newEvent, buyMod, sellMod, newPopulationTier, remainingReqs);
        this._logDevelopmentResult(node, {
            newProgress,
            specializationBuilt,
            popGrown,
            upgraded,
            oldPopLabel,
            newPopLabel,
            newType
        });

        return {
            upgraded,
            popGrown,
            specializationBuilt,
            spawnedColonyName,
            newProgress,
            maxProg: maxProgress
        };
    }

    shouldTriggerExpansion(node) {
        const nextType = SETTLEMENT_UPGRADE_PATH[node.type];
        if (!nextType) return true;

        if (!EXPANSION_POLICY.EXPANDABLE_TYPES.includes(node.type)) {
            return false;
        }

        const popTier = node.population_tier || POPULATION.DEFAULT_TIER;
        if (popTier < EXPANSION_POLICY.MIN_EXPANSION_POP_TIER) {
            return false;
        }

        const localInfluence = Number(node.influence) || 0;
        if (localInfluence < EXPANSION_POLICY.MIN_REQUIRED_INFLUENCE) {
            return false;
        }

        const isStable = !node.current_event || !EXPANSION_POLICY.STABILITY_CRISIS_EVENTS.includes(node.current_event);
        const hasStableStanding = (node.reputation || 0) >= EXPANSION_POLICY.HOSTILE_STANDING_LIMIT;
        if (!isStable || !hasStableStanding) {
            return false;
        }

        const parentFactionId = node.faction_id;
        if (parentFactionId === null) {
            return false;
        }

        if (this._isLocallyCrowded(node)) {
            return false;
        }

        if (popTier === POPULATION.MAX_TIER) {
            return true;
        }

        if (this._lacksFoundationalMaterials(parentFactionId)) {
            return true;
        }

        return popTier >= EXPANSION_POLICY.HIGH_POPULATION_TIER
            && localInfluence >= EXPANSION_POLICY.SURPLUS_INFLUENCE_LIMIT;
    }

    _findColonyLocation(parentNode, allNodes) {
        let attempt = 0;

        while (attempt < COLONY_PLACEMENT.MAX_ATTEMPTS) {
            const angle = Math.random() * Math.PI * 2;
            const distance = COLONY_PLACEMENT.MIN_DISTANCE + Math.random() * COLONY_PLACEMENT.SEARCH_RADIUS;
            const candidate = {
                x: parentNode.x + Math.cos(angle) * distance,
                y: parentNode.y + Math.sin(angle) * distance
            };

            if (this._isValidColonyLocation(candidate, allNodes)) {
                return candidate;
            }

            attempt++;
        }

        return null;
    }

    _isValidColonyLocation(candidate, allNodes) {
        if (
            candidate.x < COLONY_PLACEMENT.MAP_MIN_X
            || candidate.x > COLONY_PLACEMENT.MAP_MAX_X
            || candidate.y < COLONY_PLACEMENT.MAP_MIN_Y
            || candidate.y > COLONY_PLACEMENT.MAP_MAX_Y
        ) {
            return false;
        }

        return allNodes.every((node) => {
            const distance = Math.hypot(node.x - candidate.x, node.y - candidate.y);
            return distance >= COLONY_PLACEMENT.MIN_NODE_SPACING;
        });
    }

    _pickColonyName(parentNode, allNodes) {
        const usedNames = new Set(allNodes.map((node) => node.name));
        const availableNames = SETTLEMENT_NAMES.filter((name) => !usedNames.has(name));

        if (availableNames.length > 0) {
            return availableNames[Math.floor(Math.random() * availableNames.length)];
        }

        const prefix = COLONY_PLACEMENT.FALLBACK_NAME_PREFIXES[
            Math.floor(Math.random() * COLONY_PLACEMENT.FALLBACK_NAME_PREFIXES.length)
        ];
        return `${prefix} ${parentNode.name}`;
    }

    _getTierInfo(node) {
        return SETTLEMENT_TIERS[node?.type] || {
            growthReqs: {
                materials: SETTLEMENT_DEVELOPMENT.DEFAULT_MATERIAL_REQUIREMENT
            }
        };
    }

    _getMaterialRequirement(node) {
        const tierInfo = this._getTierInfo(node);
        return tierInfo.growthReqs?.materials || SETTLEMENT_DEVELOPMENT.DEFAULT_MATERIAL_REQUIREMENT;
    }

    _readExpansionRequirements(node) {
        try {
            return JSON.parse(node?.expansion_reqs || '{}');
        } catch (error) {
            return {};
        }
    }

    _saveExpansionRequirements(nodeId, requirements) {
        this.db.prepare('UPDATE world_nodes SET expansion_reqs = ? WHERE id = ?')
            .run(JSON.stringify(requirements), nodeId);
    }

    _hasMetGrowthRequirements(requirements, tierData) {
        return (requirements.contracts || 0) >= tierData.growthReqs.contracts
            && (requirements.trade || 0) >= tierData.growthReqs.trade;
    }

    _carryForwardGrowthRequirements(node, tierInfo) {
        const requirements = this._readExpansionRequirements(node);

        if (!tierInfo.growthReqs) return requirements;

        if (requirements.contracts !== undefined) {
            requirements.contracts = Math.max(0, requirements.contracts - (tierInfo.growthReqs.contracts || 0));
        }

        if (requirements.trade !== undefined) {
            requirements.trade = Math.max(0, requirements.trade - (tierInfo.growthReqs.trade || 0));
        }

        return requirements;
    }

    _logDevelopmentResult(node, result) {
        if (result.newProgress !== 0) return;

        if (result.specializationBuilt) {
            this.logNodeHistory(node.id, `The construction finished! ${node.name} built a ${result.specializationBuilt}, giving the settlement its first local specialization.`, 'world');
            return;
        }

        if (result.popGrown) {
            this.logNodeHistory(node.id, `The construction finished! The settlement's population has grown from ${result.oldPopLabel} to ${result.newPopLabel}.`, 'world');
            return;
        }

        if (result.upgraded) {
            this.logNodeHistory(node.id, `The construction finished! The settlement has grown into a ${result.newType}.`, 'world');
            return;
        }

        if (node.current_event === 'settlement_expansion') {
            this.logNodeHistory(node.id, `The construction finished! ${node.name} has expanded its borders.`, 'world');
            return;
        }

        this.logNodeHistory(node.id, 'The construction finished! The settlement continues to thrive at maximum capacity.', 'world');
    }

    _isLocallyCrowded(node) {
        const allNodes = this.statements.getAllNodes.all();
        const crowdingRadiusSq = EXPANSION_POLICY.CROWDING_RADIUS_PX * EXPANSION_POLICY.CROWDING_RADIUS_PX;
        const localNodesCount = allNodes.filter((otherNode) => {
            return this._distanceSquared(node, otherNode) <= crowdingRadiusSq;
        }).length;

        return localNodesCount >= EXPANSION_POLICY.LOCAL_CROWDING_LIMIT;
    }

    _lacksFoundationalMaterials(parentFactionId) {
        const factionNodes = this.statements.getAllNodes.all()
            .map((node) => this.mapWorldNode(node))
            .filter((node) => node.faction_id === parentFactionId);
        const factionSpecializations = new Set();

        factionNodes.forEach((node) => {
            const specializations = normalizeSpecializations(node.specializations ?? node.specialization);
            specializations.forEach((specialization) => factionSpecializations.add(specialization));
        });

        return SETTLEMENT_DEVELOPMENT.BUILDING_MATERIAL_SPECIALIZATIONS
            .some((specialization) => !factionSpecializations.has(specialization));
    }

    _distanceSquared(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return (dx * dx) + (dy * dy);
    }
}
