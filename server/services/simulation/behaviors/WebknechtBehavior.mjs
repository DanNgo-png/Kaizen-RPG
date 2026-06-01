import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

const WEBKNECHT_FACTION = Object.freeze({
    name: "Webknecht Dynasty",
    color: "#06b6d4", // Cyan
    archetype: "webknechts",
    motto: "The silk binds us all.",
    type: "webknecht"
});

const WEBKNECHT_NODE_TYPES = Object.freeze({
    NEST: 'Webknecht Nest',
    COLONY: 'Webknecht Colony',
    CITADEL: 'Webknecht Citadel'
});

const SIMULATION_CONFIG = Object.freeze({
    INITIAL_NESTS_MIN: 1,
    INITIAL_NESTS_MAX: 2,
    MAX_NESTS: 4,
    MAX_COLONIES: 6,
    MAX_CITADELS: 2,
    SPAWN_INTERVAL_DAYS: 16,
    SPAWN_CHANCE: 0.35,
    COLONY_SPREAD_CHANCE: 0.12,
    CITADEL_FORTIFY_CHANCE: 0.05,
    INFESTATION_CHANCE: 0.15,
    COLLISION_DISTANCE_PX: 80,
    SPAWN_MIN_DISTANCE_PX: 100,
    SPAWN_MAX_DISTANCE_PX: 240,
    MAP_EDGE_PADDING_PX: 120,
    ISOLATED_DISTANCE_PX: 340,
    PLACEMENT_ATTEMPTS: 50
});

const HOSTILE_NODE_FLAGS = Object.freeze({
    VISIBLE: 0,
    HOSTILE: 1
});

const FULL_CIRCLE_RADIANS = Math.PI * 2;

export class WebknechtBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        return [this._getOrCreateFaction()];
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        if (context.isPremade) return createdNodes;

        const faction = context.factions.find(f => f.type === WEBKNECHT_FACTION.type);
        if (!faction) return createdNodes;

        const existingNodes = context.nodes;
        const nestCount = rng.randomInt(SIMULATION_CONFIG.INITIAL_NESTS_MIN, SIMULATION_CONFIG.INITIAL_NESTS_MAX);

        for (let i = 0; i < nestCount; i++) {
            const position = this._findIsolatedPosition(rng, existingNodes);
            const name = `Weaver Nest ${i + 1}`;
            const node = this._createWebknechtNode({
                type: WEBKNECHT_NODE_TYPES.NEST,
                name,
                position,
                factionId: faction.id
            });

            createdNodes.push(node);
            existingNodes.push(node);
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        const logs = [];
        const faction = this._getOrCreateFaction();

        const allNodes = this.repo.db
            .prepare('SELECT id, type, name, x, y, faction_id, current_event, event_expiration, population_tier FROM world_nodes')
            .all();

        const nests = allNodes.filter(n => n.faction_id === faction.id && n.type === WEBKNECHT_NODE_TYPES.NEST);
        const colonies = allNodes.filter(n => n.faction_id === faction.id && n.type === WEBKNECHT_NODE_TYPES.COLONY);
        const citadels = allNodes.filter(n => n.faction_id === faction.id && n.type === WEBKNECHT_NODE_TYPES.CITADEL);

        const humanSettlements = allNodes.filter(node => 
            node.faction_id !== faction.id && 
            !Object.values(WEBKNECHT_NODE_TYPES).includes(node.type) &&
            !['Ruins', 'Refugee Camp', 'Bandit Camp', 'Bandit Outpost', 'Bandit Stronghold', 'Stolen Stronghold', 'Barbarian Camp', 'Barbarian Outpost', 'Barbarian Warcamp', 'Goblin Camp', 'Goblin Outpost', 'Greenskin Stronghold', 'Desecrated Crypt', 'Ancient Tomb', 'Haunted Cave', 'Sunken Dungeon', 'Necropolis'].includes(node.type)
        );

        // 1. Natural Nest Spawning
        this._spawnNewNest(currentDay, faction.id, allNodes, nests, logs);

        // 2. Colony Spreading
        this._spreadColonies(faction.id, allNodes, nests, colonies, logs);

        // 3. Citadel Fortifications
        this._fortifyColonies(faction.id, allNodes, colonies, citadels, logs);

        // 4. Trigger Web Infestations on neighboring human towns
        for (const colony of [...colonies, ...citadels]) {
            if (Math.random() < SIMULATION_CONFIG.INFESTATION_CHANCE) {
                const target = this._findNearestActiveSettlement(colony, humanSettlements);
                if (target && !target.current_event) {
                    this.repo.db.prepare('UPDATE world_nodes SET current_event = "web_infestation", event_expiration = 4 WHERE id = ?').run(target.id);
                    this.repo.logNodeHistory(target.id, `Silk-weavers from ${colony.name} have overrun the trade routes. A Web Infestation has paralyzed the town.`, 'world');
                    logs.push(`🕷️ Warning! Smarter Webknechts from ${colony.name} have infested ${target.name}! Silk webs are choking local roads.`);
                }
            }
        }

        // 5. Resolve Ignored Infestations (Overrun)
        for (const town of humanSettlements) {
            if (town.current_event === 'web_infestation') {
                const currentExpiration = town.event_expiration || 0;
                if (currentExpiration <= 1) {
                    this._overrunSettlement(town, faction.id, logs);
                } else {
                    this.repo.db.prepare('UPDATE world_nodes SET event_expiration = event_expiration - 1 WHERE id = ?').run(town.id);
                }
            }
        }

        return logs;
    }

    _spawnNewNest(currentDay, factionId, allNodes, nests, logs) {
        const hasNoNests = nests.length === 0;
        const isSpawnDay = hasNoNests || currentDay % SIMULATION_CONFIG.SPAWN_INTERVAL_DAYS === 0;
        const canAdd = nests.length < SIMULATION_CONFIG.MAX_NESTS;

        if (!isSpawnDay || !canAdd || Math.random() >= SIMULATION_CONFIG.SPAWN_CHANCE) return;

        const position = this._findIsolatedPositionRandom(allNodes);
        const name = `Weaver Nest ${nests.length + 1}`;
        const node = this._createWebknechtNode({
            type: WEBKNECHT_NODE_TYPES.NEST,
            name,
            position,
            factionId
        });

        allNodes.push(node);
        nests.push(node);
        this.repo.logNodeHistory(node.id, "A deep Webknecht Nest was excavated in the wilderness.", 'world');
        logs.push(`🕷️ Unsettling rumors: A new Webknecht Nest (${name}) has been detected in the deep wildlands.`);
    }

    _spreadColonies(factionId, allNodes, nests, colonies, logs) {
        for (const nest of nests) {
            if (colonies.length >= SIMULATION_CONFIG.MAX_COLONIES) return;
            if (Math.random() >= SIMULATION_CONFIG.COLONY_SPREAD_CHANCE) continue;

            const position = this._findSafeSpawnNear(nest, allNodes, SIMULATION_CONFIG.SPAWN_MIN_DISTANCE_PX, SIMULATION_CONFIG.SPAWN_MAX_DISTANCE_PX, SIMULATION_CONFIG.COLLISION_DISTANCE_PX);
            if (!position) continue;

            const name = `${nest.name.replace(' Nest', '')} Colony`;
            const node = this._createWebknechtNode({
                type: WEBKNECHT_NODE_TYPES.COLONY,
                name,
                position,
                factionId
            });

            allNodes.push(node);
            colonies.push(node);
            this.repo.logNodeHistory(node.id, `Constructed as an expanding colony from ${nest.name}.`, 'world');
            logs.push(`Webknechts have established an expanding Colony near ${nest.name}.`);
        }
    }

    _fortifyColonies(factionId, allNodes, colonies, citadels, logs) {
        for (const colony of colonies) {
            if (citadels.length >= SIMULATION_CONFIG.MAX_CITADELS) return;
            if (Math.random() >= SIMULATION_CONFIG.CITADEL_FORTIFY_CHANCE) continue;

            const position = this._findSafeSpawnNear(colony, allNodes, SIMULATION_CONFIG.SPAWN_MIN_DISTANCE_PX + 50, SIMULATION_CONFIG.SPAWN_MAX_DISTANCE_PX + 50, SIMULATION_CONFIG.COLLISION_DISTANCE_PX);
            if (!position) continue;

            const name = `${colony.name.replace(' Colony', '')} Citadel`;
            const node = this._createWebknechtNode({
                type: WEBKNECHT_NODE_TYPES.CITADEL,
                name,
                position,
                factionId
            });

            allNodes.push(node);
            citadels.push(node);
            this.repo.logNodeHistory(node.id, `Fortified into a massive subterranean Citadel.`, 'world');
            logs.push(`A Webknecht colony has fortified into a massive subterranean Citadel near ${colony.name}.`);
        }
    }

    _overrunSettlement(town, factionId, logs) {
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
        `).run(WEBKNECHT_NODE_TYPES.NEST, `Overrun Ruins of ${town.name}`, factionId, town.id);
        
        this.repo.db.prepare('DELETE FROM contracts WHERE node_id = ? AND is_completed = 0').run(town.id);

        const msg = `💀 Overrun! ${town.name} has been completely choked and conquered by Webknechts. The survivors were cocooned, and it is now an active Weavers Nest!`;
        this.repo.logNodeHistory(town.id, msg, 'world');
        logs.push(msg);
    }

    _createWebknechtNode({ type, name, position, factionId }) {
        const info = this.repo.createWorldNode({
            type,
            name,
            x: position.x,
            y: position.y,
            faction_id: factionId,
            reputation: -100,
            buy_modifier: type === WEBKNECHT_NODE_TYPES.CITADEL ? 1.30 : 1.05,
            sell_modifier: type === WEBKNECHT_NODE_TYPES.CITADEL ? 0.15 : 0.25,
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

    _findSafeSpawnNear(parentNode, allNodes, minDistance, maxDistance, minCollisionDistance) {
        for (let attempt = 0; attempt < SIMULATION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
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
        for (let attempt = 0; attempt < SIMULATION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: rng.randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_WIDTH - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX),
                y: rng.randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_HEIGHT - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX)
            };

            if (!this._collidesWithAnyNode(position, existingNodes, SIMULATION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }
        return {
            x: rng.randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_WIDTH - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX),
            y: rng.randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_HEIGHT - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX)
        };
    }

    _findIsolatedPositionRandom(existingNodes) {
        for (let attempt = 0; attempt < SIMULATION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: this._randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_WIDTH - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX),
                y: this._randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_HEIGHT - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX)
            };

            if (!this._collidesWithAnyNode(position, existingNodes, SIMULATION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }
        return {
            x: this._randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_WIDTH - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX),
            y: this._randomInt(SIMULATION_CONFIG.MAP_EDGE_PADDING_PX, WORLD_GENERATION_CONFIG.MAP_HEIGHT - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX)
        };
    }

    _isWithinMapBounds(position) {
        return position.x >= SIMULATION_CONFIG.MAP_EDGE_PADDING_PX
            && position.x <= WORLD_GENERATION_CONFIG.MAP_WIDTH - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y >= SIMULATION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y <= WORLD_GENERATION_CONFIG.MAP_HEIGHT - SIMULATION_CONFIG.MAP_EDGE_PADDING_PX;
    }

    _collidesWithAnyNode(position, nodes, minDistance) {
        return nodes.some(node => this.distance(position, node) < minDistance);
    }

    _findNearestActiveSettlement(originNode, settlements) {
        if (!originNode || settlements.length === 0) return null;
        return [...settlements].sort((a, b) => this.distance(originNode, a) - this.distance(originNode, b))[0];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _getOrCreateFaction() {
        const existing = this.repo.db.prepare("SELECT id FROM factions WHERE type = 'webknecht' LIMIT 1").get();
        if (existing) {
            return { ...WEBKNECHT_FACTION, id: Number(existing.id) };
        }

        const result = this.repo.createFaction(WEBKNECHT_FACTION);
        return { ...WEBKNECHT_FACTION, id: Number(result.lastInsertRowid) };
    }
}