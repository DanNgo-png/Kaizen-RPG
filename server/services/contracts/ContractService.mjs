import { ItemFactory } from '../../factories/ItemFactory.mjs';
import {
    CARAVAN_CONTRACT_KEYWORDS,
    COMBAT_CONTRACT_KEYWORDS,
    COMBAT_NEGOTIATION_TERM_IDS,
    CARAVAN_CONTRACT_TITLES,
    CONTRACT_EVENT_DURATION,
    CONTRACT_GENERATION,
    CONTRACT_INFLUENCE_TERM_BY_ID,
    CONTRACT_INFLUENCE_TERMS,
    CONTRACT_LOOT,
    CONTRACT_REPUTATION,
    CONTRACT_TYPE,
    DIRECT_CLEARING,
    HOSTILE_CAMP_CONTRACT_KEYWORDS,
    HOSTILE_CONTRACT_TARGET_TYPES,
    HOSTILE_REPUTATION_THRESHOLD,
    INFLUENCE_REWARD,
    NEGATIVE_ECONOMIC_EVENTS,
    NEGATIVE_EVENT_DECAY_REDUCTION,
    NEGATIVE_EVENT_REMEDY_BONUS_INF,
    NEGATIVE_EVENT_REMEDY_BONUS_REP,
    NON_GROWING_SETTLEMENT_TYPES,
    REFUGEE_CONTRACT,
    RENOWN_REWARD,
    SETTLEMENT_EVENT_ID,
    STANDARD_CONTRACT_TEMPLATES,
    UNDEAD_CONTRACT,
    UNDEAD_NODE_TYPES,
    contractTitleHasKeyword
} from '../../database/SQLite3/repositories/game/GameRepositoryConstants.mjs';

export class ContractService {
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

    getNodeById(...args) {
        return this.repo.getNodeById(...args);
    }

    setCampaignSetting(...args) {
        return this.repo.setCampaignSetting(...args);
    }

    updateGold(...args) {
        return this.repo.updateGold(...args);
    }

    updateRenown(...args) {
        return this.repo.updateRenown(...args);
    }

    updateNodeReputation(...args) {
        return this.repo.updateNodeReputation(...args);
    }

    updateNodeInfluence(...args) {
        return this.repo.updateNodeInfluence(...args);
    }

    addItemToInventory(...args) {
        return this.repo.addItemToInventory(...args);
    }

    logNodeHistory(...args) {
        return this.repo.logNodeHistory(...args);
    }

    _mapWorldNode(...args) {
        return this.repo._mapWorldNode(...args);
    }

    getOrGenerateContracts(
        nodeId,
        minMins = CONTRACT_GENERATION.DEFAULT_MIN_MINUTES,
        maxMins = CONTRACT_GENERATION.DEFAULT_MAX_MINUTES
    ) {
        this.ensureConnection();
        let contracts = this.statements.getNodeContracts.all(nodeId);

        if (contracts.length === 0) {
            const originNode = this.getNodeById(nodeId);
            const possibleMins = this._buildContractMinuteOptions(minMins, maxMins);
            const generatedContracts = this._buildContractBoard(originNode, possibleMins);

            generatedContracts.forEach((contract) => {
                this.statements.insertContract.run(contract);
            });
            contracts = this.statements.getNodeContracts.all(nodeId);
        }
        return contracts.map((contract) => this._mapContract(contract));
    }

    _buildContractMinuteOptions(minMins, maxMins) {
        const start = Math.max(CONTRACT_GENERATION.MINUTE_STEP, Number(minMins) || CONTRACT_GENERATION.MINUTE_STEP);
        const end = Math.max(start, Number(maxMins) || start);
        const possibleMins = [];

        for (let minutes = start; minutes <= end; minutes += CONTRACT_GENERATION.MINUTE_STEP) {
            possibleMins.push(minutes);
        }

        return possibleMins.length > 0 ? possibleMins : [start];
    }

    _buildContractBoard(originNode, possibleMins) {
        if (originNode.type === 'Refugee Camp') {
            return this._buildRefugeeContractBoard(originNode, possibleMins);
        }

        if (!this._canOfferSettlementContracts(originNode)) return [];

        const contracts = [];
        
        if (originNode.current_event === 'undead_invasion' || originNode.current_event === 'undead_siege') {
            contracts.push(this._createUndeadDefenseContract(originNode, possibleMins));
        }

        const hostileTarget = this._findNearestHostileCamp(originNode);
        if (hostileTarget) {
            const isUndeadNode = UNDEAD_NODE_TYPES.includes(hostileTarget.type);
            
            if (isUndeadNode) {
                const hasNecromancer = hostileTarget.type === 'Necropolis'
                    || (hostileTarget.id % UNDEAD_CONTRACT.NECROMANCER_MODULUS === UNDEAD_CONTRACT.NECROMANCER_REMAINDER);
                if (hasNecromancer) {
                    contracts.push(this._createNecromancerHuntContract(originNode, hostileTarget, possibleMins));
                } else {
                    contracts.push(this._createUndeadPurgeContract(originNode, hostileTarget, possibleMins));
                }
            } else {
                contracts.push(this._createHostileCampContract(originNode, hostileTarget, possibleMins));
            }
        }

        const destination = this._pickSettlementDestination(originNode.id);
        if (destination) {
            contracts.push(this._createCaravanContract(originNode, destination, possibleMins));
        }

        while (contracts.length < CONTRACT_GENERATION.BOARD_SIZE) {
            contracts.push(this._createStandardContract(originNode, possibleMins));
        }

        return this._shuffleContracts(contracts).slice(0, CONTRACT_GENERATION.BOARD_SIZE);
    }

    _createStandardContract(originNode, possibleMins) {
        const template = this._pickRandom(STANDARD_CONTRACT_TEMPLATES);
        const reqMins = this._pickContractMinutes(possibleMins);

        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: CONTRACT_TYPE.STANDARD,
            title: template.title,
            desc: template.description,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins)
        };
    }

    _createCaravanContract(originNode, destinationNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins);
        const title = this._pickRandom(CARAVAN_CONTRACT_TITLES);

        return {
            node_id: originNode.id,
            target_node_id: destinationNode.id,
            contract_type: CONTRACT_TYPE.CARAVAN,
            title: `${title} to ${destinationNode.name}`,
            desc: `A caravan from ${originNode.name} needs protection on the road to ${destinationNode.name}. The destination will benefit if the goods arrive.`,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins)
        };
    }

    _createHostileCampContract(originNode, campNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, CONTRACT_GENERATION.HOSTILE_CAMP_MIN_MINUTES);

        return {
            node_id: originNode.id,
            target_node_id: campNode.id,
            contract_type: CONTRACT_TYPE.HOSTILE_CAMP,
            title: `Destroy ${campNode.type}: ${campNode.name}`,
            desc: `${originNode.name} wants ${campNode.name} cleared from the roads. The pay is rich, and the stores should be worth plundering.`,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, CONTRACT_GENERATION.HOSTILE_CAMP_GOLD_MULTIPLIER)
        };
    }

    _pickContractMinutes(possibleMins, minimumMinutes = null) {
        const eligible = minimumMinutes === null
            ? possibleMins
            : possibleMins.filter((minutes) => minutes >= minimumMinutes);

        return this._pickRandom(eligible.length > 0 ? eligible : possibleMins);
    }

    _calculateContractGold(requiredMinutes, multiplier = CONTRACT_GENERATION.DEFAULT_GOLD_MULTIPLIER) {
        const variance = CONTRACT_GENERATION.GOLD_VARIANCE_MIN + (Math.random() * CONTRACT_GENERATION.GOLD_VARIANCE_RANGE);
        return Math.floor(requiredMinutes * CONTRACT_GENERATION.GOLD_PER_MINUTE * variance * multiplier);
    }

    _pickSettlementDestination(originNodeId) {
        const destinations = this._getContractSettlementNodes()
            .filter((node) => node.id !== originNodeId);

        return destinations.length > 0 ? this._pickRandom(destinations) : null;
    }

    _findNearestHostileCamp(originNode) {
        if (!originNode) return null;

        return this.statements.getAllNodes.all()
            .filter((node) => HOSTILE_CONTRACT_TARGET_TYPES.includes(node.type))
            .sort((a, b) => this._distanceSquared(originNode, a) - this._distanceSquared(originNode, b))[0] || null;
    }

    _getContractSettlementNodes() {
        return this.statements.getAllNodes.all()
            .map((node) => this._mapWorldNode(node))
            .filter((node) => this._canOfferSettlementContracts(node));
    }

    _canOfferSettlementContracts(node) {
        if (!node) return false;
        if (NON_GROWING_SETTLEMENT_TYPES.includes(node.type)) return false;
        if (node.is_hostile === 1) return false;
        return (node.reputation || 0) > HOSTILE_REPUTATION_THRESHOLD;
    }

    _canDirectlyClearHostileNode(node) {
        return Boolean(node && (HOSTILE_CONTRACT_TARGET_TYPES.includes(node.type) || node.is_hostile === 1));
    }

    _findNearestFriendlySettlement(originNode) {
        if (!originNode) return null;

        return this.statements.getAllNodes.all()
            .map((node) => this._mapWorldNode(node))
            .filter((node) => this._canOfferSettlementContracts(node))
            .sort((a, b) => this._distanceSquared(originNode, a) - this._distanceSquared(originNode, b))[0] || null;
    }

    _distanceSquared(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return (dx * dx) + (dy * dy);
    }

    _shuffleContracts(contracts) {
        const shuffled = [...contracts];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }

    _pickRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    acceptContract(contractId) {
        this.ensureConnection();
        this.statements.setActiveContract.run(contractId);
        this.setCampaignSetting('is_delving', 'false');
    }

    negotiateContractTerm(contractId, nodeId, termId) {
        this.ensureConnection();

        const contract = this._mapContract(this.statements.getContractById.get(contractId));
        if (!contract) throw new Error("Contract not found.");
        if (contract.is_active === 1) throw new Error("Contract terms must be negotiated before accepting the job.");
        if (contract.is_completed === 1) throw new Error("Completed contracts cannot be renegotiated.");
        if (Number(contract.node_id) !== Number(nodeId)) throw new Error("This contract does not belong to the selected settlement.");

        const term = CONTRACT_INFLUENCE_TERM_BY_ID.get(termId);
        if (!term) throw new Error("Unknown political favor.");
        const contractType = this._resolveContractType(contract);
        if (COMBAT_NEGOTIATION_TERM_IDS.includes(term.id) && !this._isCombatLootContract(contract, contractType)) {
            throw new Error("That favor only applies to dangerous combat work.");
        }

        const terms = this._getContractTerms(contract);
        if (terms[term.id]) throw new Error("This favor is already attached to the contract.");

        const node = this.getNodeById(nodeId);
        const currentInfluence = Number(node?.influence) || 0;
        if (currentInfluence < term.cost) {
            throw new Error(`Not enough Influence in ${node?.name || 'this settlement'}.`);
        }

        let updatedGoldReward = contract.gold_reward;
        const applyNegotiation = this.db.transaction(() => {
            updatedGoldReward = this._applyNegotiatedTermEffect(contract, node, term, terms);
            this.statements.updateNodeInfluence.run({ id: nodeId, amount: -term.cost });
            this.statements.updateContractTerms.run({
                id: contract.id,
                terms: JSON.stringify(terms),
                gold_reward: updatedGoldReward
            });
        });
        applyNegotiation();

        const updatedContract = this._mapContract(this.statements.getContractById.get(contract.id));
        const updatedNode = this.getNodeById(nodeId);

        return {
            contract: updatedContract,
            node: updatedNode,
            message: `${term.label} secured in ${updatedNode?.name || 'the settlement'}.`
        };
    }

    startHostileSettlementClearing(
        nodeId,
        minMins = CONTRACT_GENERATION.DEFAULT_MIN_MINUTES,
        maxMins = CONTRACT_GENERATION.DEFAULT_MAX_MINUTES
    ) {
        this.ensureConnection();

        if (this.getActiveContract()) {
            throw new Error("Your company is already committed to an active assignment.");
        }

        const campNode = this.getNodeById(nodeId);
        if (!this._canDirectlyClearHostileNode(campNode)) {
            throw new Error("Only enemy settlements can be cleared directly.");
        }

        const supportNode = this._findNearestFriendlySettlement(campNode);
        if (!supportNode) {
            throw new Error("No friendly settlement is close enough to support this raid.");
        }

        const possibleMins = this._buildContractMinuteOptions(minMins, maxMins);
        const requiredMinutes = this._pickContractMinutes(possibleMins, CONTRACT_GENERATION.HOSTILE_CAMP_MIN_MINUTES);
        const result = this.statements.insertContract.run({
            node_id: supportNode.id,
            target_node_id: campNode.id,
            contract_type: CONTRACT_TYPE.DIRECT_CLEARING,
            title: `Clear ${campNode.type}: ${campNode.name}`,
            desc: `Your company will clear ${campNode.name} without waiting for a settlement contract. No patron pays a reward, but the camp stores can be plundered.`,
            req_mins: requiredMinutes,
            gold: DIRECT_CLEARING.GOLD_REWARD
        });

        this.statements.setActiveContract.run(result.lastInsertRowid);
        this.setCampaignSetting('is_delving', 'false');

        return this.getActiveContract();
    }

    getActiveContract() {
        this.ensureConnection();
        return this._mapContract(this.statements.getActiveContract.get());
    }

    cancelContract(contractId) {
        this.ensureConnection();
        this.statements.abortContract.run(contractId);
    }

    updateContractProgress(contractId, progressMinutes) {
        this.ensureConnection();
        this.statements.setContractProgress.run({ id: contractId, progress: progressMinutes });
    }

    completeActiveContract() {
        this.ensureConnection();
        const activeContract = this.getActiveContract();
        if (!activeContract) return null;

        this.statements.completeContract.run({ id: activeContract.id });
        this.updateGold(activeContract.gold_reward);

        const companyName = this.statements.getSetting.get('company_name')?.value || "The Company";
        const originNode = this.getNodeById(activeContract.node_id);
        const targetNode = this._resolveContractTargetNode(activeContract, originNode);
        const contractType = this._resolveContractType(activeContract);
        const beneficiaryNode = this._getContractBeneficiaryNode(activeContract, originNode, targetNode);

        activeContract.contract_type = contractType;
        activeContract.beneficiary_node_id = beneficiaryNode?.id ?? null;
        activeContract.beneficiary_node_name = beneficiaryNode?.name ?? null;
        activeContract.renown_reward = this._awardContractRenown(activeContract, contractType);

        const isRefugeeContract = ['refugee_defense', 'refugee_supply', 'refugee_guard'].includes(contractType);

        let contractRepReward;
        let finalInfluenceReward;

        if (isRefugeeContract) {
            contractRepReward = contractType === 'refugee_defense'
                ? REFUGEE_CONTRACT.DEFENSE_REPUTATION_REWARD
                : REFUGEE_CONTRACT.SUPPORT_REPUTATION_REWARD;
            finalInfluenceReward = contractType === 'refugee_defense'
                ? REFUGEE_CONTRACT.DEFENSE_INFLUENCE_REWARD
                : REFUGEE_CONTRACT.SUPPORT_INFLUENCE_REWARD;
            
            if (beneficiaryNode) {
                this.updateNodeReputation(beneficiaryNode.id, contractRepReward);
                this.updateNodeInfluence(beneficiaryNode.id, finalInfluenceReward);
            }
        } else {
            contractRepReward = Math.max(
                CONTRACT_REPUTATION.MIN_REWARD,
                Math.floor(activeContract.required_minutes / CONTRACT_REPUTATION.MINUTES_PER_POINT)
            );
            finalInfluenceReward = beneficiaryNode
                ? this._awardContractInfluence(beneficiaryNode.id, activeContract, contractType)
                : 0;
            if (beneficiaryNode) {
                this.updateNodeReputation(beneficiaryNode.id, contractRepReward);
            }
        }

        activeContract.renown_reward = this._calculateContractRenown(activeContract, contractType);
        activeContract.influence_reward = finalInfluenceReward;
        activeContract.influence_node_name = beneficiaryNode?.name ?? null;

        if (this._isDirectClearingContractType(contractType)) {
            return this._completeDirectClearing(activeContract, targetNode, originNode, companyName);
        }

        if (beneficiaryNode) {
            this.logNodeHistory(beneficiaryNode.id, `${companyName} completed a contract: "${activeContract.title}".`, 'player');
            
            if (activeContract.contract_type === 'undead_defense' || activeContract.title.includes("Defend")) {
                this.db.prepare("UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?").run(beneficiaryNode.id);
                this.logNodeHistory(beneficiaryNode.id, `${companyName} successfully repelled the undead horde, saving the settlement!`, 'player');
            }

            if (activeContract.contract_type === 'refugee_defense') {
                this.db.prepare("UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?").run(beneficiaryNode.id);
                this.logNodeHistory(beneficiaryNode.id, `${companyName} repelled the raiders, securing the camp survivors!`, 'player');
            }
        }

        // Apply caravan & camp destruction logics...
        const caravanOutcome = this._applyCaravanContractOutcome(activeContract, beneficiaryNode, companyName);
        const campDestroyedLoot = this._handleCampDestruction(activeContract, targetNode || originNode, beneficiaryNode, companyName);

        const refreshedBeneficiaryNode = beneficiaryNode ? this.getNodeById(beneficiaryNode.id) : null;
        this._trackSettlementContractGrowth(refreshedBeneficiaryNode);

        const beneficiaryLabel = beneficiaryNode?.name || 'camp';
        
        const logs = [
            `📜 Contract Completed: ${activeContract.title}`,
            `💰 Earned ${activeContract.gold_reward} crowns!`,
            `Renown increased by ${activeContract.renown_reward}.`,
            `Influence in ${beneficiaryLabel} increased by ${finalInfluenceReward}.`,
            `Reputation with ${beneficiaryLabel} increased by ${contractRepReward}.`
        ];

        // Process loot, salvages and return...
        const foundLoot = [];
        let lootChance = CONTRACT_LOOT.DEFAULT_CHANCE;

        if (this._isCombatLootContract(activeContract, contractType)) {
            lootChance = CONTRACT_LOOT.COMBAT_CHANCE;
        }
        if (this._isHostileCampContractType(contractType)) {
            lootChance = CONTRACT_LOOT.HOSTILE_CAMP_CHANCE;
        }
        if (campDestroyedLoot) {
            foundLoot.push(campDestroyedLoot);
            logs.push(`🔥 Hostile location destroyed! You found hidden stash: ${campDestroyedLoot.name}`);
        }

        const rolls = this._countLootRolls(activeContract, contractType);
        for (let i = 0; i < rolls; i++) {
            if (Math.random() < lootChance) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ You recovered loot: ${newItem.name}`);
            }
        }

        this._grantSalvageRightsLoot(activeContract, logs, foundLoot);

        return { contract: activeContract, logs, loot: foundLoot };
    }

    _completeDirectClearing(activeContract, targetNode, supportNode, companyName) {
        const foundLoot = [];
        const logs = [
            `⚔️ Direct Clearing Completed: ${activeContract.title}`,
            "No patron paid for this raid, but the surrounding roads are safer.",
            `Renown increased by ${activeContract.renown_reward}.`,
            `Influence in ${supportNode?.name || 'nearby settlements'} increased by ${activeContract.influence_reward}.`
        ];

        const campDestroyedLoot = this._handleCampDestruction(activeContract, targetNode, supportNode, companyName);
        if (campDestroyedLoot) {
            foundLoot.push(campDestroyedLoot);
            activeContract._campDestroyedLoot = campDestroyedLoot;
            logs.push(`🔥 Hostile location destroyed! You found hidden stash: ${campDestroyedLoot.name}`);
        }

        const rolls = this._countLootRolls(activeContract, activeContract.contract_type);
        for (let i = 0; i < rolls; i++) {
            if (Math.random() < CONTRACT_LOOT.HOSTILE_CAMP_CHANCE) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ You recovered loot: ${newItem.name}`);
            }
        }

        this._grantSalvageRightsLoot(activeContract, logs, foundLoot);

        return { contract: activeContract, logs, loot: foundLoot };
    }

    _awardContractRenown(contract, contractType) {
        const reward = this._calculateContractRenown(contract, contractType);
        this.updateRenown(reward);
        return reward;
    }

    _calculateContractRenown(contract, contractType) {
        const baseReward = Math.max(
            RENOWN_REWARD.MIN_REWARD,
            Math.floor(contract.required_minutes / RENOWN_REWARD.MINUTES_PER_POINT)
        );

        let bonus = 0;
        if (this._isHostileCampContractType(contractType)) bonus += RENOWN_REWARD.HOSTILE_CAMP_BONUS;
        if (this._isDirectClearingContractType(contractType)) bonus += RENOWN_REWARD.DIRECT_CLEARING_BONUS;
        if (contractType === 'undead_defense') bonus += RENOWN_REWARD.UNDEAD_DEFENSE_BONUS;
        if (contractType === 'necromancer_hunt') bonus += RENOWN_REWARD.NECROMANCER_HUNT_BONUS;

        return baseReward + bonus;
    }

    _awardContractInfluence(nodeId, contract, contractType) {
        const reward = this._calculateContractInfluence(contract, contractType);
        this.updateNodeInfluence(nodeId, reward);
        return reward;
    }

    _calculateContractInfluence(contract, contractType) {
        const baseReward = Math.max(
            INFLUENCE_REWARD.MIN_REWARD,
            Math.floor(contract.required_minutes / INFLUENCE_REWARD.MINUTES_PER_POINT)
        );

        let bonus = 0;
        if (contractType === CONTRACT_TYPE.CARAVAN) bonus += INFLUENCE_REWARD.CARAVAN_BONUS;
        if (this._isHostileCampContractType(contractType)) bonus += INFLUENCE_REWARD.HOSTILE_CAMP_BONUS;
        if (this._isDirectClearingContractType(contractType)) bonus += INFLUENCE_REWARD.DIRECT_CLEARING_BONUS;
        if (contractType === 'undead_defense') bonus += INFLUENCE_REWARD.UNDEAD_DEFENSE_BONUS;
        if (contractType === 'necromancer_hunt') bonus += INFLUENCE_REWARD.NECROMANCER_HUNT_BONUS;

        return baseReward + bonus;
    }

    _grantSalvageRightsLoot(contract, logs, foundLoot) {
        const salvageRights = CONTRACT_INFLUENCE_TERM_BY_ID.get('salvage_rights');
        if (!salvageRights || !this._contractHasTerm(contract, salvageRights.id)) return;

        for (let index = 0; index < salvageRights.extraArmorPieces; index++) {
            const newItem = ItemFactory.getRandomArmorPiece();
            this.addItemToInventory(newItem.id);
            foundLoot.push(newItem);
            logs.push(`Salvage rights honored: recovered ${newItem.name}.`);
        }
    }

    _applyNegotiatedTermEffect(contract, node, term, terms) {
        terms[term.id] = true;
        const companyName = this.statements.getSetting.get('company_name')?.value || "The Company";

        if (term.id === 'better_pay') {
            this.logNodeHistory(
                node.id,
                `${companyName} spent Influence to secure better pay on "${contract.title}".`,
                'player'
            );
            return Math.ceil(contract.gold_reward * term.goldMultiplier);
        }

        if (term.id === 'local_pardon') {
            this.updateNodeReputation(node.id, term.reputationGain);
            this.logNodeHistory(
                node.id,
                `${companyName} spent Influence to secure a localized pardon, restoring ${term.reputationGain} reputation.`,
                'player'
            );
            return contract.gold_reward;
        }

        this.logNodeHistory(
            node.id,
            `${companyName} spent Influence to secure ${term.label.toLowerCase()} on "${contract.title}".`,
            'player'
        );

        return contract.gold_reward;
    }

    _mapContract(contract) {
        if (!contract) return contract;

        const mapped = { ...contract };
        mapped.terms = this._getContractTerms(mapped);
        mapped.influence_options = this._buildInfluenceOptions(mapped);
        return mapped;
    }

    _getContractTerms(contract) {
        if (!contract) return {};
        if (contract.terms && typeof contract.terms === 'object') return { ...contract.terms };

        try {
            const parsed = JSON.parse(contract.terms || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    _buildInfluenceOptions(contract) {
        if (!contract || contract.is_active === 1 || contract.is_completed === 1) return [];
        const terms = this._getContractTerms(contract);
        const contractType = this._resolveContractType(contract);
        const canUseCombatTerms = this._isCombatLootContract(contract, contractType);

        return CONTRACT_INFLUENCE_TERMS
            .filter((term) => canUseCombatTerms || !COMBAT_NEGOTIATION_TERM_IDS.includes(term.id))
            .map((term) => ({
                id: term.id,
                label: term.label,
                icon: term.icon,
                cost: term.cost,
                description: term.description,
                applied: Boolean(terms[term.id])
            }));
    }

    _contractHasTerm(contract, termId) {
        return Boolean(this._getContractTerms(contract)[termId]);
    }

    _resolveContractType(contract) {
        if ([CONTRACT_TYPE.CARAVAN, CONTRACT_TYPE.BRIGAND_CAMP, CONTRACT_TYPE.HOSTILE_CAMP, CONTRACT_TYPE.DIRECT_CLEARING, 'undead_defense', 'undead_purge', 'necromancer_hunt', 'refugee_defense', 'refugee_supply', 'refugee_guard'].includes(contract.contract_type)) {
            return contract.contract_type;
        }

        if (contractTitleHasKeyword(contract.title, CARAVAN_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.CARAVAN;
        }

        if (contractTitleHasKeyword(contract.title, HOSTILE_CAMP_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.HOSTILE_CAMP;
        }

        return CONTRACT_TYPE.STANDARD;
    }

    _resolveContractTargetNode(contract, originNode) {
        if (contract.target_node_id) {
            return this.getNodeById(contract.target_node_id);
        }

        if (this._resolveContractType(contract) === CONTRACT_TYPE.CARAVAN) {
            return this._pickSettlementDestination(originNode?.id);
        }

        return null;
    }

    _getContractBeneficiaryNode(contract, originNode, targetNode) {
        if (this._resolveContractType(contract) === CONTRACT_TYPE.CARAVAN && this._canReceiveContractBenefits(targetNode)) {
            return targetNode;
        }

        return this._canReceiveContractBenefits(originNode) ? originNode : null;
    }

    _canReceiveContractBenefits(node) {
        return Boolean(node && !NON_GROWING_SETTLEMENT_TYPES.includes(node.type));
    }

    _handleCampDestruction(contract, campNode, settlementNode, companyName) {
        const contractType = this._resolveContractType(contract);
        const isLegacyCampContract = !contract.target_node_id
            && campNode
            && NON_GROWING_SETTLEMENT_TYPES.includes(campNode.type)
            && this._isCombatLootContract(contract, contractType);

        if (!this._isHostileCampContractType(contractType) && !isLegacyCampContract) {
            return null;
        }

        if (!campNode || !NON_GROWING_SETTLEMENT_TYPES.includes(campNode.type)) {
            return null;
        }

        this.db.prepare('DELETE FROM contracts WHERE target_node_id = ? AND is_completed = 0').run(campNode.id);
        this.db.prepare('DELETE FROM world_nodes WHERE id = ?').run(campNode.id);

        if (settlementNode) {
            this.logNodeHistory(
                settlementNode.id,
                `${companyName} destroyed ${campNode.name}, making the surrounding region much safer.`,
                'player'
            );
        }

        const rareItem = ItemFactory.getRandomItem();
        this.addItemToInventory(rareItem.id);
        return rareItem;
    }

    _trackSettlementContractGrowth(growthNode) {
        return this.repo._trackSettlementContractGrowth(growthNode);
    }

    _isCombatLootContract(contract, contractType = this._resolveContractType(contract)) {
        return this._isHostileCampContractType(contractType)
            || contractTitleHasKeyword(contract.title, COMBAT_CONTRACT_KEYWORDS);
    }

    _countLootRolls(contract, contractType) {
        const baseRolls = Math.max(
            CONTRACT_LOOT.MIN_ROLLS,
            Math.floor(contract.required_minutes / CONTRACT_LOOT.MINUTES_PER_ROLL)
        );

        if (this._isHostileCampContractType(contractType)) {
            return baseRolls + CONTRACT_LOOT.HOSTILE_CAMP_EXTRA_ROLLS;
        }

        return baseRolls;
    }

    _isHostileCampContractType(contractType) {
        return contractType === CONTRACT_TYPE.HOSTILE_CAMP
            || contractType === CONTRACT_TYPE.BRIGAND_CAMP
            || contractType === 'undead_purge'
            || contractType === 'necromancer_hunt'
            || this._isDirectClearingContractType(contractType);
    }

    _isDirectClearingContractType(contractType) {
        return contractType === CONTRACT_TYPE.DIRECT_CLEARING;
    }

    _applyCaravanContractOutcome(contract, node, companyName) {
        if (this._resolveContractType(contract) !== CONTRACT_TYPE.CARAVAN || !node) {
            return null;
        }

        let bonusRepReward = 0;
        let bonusInfluenceReward = 0;
        let eventMitigated = false;

        // Check if the node is currently suffering from a negative economic event
        if (node.current_event && NEGATIVE_ECONOMIC_EVENTS.includes(node.current_event)) {
            const currentExpiration = node.event_expiration || 0;
            const newExpiration = Math.max(0, currentExpiration - NEGATIVE_EVENT_DECAY_REDUCTION);
            eventMitigated = true;

            bonusRepReward = NEGATIVE_EVENT_REMEDY_BONUS_REP;
            bonusInfluenceReward = NEGATIVE_EVENT_REMEDY_BONUS_INF;

            // Apply the bonus reputation and influence
            this.updateNodeReputation(node.id, bonusRepReward);
            this.updateNodeInfluence(node.id, bonusInfluenceReward);

            if (newExpiration <= 0) {
                // Clear the negative event, returning prices to standard levels immediately
                this.db.prepare('UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?').run(node.id);
                this.logNodeHistory(
                    node.id,
                    `${companyName} completed a vital supply run, successfully ending the "${node.current_event}" crisis and restoring standard market prices!`,
                    'player'
                );
            } else {
                // Decrease the event decay timer
                this.db.prepare('UPDATE world_nodes SET event_expiration = ? WHERE id = ?').run(newExpiration, node.id);
                this.logNodeHistory(
                    node.id,
                    `${companyName} delivered essential supplies, mitigating the effects of "${node.current_event}" and reducing its expected duration by ${NEGATIVE_EVENT_DECAY_REDUCTION} days.`,
                    'player'
                );
            }
        } else {
            // Default behavior if no negative economic event: apply Well Supplied
            this._setNodeEvent(
                node.id,
                SETTLEMENT_EVENT_ID.WELL_SUPPLIED,
                CONTRACT_EVENT_DURATION.WELL_SUPPLIED_DAYS
            );

            this.logNodeHistory(
                node.id,
                `A merchant caravan safely arrived at ${node.name}, guided by ${companyName}. The settlement is now well supplied!`,
                'world'
            );
        }

        // Return a data package so the completion logging method can dynamically adapt
        return {
            bonusRep: bonusRepReward,
            bonusInfluence: bonusInfluenceReward,
            eventMitigated: eventMitigated
        };
    }

    _setNodeEvent(nodeId, eventId, durationDays) {
        this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ? WHERE id = ?')
            .run(eventId, durationDays, nodeId);
    }


    _buildRefugeeContractBoard(originNode, possibleMins) {
        const contracts = [];
        
        if (originNode.current_event === 'refugee_under_attack') {
            contracts.push(this._createRefugeeDefenseContract(originNode, possibleMins));
        }

        contracts.push(this._createRefugeeSupplyContract(originNode, possibleMins));
        contracts.push(this._createRefugeeGuardContract(originNode, possibleMins));

        while (contracts.length < CONTRACT_GENERATION.BOARD_SIZE) {
            contracts.push(this._createRefugeeSupplyContract(originNode, possibleMins));
        }

        return this._shuffleContracts(contracts).slice(0, CONTRACT_GENERATION.BOARD_SIZE);
    }

    _createUndeadDefenseContract(originNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, UNDEAD_CONTRACT.DEFENSE_MIN_MINUTES);
        const isSiege = originNode.current_event === 'undead_siege';
        const title = `Defend ${originNode.name} against Undead ${isSiege ? 'Siege' : 'Horde'}`;
        const desc = isSiege
            ? `A massive army of the dead, orchestrated by a dark Necromancer, has surrounded ${originNode.name}. Help the garrison lift the siege before the walls are breached.`
            : `A mindless horde of shambling zombies and skeleton thralls has struck ${originNode.name}. Take up arms and defend the survivors!`;

        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: 'undead_defense',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, UNDEAD_CONTRACT.DEFENSE_GOLD_MULTIPLIER)
        };
    }

    _createUndeadPurgeContract(originNode, targetNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, UNDEAD_CONTRACT.PURGE_MIN_MINUTES);
        const title = `Cleanse ${targetNode.name}`;
        const desc = `The restless dead are leaking out of the dark chambers of ${targetNode.name}. Venture deep into the crypts, slay the ancient horrors, and seal the graves forever.`;

        return {
            node_id: originNode.id,
            target_node_id: targetNode.id,
            contract_type: 'undead_purge',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, UNDEAD_CONTRACT.PURGE_GOLD_MULTIPLIER)
        };
    }

    _createNecromancerHuntContract(originNode, targetNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, UNDEAD_CONTRACT.NECROMANCER_HUNT_MIN_MINUTES);
        const title = `Slay Necromancer in ${targetNode.name}`;
        const desc = `A dark sorcerer is weaving foul rituals from the shadow of ${targetNode.name}. Infiltrate the ruins, bypass their undead guardians, and cut down the necromancer.`;

        return {
            node_id: originNode.id,
            target_node_id: targetNode.id,
            contract_type: 'necromancer_hunt',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, UNDEAD_CONTRACT.NECROMANCER_HUNT_GOLD_MULTIPLIER)
        };
    }

    _createRefugeeDefenseContract(originNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, REFUGEE_CONTRACT.DEFENSE_MIN_MINUTES);
        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: 'refugee_defense',
            title: `Defend ${originNode.name} from Extermination`,
            desc: `A vicious pack of wild beasts and scavengers has cornered the camp survivors. Stand alongside the desperate wounded and hold them back, or none will see the dawn.`,
            req_mins: reqMins,
            gold: REFUGEE_CONTRACT.HUMANITARIAN_GOLD_REWARD
        };
    }

    _createRefugeeSupplyContract(originNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, REFUGEE_CONTRACT.SUPPLY_MIN_MINUTES);
        const tokenPay = Math.floor(REFUGEE_CONTRACT.SUPPLY_TOKEN_PAY_MIN + Math.random() * REFUGEE_CONTRACT.SUPPLY_TOKEN_PAY_RANGE);
        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: 'refugee_supply',
            title: `Deliver Medicine and Rations to ${originNode.name}`,
            desc: `The children and elder survivors are shivering in the damp cold, starving and diseased. Deliver basic medical wraps and rations to help them endure another week in the wild.`,
            req_mins: reqMins,
            gold: tokenPay
        };
    }

    _createRefugeeGuardContract(originNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, REFUGEE_CONTRACT.GUARD_MIN_MINUTES);
        const tokenPay = Math.floor(REFUGEE_CONTRACT.GUARD_TOKEN_PAY_MIN + Math.random() * REFUGEE_CONTRACT.GUARD_TOKEN_PAY_RANGE);
        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: 'refugee_guard',
            title: `Patrol the Perimeter of ${originNode.name}`,
            desc: `Hostile scouts and hungry wolves are circling the perimeter of the camp. Watch the tree line and drive away any lurking threats while the survivors gather firewood.`,
            req_mins: reqMins,
            gold: tokenPay
        };
    }
}
