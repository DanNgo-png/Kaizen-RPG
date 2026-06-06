import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { NOBLE_HOUSE_LORE_POOL, WORLD_GENERATION_CONFIG, WORLD_NODE_TYPE_WEIGHTS } from "../../../data/factions/NobleFactions.mjs";
import { BARBARIAN_NODE_TYPES } from "../../../data/factions/BarbarianFactions.mjs";
import { SETTLEMENT_NAMES, SETTLEMENT_TIERS, SETTLEMENT_EVENTS, normalizeSpecializations } from "../../../data/GameDataConstants.mjs";
import { SettlementSpecializationPlanner } from "../SettlementSpecializationPlanner.mjs";

const HOSTILE_SETTLEMENT_TYPES = Object.freeze([
    "Ruins",
    "Bandit Camp",
    "Bandit Outpost",
    "Bandit Stronghold",
    "Stolen Stronghold",
    ...Object.values(BARBARIAN_NODE_TYPES)
]);

const SETTLEMENT_EVENT_CHANCE = 0.05;
const DANGEROUS_DISTANCE_PX = 150;
const SAFE_DISTANCE_PX = 400;
const EVENT_DURATION_MIN_DAYS = 3;
const EVENT_DURATION_VARIANCE_DAYS = 5;
const DANGEROUS_EVENT_KEYS = Object.freeze([
    'raided',
    'terrified_villagers',
    'ambushed_trade_routes',
    'sieged'
]);
const SAFE_EVENT_KEYS = Object.freeze([
    'well_supplied',
    'safe_roads'
]);

export class NobleBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        const count = rng.randomInt(WORLD_GENERATION_CONFIG.MIN_HOUSES, WORLD_GENERATION_CONFIG.MAX_HOUSES);
        const selectedHouses = rng.shuffle([...NOBLE_HOUSE_LORE_POOL]).slice(0, count);

        return selectedHouses.map(house => {
            const result = this.repo.createFaction({ ...house, type: 'noble' });
            return { ...house, type: 'noble', id: Number(result.lastInsertRowid) }; 
        });
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        const factions = context.factions.filter(f => f.type === 'noble');

        if (context.isPremade) {
            const originalIds = [...new Set(context.nodes.map(n => n.faction_id).filter(id => id !== null))].sort((a,b)=>a-b);
            const factionMap = new Map(originalIds.map((id, idx) => [id, factions[idx]?.id ?? null]));

            context.nodes.forEach(n => {
                const tierInfo = SETTLEMENT_TIERS[n.type] || { buyMult: 1, sellMult: 1 };
                const fid = n.faction_id !== null ? factionMap.get(Number(n.faction_id)) : null;
                const info = this.repo.createWorldNode({
                    ...n,
                    faction_id: fid,
                    buy_modifier: n.buy_modifier || tierInfo.buyMult,
                    sell_modifier: n.sell_modifier || tierInfo.sellMult,
                    attachments: n.attachments || 0
                });
                createdNodes.push({ ...n, id: info.lastInsertRowid, faction_id: fid });
            });
        } else {
            const capitals = [];
            factions.forEach(house => {
                const pos = this._findCapitalPosition(capitals, rng);
                const tierInfo = SETTLEMENT_TIERS[house.capitalType];
                const specializations = SettlementSpecializationPlanner.pickInitialSpecializations(
                    { type: house.capitalType, name: house.seatName, ...pos },
                    rng,
                    { map: WORLD_GENERATION_CONFIG }
                );
                const info = this.repo.createWorldNode({
                    type: house.capitalType,
                    name: house.seatName,
                    x: pos.x, y: pos.y,
                    faction_id: house.id,
                    buy_modifier: tierInfo.buyMult, sell_modifier: tierInfo.sellMult,
                    specialization: specializations,
                    attachments: rng.randomInt(1, 3)
                });
                const node = { id: info.lastInsertRowid, ...pos, factionId: house.id, name: house.seatName, type: house.capitalType, specialization: specializations };
                capitals.push(node);
                createdNodes.push(node);
            });

            const reservedNames = new Set(factions.map(h => h.seatName));
            const availableNames = rng.shuffle(SETTLEMENT_NAMES.filter(n => !reservedNames.has(n)));
            const remaining = Math.max(0, WORLD_GENERATION_CONFIG.NODE_COUNT - capitals.length);

            for (let i = 0; i < remaining; i++) {
                const x = rng.randomInt(WORLD_GENERATION_CONFIG.MAP_MIN_X, WORLD_GENERATION_CONFIG.MAP_WIDTH);
                const y = rng.randomInt(WORLD_GENERATION_CONFIG.MAP_MIN_Y, WORLD_GENERATION_CONFIG.MAP_HEIGHT);
                const type = rng.pick(WORLD_NODE_TYPE_WEIGHTS);
                const name = availableNames.pop() || `Unknown ${i}`;
                const closest = this._findClosestCapital({x,y}, capitals);
                const tierInfo = SETTLEMENT_TIERS[type] || { buyMult: 1, sellMult: 1 };
                const specializations = SettlementSpecializationPlanner.pickInitialSpecializations(
                    { type, name, x, y },
                    rng,
                    {
                        poorChance: WORLD_GENERATION_CONFIG.POOR_SPECIALIZATION_CHANCE,
                        map: WORLD_GENERATION_CONFIG
                    }
                );

                const info = this.repo.createWorldNode({
                    type, name, x, y,
                    faction_id: type === 'Ruins' ? null : closest?.factionId ?? null,
                    buy_modifier: tierInfo.buyMult, sell_modifier: tierInfo.sellMult,
                    specialization: specializations,
                    attachments: rng.randomInt(0, 3)
                });
                createdNodes.push({ id: info.lastInsertRowid, type, name, x, y, faction_id: closest?.factionId, specialization: specializations });
            }
        }
        return createdNodes;
    }

    _findNearestFriendlySettlement(originNode, settlements) {
        if (!originNode || settlements.length === 0) return null;
        const candidates = settlements.filter(s => s.id !== originNode.id);
        if (candidates.length === 0) return null;
        return [...candidates].sort((a, b) => this.distance(originNode, a) - this.distance(originNode, b))[0];
    }

    _findNearestHostileCamp(originNode, enemies) {
        if (!originNode || enemies.length === 0) return null;
        return [...enemies].sort((a, b) => this.distance(originNode, a) - this.distance(originNode, b))[0];
    }

    _processSiegeTicks(settlements, currentDay, logs) {
        const siegedNodes = settlements.filter(n => n.current_event === 'sieged' || n.current_event === 'undead_siege');
        
        for (const n of siegedNodes) {
            const startDay = n.siege_start_day;
            if (startDay === null || startDay === undefined) continue;

            const attackerId = n.siege_attacker_id;
            if (!attackerId) continue;

            const attacker = this.repo.getNodeById(attackerId);
            if (!attacker) continue;

            const elapsedDays = currentDay - startDay;

            // 1. Check for Rumor Spread (Only if not revealed yet, and it has been at least 2 days)
            if (n.siege_attacker_revealed === 0 && elapsedDays >= 2) {
                // 30% daily chance
                if (Math.random() < 0.30) {
                    const neighbor = this._findNearestFriendlySettlement(n, settlements);
                    if (neighbor) {
                        this.repo.db.prepare('UPDATE world_nodes SET siege_attacker_revealed = 1 WHERE id = ?').run(n.id);
                        n.siege_attacker_revealed = 1; // Update in-memory state

                        const rumorMsg = `🗣️ Travelers arriving at ${neighbor.name} whisper that the hostile host sieging ${n.name} is from ${attacker.name} (${attacker.type})!`;
                        this.repo.logNodeHistory(neighbor.id, rumorMsg, 'world');
                        this.repo.logNodeHistory(n.id, `A rumor spread from ${neighbor.name} revealing that the besieging army hails from ${attacker.name}.`, 'world');
                        logs.push(rumorMsg);
                    }
                }
            }

            // 2. Process Daily Siege Logs (Only if revealed and elapsedDays >= 1)
            if (n.siege_attacker_revealed === 1 && elapsedDays >= 1) {
                const updates = [
                    `The siege of ${n.name} by ${attacker.name} intensifies. Catapults are bombarding the outer walls.`,
                    `Defenders at ${n.name} successfully repelled a midnight skirmish from ${attacker.name}'s vanguard.`,
                    `Supplies are dwindling inside ${n.name} as ${attacker.name} tightens the blockade.`,
                    `A bold sally by the garrison of ${n.name} managed to burn several siege engines of ${attacker.name}!`,
                    `Despair grows in ${n.name} as the blockade by ${attacker.name} cuts off all incoming fresh water.`
                ];
                // Select a pseudorandom description based on day & node id to avoid duplicate messages in a row
                const index = (currentDay + n.id) % updates.length;
                const updateMsg = `⚔️ [Siege Update] ${updates[index]}`;
                
                this.repo.logNodeHistory(n.id, updateMsg, 'world');
                logs.push(updateMsg);
            }
        }
    }

    processDayEnd(currentDay) {
        // Fetch nodes including hostile camps to calculate safety distances and load specializations
        const allNodes = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name, specialization, faction_id, development_progress, expansion_reqs, population_tier, siege_attacker_id, siege_attacker_revealed, siege_start_day FROM world_nodes').all();
        
        const settlements = allNodes.filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));
        const enemies = allNodes.filter(n => HOSTILE_SETTLEMENT_TYPES.includes(n.type));

        const eventKeys = Object.keys(SETTLEMENT_EVENTS);
        const logs = [];

        // --- 1. PROCESS PASSIVE FEEDER SHIPMENTS ---
        this.repo.processPassiveFeederDeliveries(settlements, logs);

        // --- 2. SIMULATE CARAVAN TRADE FOR CONSTRUCTION PROJECTS ---
        const updatedSettlementsAfterFeeders = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name, specialization, faction_id, development_progress, expansion_reqs, population_tier FROM world_nodes').all()
            .filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));

        const activeConstructionNodes = updatedSettlementsAfterFeeders.filter(n => 
            n.current_event === 'building_boom' || n.current_event === 'settlement_expansion'
        );

        for (const target of activeConstructionNodes) {
            if (Math.random() < 0.35) {
                const potentialSources = updatedSettlementsAfterFeeders.filter(s => s.id !== target.id);
                if (potentialSources.length > 0) {
                    const source = potentialSources[Math.floor(Math.random() * potentialSources.length)];
                    const sourceSpecs = normalizeSpecializations(source.specialization) || [];
                    
                    let materialDelivered = null;
                    let materialName = "building supplies";

                    if (sourceSpecs.includes('Lumber Camp')) {
                        materialDelivered = 'quality_wood';
                        materialName = 'Quality Wood';
                    } else if (sourceSpecs.includes('Peat Pit')) {
                        materialDelivered = 'peat_bricks';
                        materialName = 'Peat Bricks';
                    } else if (sourceSpecs.includes('Copper Mine')) {
                        materialDelivered = 'copper_ingots';
                        materialName = 'Copper Ingots';
                    }

                    const result = this.repo.incrementNodeDevelopment(target.id, 1, materialDelivered);
                    
                    let logMsg = `📢 A merchant caravan from ${source.name} arrived at ${target.name}, delivering ${materialName}.`;
                    if (result && result.newProgress !== undefined) {
                        if (result.newProgress === 0) {
                            logMsg += ` This delivery completed the construction project!`;
                        } else {
                            logMsg += ` Progress: ${result.newProgress}/${result.maxProg}.`;
                        }
                    }
                    
                    this.repo.logNodeHistory(target.id, logMsg, 'world');
                    logs.push(logMsg);
                }
            }
        }

        // --- 3. CHECK AND TRIGGER SELF-FUNDED UPGRADES ---
        const updatedSettlementsForBuyout = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name, specialization, faction_id, development_progress, expansion_reqs, population_tier FROM world_nodes').all()
            .filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));
        this.repo.checkAndTriggerSelfFundedUpgrade(updatedSettlementsForBuyout, logs);

        // --- 4. REGULAR SETTLEMENT EVENT PROCESSING ---
        // Reload final settlements state to reflect completed projects (since completion clears current_event)
        const finalSettlements = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name, specialization, faction_id, development_progress, expansion_reqs, population_tier, siege_attacker_id, siege_attacker_revealed, siege_start_day FROM world_nodes').all()
            .filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));

        for (const n of finalSettlements) {
            if (n.current_event) {
                if (n.current_event === 'building_boom' || n.current_event === 'settlement_expansion') {
                    continue;
                }

                const newExp = n.event_expiration - 1;
                if (newExp <= 0) {
                    this.repo.db.prepare('UPDATE world_nodes SET current_event = NULL, event_expiration = 0, siege_attacker_id = NULL, siege_attacker_revealed = 0, siege_start_day = NULL WHERE id = ?').run(n.id);
                    this.repo.logNodeHistory(n.id, `The local situation has stabilized. Things return to normal.`, 'world');
                } else {
                    this.repo.db.prepare('UPDATE world_nodes SET event_expiration = ? WHERE id = ?').run(newExp, n.id);
                }
            } else {
                let minEnemyDist = Infinity;
                enemies.forEach(e => {
                    const dist = Math.hypot(n.x - e.x, n.y - e.y);
                    if (dist < minEnemyDist) minEnemyDist = dist;
                });

                if (Math.random() < SETTLEMENT_EVENT_CHANCE) {
                    const validEvents = eventKeys.filter(k => SETTLEMENT_EVENTS[k].isRandom !== false);
                    
                    let pool = validEvents;
                    if (minEnemyDist < DANGEROUS_DISTANCE_PX) {
                        pool = validEvents.filter(k => DANGEROUS_EVENT_KEYS.includes(k));
                    } else if (minEnemyDist > SAFE_DISTANCE_PX) {
                        pool = validEvents.filter(k => SAFE_EVENT_KEYS.includes(k));
                    }
                    
                    if (pool.length === 0) pool = validEvents;

                    const randomEvent = pool[Math.floor(Math.random() * pool.length)];
                    const duration = Math.floor(Math.random() * EVENT_DURATION_VARIANCE_DAYS) + EVENT_DURATION_MIN_DAYS;
                    
                    let attackerId = null;
                    if (randomEvent === 'sieged') {
                        const attacker = this._findNearestHostileCamp(n, enemies);
                        if (attacker) {
                            attackerId = attacker.id;
                        }
                    }

                    this.repo.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ?, siege_attacker_id = ?, siege_attacker_revealed = 0, siege_start_day = ? WHERE id = ?').run(randomEvent, duration, attackerId, currentDay, n.id);
                    
                    if (randomEvent === 'sieged') {
                        this.repo.logNodeHistory(n.id, `Rumors spread that ${n.name} has been placed under siege by an unknown hostile force!`, 'world');
                        logs.push(`📢 Alarm! An unknown enemy has laid siege to the settlement of ${n.name}!`);
                    } else {
                        this.repo.logNodeHistory(n.id, `Rumors spread of: ${SETTLEMENT_EVENTS[randomEvent].name}.`, 'world');
                    }
                }
            }
        }

        // --- 5. PROCESS ACTIVE SIEGES (RUMORS & DAILY LOGS) ---
        const currentSettlements = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name, specialization, faction_id, development_progress, expansion_reqs, population_tier, siege_attacker_id, siege_attacker_revealed, siege_start_day FROM world_nodes').all()
            .filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));
        this._processSiegeTicks(currentSettlements, currentDay, logs);

        return logs;
    }

    _findCapitalPosition(capitals, rng) {
        for (let i = 0; i < WORLD_GENERATION_CONFIG.CAPITAL_PLACEMENT_ATTEMPTS; i++) {
            const pos = {
                x: rng.randomInt(WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING, WORLD_GENERATION_CONFIG.MAP_WIDTH - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING),
                y: rng.randomInt(WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING, WORLD_GENERATION_CONFIG.MAP_HEIGHT - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING)
            };
            const ok = capitals.every(c => this.distance(pos, c) >= WORLD_GENERATION_CONFIG.CAPITAL_MIN_DISTANCE);
            if (ok) return pos;
        }
        return {
            x: rng.randomInt(WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING, WORLD_GENERATION_CONFIG.MAP_WIDTH - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING),
            y: rng.randomInt(WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING, WORLD_GENERATION_CONFIG.MAP_HEIGHT - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING)
        };
    }

    _findClosestCapital(pos, capitals) {
        let closest = null;
        let minDist = Infinity;
        capitals.forEach(c => {
            const d = this.distance(pos, c);
            if (d < minDist) { minDist = d; closest = c; }
        });
        return closest;
    }
}
