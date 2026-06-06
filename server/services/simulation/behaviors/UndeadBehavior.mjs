import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { UNDEAD_FACTION_CONFIG, UNDEAD_NAMES, UNDEAD_NODE_TYPES } from "../../../data/factions/UndeadFactions.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

const HOSTILE_NODE_FLAGS = Object.freeze({
    VISIBLE: 0,
    HOSTILE: 1
});

const FULL_CIRCLE_RADIANS = Math.PI * 2;

const FACTION_ECONOMY_MODS = Object.freeze({
    CAMP_BUY_MODIFIER: 1.05,
    CAMP_SELL_MODIFIER: 0.25,
    STRONGHOLD_BUY_MODIFIER: 1.30,
    STRONGHOLD_SELL_MODIFIER: 0.15
});

export class UndeadBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        return [this._getOrCreateFaction()];
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        if (context.isPremade) return createdNodes;

        const undeadFaction = context.factions.find(faction => faction.type === 'undead');
        if (!undeadFaction) return createdNodes;

        const existingNodes = context.nodes;
        const campCount = rng.randomInt(
            UNDEAD_FACTION_CONFIG.INITIAL_CAMP_MIN,
            UNDEAD_FACTION_CONFIG.INITIAL_CAMP_MAX
        );

        for (let index = 0; index < campCount; index++) {
            const position = this._findIsolatedPosition(rng, existingNodes);
            const name = this._pickCampName(rng, index);
            const type = index === 0 ? UNDEAD_NODE_TYPES.NECROPOLIS : (index % 2 === 0 ? UNDEAD_NODE_TYPES.CRYPT : UNDEAD_NODE_TYPES.TOMB);

            const node = this._createUndeadNode({
                type,
                name,
                position,
                factionId: undeadFaction.id
            });

            createdNodes.push(node);
            existingNodes.push(node);
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        const logs = [];
        const undeadFaction = this._getOrCreateFaction();

        const allNodes = this.repo.db
            .prepare('SELECT id, type, name, x, y, faction_id, current_event, event_expiration, population_tier FROM world_nodes')
            .all();

        const undeadNodes = allNodes.filter(node =>
            node.faction_id === undeadFaction.id && Object.values(UNDEAD_NODE_TYPES).includes(node.type)
        );

        const settlements = allNodes.filter(node => 
            node.faction_id !== undeadFaction.id && 
            !Object.values(UNDEAD_NODE_TYPES).includes(node.type) &&
            !['Ruins', 'Refugee Camp', 'Bandit Camp', 'Bandit Outpost', 'Bandit Stronghold', 'Stolen Stronghold', 'Barbarian Camp', 'Barbarian Outpost', 'Barbarian Warcamp', 'Goblin Camp', 'Goblin Outpost', 'Greenskin Stronghold'].includes(node.type)
        );

        // 1. Spawn new unholy locations
        this._spawnNewUndeadNode(currentDay, undeadFaction.id, allNodes, undeadNodes, logs);

        // 2. Simulate Attacks (Mindless Invasions vs Necromancer Sieges)
        for (const uNode of undeadNodes) {
            const hasNecromancer = uNode.type === UNDEAD_NODE_TYPES.NECROPOLIS || (uNode.id % 3 === 0);

            if (hasNecromancer) {
                if (Math.random() < UNDEAD_FACTION_CONFIG.SIEGE_CHANCE) {
                    const target = this._findNearestActiveSettlement(uNode, settlements);
                    if (target && !target.current_event) {
                        this.repo.db.prepare(`
                            UPDATE world_nodes 
                            SET current_event = "undead_siege", event_expiration = 6, siege_attacker_id = ?, siege_attacker_revealed = 0, siege_start_day = ? 
                            WHERE id = ?
                        `).run(uNode.id, currentDay, target.id);
                        this.repo.logNodeHistory(target.id, `An ominous shadow falls over ${target.name} as it is placed under siege by an unknown host!`, 'world');
                        logs.push(`💀 Ominous shadow falls! An unknown host has begun a siege of desecration on ${target.name}.`);
                    }
                }
            } else {
                if (Math.random() < UNDEAD_FACTION_CONFIG.INVASION_CHANCE) {
                    const target = this._findNearestActiveSettlement(uNode, settlements);
                    if (target && !target.current_event) {
                        this.repo.db.prepare('UPDATE world_nodes SET current_event = "undead_invasion", event_expiration = 3 WHERE id = ?').run(target.id);
                        this.repo.logNodeHistory(target.id, `An unholy tide of zombies and skeletons has suddenly surged out of ${uNode.name} and directly invaded ${target.name}!`, 'world');
                        logs.push(`⚠️ Alarm! An unholy tide of zombies and skeletons has suddenly struck ${target.name}! Defend it before it is overrun.`);
                    }
                }
            }
        }

        // 3. Resolve Overrun Settlements (Failed or Ignored Defense)
        for (const settlement of settlements) {
            if (settlement.current_event === 'undead_invasion' || settlement.current_event === 'undead_siege') {
                const currentExpiration = settlement.event_expiration || 0;
                
                if (currentExpiration <= 1) {
                    this._overrunSettlement(settlement, undeadFaction.id, logs);
                } else {
                    this.repo.db.prepare('UPDATE world_nodes SET event_expiration = event_expiration - 1 WHERE id = ?').run(settlement.id);
                }
            }
        }

        // 4. Refugee Camp Vulnerability Sweep
        const refugeeCamps = allNodes.filter(node => node.type === 'Refugee Camp');
        for (const camp of refugeeCamps) {
            if (camp.current_event === 'refugee_under_attack') {
                const currentExpiration = camp.event_expiration || 0;
                if (currentExpiration <= 1) {
                    this.repo.db.prepare('DELETE FROM world_nodes WHERE id = ?').run(camp.id);
                    this.repo.db.prepare('DELETE FROM contracts WHERE node_id = ? AND is_completed = 0').run(camp.id);
                    logs.push(`💀 Catastrophe! The vulnerable Refugee Camp "${camp.name}" was overrun by raiding monsters. The camp is burned to the ground and there are no survivors.`);
                } else {
                    this.repo.db.prepare('UPDATE world_nodes SET event_expiration = event_expiration - 1 WHERE id = ?').run(camp.id);
                }
            } else {
                if (Math.random() < UNDEAD_FACTION_CONFIG.CAMP_ATTACK_CHANCE) {
                    const monsters = ["Goblins", "Orcs", "Brigands", "Restless Skeletons"];
                    const aggressor = monsters[Math.floor(Math.random() * monsters.length)];

                    this.repo.db.prepare('UPDATE world_nodes SET current_event = "refugee_under_attack", event_expiration = 2 WHERE id = ?').run(camp.id);
                    this.repo.logNodeHistory(camp.id, `The camp is being raided by a pack of ${aggressor}! Help is urgently needed.`, 'world');
                    logs.push(`⚠️ Urgent! The Refugee Camp "${camp.name}" is under brutal attack by raiding ${aggressor}! They cannot hold out for more than 2 days without help.`);
                }
            }
        }

        return logs;
    }

    _spawnNewUndeadNode(currentDay, factionId, allNodes, undeadNodes, logs) {
        const hasNoNodes = undeadNodes.length === 0;
        const isSpawnDay = hasNoNodes || currentDay % UNDEAD_FACTION_CONFIG.SPAWN_INTERVAL_DAYS === 0;
        const canAddNode = undeadNodes.length < UNDEAD_FACTION_CONFIG.MAX_CAMPS;

        if (!isSpawnDay || !canAddNode || Math.random() >= UNDEAD_FACTION_CONFIG.CAMP_SPAWN_CHANCE) {
            return;
        }

        const position = this._findIsolatedPositionRandom(allNodes);
        const name = this._pickRandomName();
        
        const types = [
            UNDEAD_NODE_TYPES.CRYPT, UNDEAD_NODE_TYPES.CRYPT, UNDEAD_NODE_TYPES.CRYPT,
            UNDEAD_NODE_TYPES.TOMB, UNDEAD_NODE_TYPES.TOMB,
            UNDEAD_NODE_TYPES.CAVE, UNDEAD_NODE_TYPES.DUNGEON,
            UNDEAD_NODE_TYPES.NECROPOLIS
        ];
        const type = types[Math.floor(Math.random() * types.length)];

        const node = this._createUndeadNode({
            type,
            name,
            position,
            factionId
        });

        allNodes.push(node);
        undeadNodes.push(node);
        this.repo.logNodeHistory(node.id, `A cold vapor rises. An ancient unholy place has emerged: ${name}.`, 'world');
        logs.push(`💀 Ominous news: Scouts discovered a dark, desecrated place known as "${name}" (${type}) in the wild lands.`);
    }

    _overrunSettlement(settlement, undeadFactionId, logs) {
        const companyName = this.repo.statements.getSetting.get('company_name')?.value || "The Company";
        
        let newPopTier = (settlement.population_tier || 1) - 1;
        let newType = settlement.type;
        let desolated = false;

        if (newPopTier <= 0) {
            desolated = true;
            newType = 'Desecrated Crypt';
        } else {
            if (settlement.type === 'City-State' || settlement.type === 'Province' || settlement.type === 'Stronghold') {
                newType = 'Town';
            } else if (settlement.type === 'Town') {
                newType = 'Village';
            } else if (settlement.type === 'Village') {
                newType = 'Hamlet';
            }
        }

        if (desolated) {
            this.repo.db.prepare(`
                UPDATE world_nodes 
                SET type = ?, 
                    name = ?, 
                    faction_id = ?, 
                    is_hostile = 1, 
                    current_event = NULL, 
                    event_expiration = 0, 
                    reputation = -100,
                    population_tier = 1,
                    specialization = NULL
                WHERE id = ?
            `).run(UNDEAD_NODE_TYPES.CRYPT, `Desecrated Ruins of ${settlement.name}`, undeadFactionId, settlement.id);
            
            this.repo.db.prepare('DELETE FROM contracts WHERE node_id = ? AND is_completed = 0').run(settlement.id);

            const msg = `💀 Tragedy! ${settlement.name} was completely overrun by the undead. Its streets are desolate and the dead now rise from its fresh graves as a Desecrated Crypt!`;
            this.repo.logNodeHistory(settlement.id, msg, 'world');
            logs.push(msg);

            // Trigger Refugee evaluation logic [2]
            this._handleRefugees(settlement, logs);
        } else {
            this.repo.db.prepare(`
                UPDATE world_nodes 
                SET type = ?, 
                    current_event = NULL, 
                    event_expiration = 0, 
                    reputation = MAX(-100, reputation - 40),
                    population_tier = ?
                WHERE id = ?
            `).run(newType, newPopTier, settlement.id);

            const msg = `💥 Ransacked! ${settlement.name} was raided and looted by shambling hordes. The survivors flee, and its population has collapsed to ${newPopTier}.`;
            this.repo.logNodeHistory(settlement.id, msg, 'world');
            logs.push(msg);
        }
    }

    _handleRefugees(settlement, logs) {
        const SURVIVOR_CHANCE = 0.70;
        if (Math.random() > SURVIVOR_CHANCE) {
            const noSurvivorsMsg = `🥀 No one survived the slaughter at ${settlement.name}. All were converted into thralls of the legion.`;
            logs.push(noSurvivorsMsg);
            return;
        }

        // Fetch other friendly settlements [2]
        const activeSettlements = this.repo.db.prepare(`
            SELECT id, name, type, population_tier, x, y 
            FROM world_nodes 
            WHERE is_hostile = 0 AND type NOT IN ('Ruins', 'Refugee Camp')
        `).all();

        let acceptedBy = null;
        const ACCEPT_CHANCE = 0.40; // 40% probability per town [2]

        for (const target of activeSettlements) {
            if (Math.random() < ACCEPT_CHANCE) {
                acceptedBy = target;
                break;
            }
        }

        if (acceptedBy) {
            const newPopTier = Math.min(5, (acceptedBy.population_tier || 1) + 1);
            this.repo.db.prepare(`
                UPDATE world_nodes 
                SET population_tier = ? 
                WHERE id = ?
            `).run(newPopTier, acceptedBy.id);

            const successMsg = `🗣️ Refugees! Survivors of ${settlement.name} fled to ${acceptedBy.name}. The town has accepted them, straining local supplies but increasing the population to ${newPopTier}.`;
            this.repo.logNodeHistory(acceptedBy.id, successMsg, 'world');
            logs.push(successMsg);
        } else {
            // Refused by all! Spawn temporary camp close by [2]
            const allNodes = this.repo.db.prepare('SELECT id, x, y FROM world_nodes').all();
            const spawnPos = this._findSafeSpawnNear(settlement, allNodes, 90, 240, 70);

            if (spawnPos) {
                const campName = `Refugees of ${settlement.name}`;
                const info = this.repo.createWorldNode({
                    type: 'Refugee Camp',
                    name: campName,
                    x: spawnPos.x,
                    y: spawnPos.y,
                    faction_id: null,
                    reputation: 0,
                    buy_modifier: 1.50, // Scarcity means expensive supplies
                    sell_modifier: 0.30, // They have nothing to give in exchange
                    specialization: null,
                    attachments: 0
                });

                this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 0, population_tier = 1 WHERE id = ?').run(info.lastInsertRowid);

                const failMsg = `⛺ Rejected! Refused sanctuary by other settlements, the desperate survivors of ${settlement.name} have set up a temporary Refugee Camp near their former home. It is highly vulnerable.`;
                this.repo.logNodeHistory(info.lastInsertRowid, failMsg, 'world');
                logs.push(failMsg);
            } else {
                const lostMsg = `🥀 The survivors of ${settlement.name} were chased into the wilderness and lost.`;
                logs.push(lostMsg);
            }
        }
    }

    _createUndeadNode({ type, name, position, factionId }) {
        const info = this.repo.createWorldNode({
            type,
            name,
            x: position.x,
            y: position.y,
            faction_id: factionId,
            reputation: -100,
            buy_modifier: type === UNDEAD_NODE_TYPES.NECROPOLIS ? FACTION_ECONOMY_MODS.STRONGHOLD_BUY_MODIFIER : FACTION_ECONOMY_MODS.CAMP_BUY_MODIFIER,
            sell_modifier: type === UNDEAD_NODE_TYPES.NECROPOLIS ? FACTION_ECONOMY_MODS.STRONGHOLD_SELL_MODIFIER : FACTION_ECONOMY_MODS.CAMP_SELL_MODIFIER,
            specialization: null,
            attachments: 0
        });

        const id = Number(info.lastInsertRowid);
        this.repo.db
            .prepare('UPDATE world_nodes SET is_hidden = ?, is_hostile = ? WHERE id = ?')
            .run(HOSTILE_NODE_FLAGS.VISIBLE, HOSTILE_NODE_FLAGS.HOSTILE, id);

        return {
            id,
            type,
            name,
            x: position.x,
            y: position.y,
            faction_id: factionId,
            reputation: -100,
            is_hidden: HOSTILE_NODE_FLAGS.VISIBLE,
            is_hostile: HOSTILE_NODE_FLAGS.HOSTILE
        };
    }

    _findNearestActiveSettlement(originNode, settlements) {
        if (!originNode || settlements.length === 0) return null;
        return [...settlements].sort((a, b) => this.distance(originNode, a) - this.distance(originNode, b))[0];
    }

    _findSafeSpawnNear(parentNode, allNodes, minDistance, maxDistance, minCollisionDistance) {
        for (let attempt = 0; attempt < UNDEAD_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const angle = Math.random() * FULL_CIRCLE_RADIANS;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const position = {
                x: Math.round(parentNode.x + Math.cos(angle) * distance),
                y: Math.round(parentNode.y + Math.sin(angle) * distance)
            };

            if (!this._isWithinMapBounds(position)) continue;
            if (this._collidesWithAnyNode(position, allNodes, minCollisionDistance)) continue;

            return position;
        }

        return null;
    }

    _findIsolatedPosition(rng, existingNodes) {
        for (let attempt = 0; attempt < UNDEAD_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: rng.randomInt(
                    UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: rng.randomInt(
                    UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, UNDEAD_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: rng.randomInt(
                UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: rng.randomInt(
                UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _findIsolatedPositionRandom(existingNodes) {
        for (let attempt = 0; attempt < UNDEAD_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: this._randomInt(
                    UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: this._randomInt(
                    UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, UNDEAD_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: this._randomInt(
                UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: this._randomInt(
                UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _isWithinMapBounds(position) {
        return position.x >= UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.x <= WORLD_GENERATION_CONFIG.MAP_WIDTH - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y >= UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y <= WORLD_GENERATION_CONFIG.MAP_HEIGHT - UNDEAD_FACTION_CONFIG.MAP_EDGE_PADDING_PX;
    }

    _collidesWithAnyNode(position, nodes, minDistance) {
        return nodes.some(node => this.distance(position, node) < minDistance);
    }

    _pickCampName(rng, index) {
        return rng.pick(UNDEAD_NAMES) || `Ancient Tomb ${index + 1}`;
    }

    _pickRandomName() {
        return UNDEAD_NAMES[this._randomInt(0, UNDEAD_NAMES.length - 1)];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _getOrCreateFaction() {
        const realExisting = this.repo.db
            .prepare("SELECT id FROM factions WHERE type = 'undead' LIMIT 1")
            .get();

        if (realExisting) {
            return { name: "Undead Legions", color: "#8b5cf6", archetype: "undead", type: "undead", id: Number(realExisting.id) };
        }

        const result = this.repo.createFaction({
            name: "Undead Legions",
            color: "#8b5cf6", // Purple
            archetype: "undead",
            motto: "The grave cannot hold us.",
            type: "undead"
        });
        return { name: "Undead Legions", color: "#8b5cf6", archetype: "undead", type: "undead", id: Number(result.lastInsertRowid) };
    }
}