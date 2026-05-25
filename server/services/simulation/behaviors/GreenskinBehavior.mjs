import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

const GREENSKIN_FACTION = Object.freeze({
    name: "Greenskins",
    color: "#15803d", // Green
    archetype: "greenskins",
    motto: "Waaagh!",
    type: "greenskins"
});

export const GREENSKIN_NODE_TYPES = Object.freeze({
    CAMP: 'Goblin Camp',
    OUTPOST: 'Goblin Outpost',
    STRONGHOLD: 'Greenskin Stronghold'
});

const GREENSKIN_ECONOMY = Object.freeze({
    REPUTATION: -100,
    CAMP_BUY_MODIFIER: 1.05,
    CAMP_SELL_MODIFIER: 0.25,
    OUTPOST_BUY_MODIFIER: 1.15,
    OUTPOST_SELL_MODIFIER: 0.20,
    STRONGHOLD_BUY_MODIFIER: 1.30,
    STRONGHOLD_SELL_MODIFIER: 0.15
});

const HOSTILE_NODE_FLAGS = Object.freeze({
    VISIBLE: 0,
    HOSTILE: 1
});

const FULL_CIRCLE_RADIANS = Math.PI * 2;

const GREENSKIN_NAMES = Object.freeze([
    "Crooked Ear Tribe",
    "Broken Tooth Clan",
    "Red Eye Outpost",
    "Vile Swamp Camp",
    "Slasher Ridge",
    "Blood-Goblin Warrens"
]);

const GREENSKIN_FACTION_CONFIG = Object.freeze({
    INITIAL_CAMP_MIN: 1,
    INITIAL_CAMP_MAX: 3,
    MAX_CAMPS: 4,
    MAX_OUTPOSTS: 6,
    MAX_STRONGHOLDS: 2,
    CAMP_SPAWN_INTERVAL_DAYS: 14,
    CAMP_SPAWN_CHANCE: 0.30,
    OUTPOST_SPREAD_CHANCE: 0.10,
    STRONGHOLD_SPREAD_CHANCE: 0.05,
    MAP_EDGE_PADDING_PX: 120,
    ISOLATED_DISTANCE_PX: 320,
    COLLISION_DISTANCE_PX: 80,
    SPAWN_MIN_DISTANCE_PX: 100,
    SPAWN_MAX_DISTANCE_PX: 260,
    STRONGHOLD_MIN_DISTANCE_PX: 150,
    STRONGHOLD_MAX_DISTANCE_PX: 300,
    PLACEMENT_ATTEMPTS: 50
});

export class GreenskinBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        return [this._getOrCreateFaction()];
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        if (context.isPremade) return createdNodes;

        const greenskinFaction = context.factions.find(faction => faction.type === GREENSKIN_FACTION.type);
        if (!greenskinFaction) return createdNodes;

        const existingNodes = context.nodes;
        const campCount = rng.randomInt(
            GREENSKIN_FACTION_CONFIG.INITIAL_CAMP_MIN,
            GREENSKIN_FACTION_CONFIG.INITIAL_CAMP_MAX
        );

        for (let index = 0; index < campCount; index++) {
            const position = this._findIsolatedPosition(rng, existingNodes);
            const name = this._pickCampName(rng, index);
            const node = this._createGreenskinNode({
                type: GREENSKIN_NODE_TYPES.CAMP,
                name,
                position,
                factionId: greenskinFaction.id,
                buyModifier: GREENSKIN_ECONOMY.CAMP_BUY_MODIFIER,
                sellModifier: GREENSKIN_ECONOMY.CAMP_SELL_MODIFIER
            });

            createdNodes.push(node);
            existingNodes.push(node);
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        const logs = [];
        const greenskinFaction = this._getOrCreateFaction();

        const allNodes = this.repo.db
            .prepare('SELECT id, type, name, x, y, faction_id FROM world_nodes')
            .all();

        const greenskinCamps = allNodes.filter(node =>
            node.faction_id === greenskinFaction.id && node.type === GREENSKIN_NODE_TYPES.CAMP
        );
        const greenskinOutposts = allNodes.filter(node =>
            node.faction_id === greenskinFaction.id && node.type === GREENSKIN_NODE_TYPES.OUTPOST
        );
        const greenskinStrongholds = allNodes.filter(node =>
            node.faction_id === greenskinFaction.id && node.type === GREENSKIN_NODE_TYPES.STRONGHOLD
        );

        this._spawnNewCamp(currentDay, greenskinFaction.id, allNodes, greenskinCamps, logs);
        this._spreadCamps(greenskinFaction.id, allNodes, greenskinCamps, greenskinOutposts, logs);
        this._fortifyOutposts(greenskinFaction.id, allNodes, greenskinOutposts, greenskinStrongholds, logs);

        return logs;
    }

    _spawnNewCamp(currentDay, factionId, allNodes, greenskinCamps, logs) {
        const hasNoCamps = greenskinCamps.length === 0;
        const isSpawnDay = hasNoCamps || currentDay % GREENSKIN_FACTION_CONFIG.CAMP_SPAWN_INTERVAL_DAYS === 0;
        const canAddCamp = greenskinCamps.length < GREENSKIN_FACTION_CONFIG.MAX_CAMPS;

        if (!isSpawnDay || !canAddCamp || Math.random() >= GREENSKIN_FACTION_CONFIG.CAMP_SPAWN_CHANCE) {
            return;
        }

        const position = this._findIsolatedPositionRandom(allNodes);
        const name = this._pickRandomName();
        const node = this._createGreenskinNode({
            type: GREENSKIN_NODE_TYPES.CAMP,
            name,
            position,
            factionId,
            buyModifier: GREENSKIN_ECONOMY.CAMP_BUY_MODIFIER,
            sellModifier: GREENSKIN_ECONOMY.CAMP_SELL_MODIFIER
        });

        allNodes.push(node);
        greenskinCamps.push(node);
        this.repo.logNodeHistory(node.id, "A new greenskin camp was detected in the deep wildlands.", 'world');
        logs.push(`Patrols spotted a new Goblin Camp (${name}) rising in the far reaches.`);
    }

    _spreadCamps(factionId, allNodes, greenskinCamps, greenskinOutposts, logs) {
        for (const camp of greenskinCamps) {
            if (greenskinOutposts.length >= GREENSKIN_FACTION_CONFIG.MAX_OUTPOSTS) return;
            if (Math.random() >= GREENSKIN_FACTION_CONFIG.OUTPOST_SPREAD_CHANCE) continue;

            const position = this._findSafeSpawnNear(
                camp,
                allNodes,
                GREENSKIN_FACTION_CONFIG.SPAWN_MIN_DISTANCE_PX,
                GREENSKIN_FACTION_CONFIG.SPAWN_MAX_DISTANCE_PX,
                GREENSKIN_FACTION_CONFIG.COLLISION_DISTANCE_PX
            );
            if (!position) continue;

            const name = `${camp.name} Outpost`;
            const node = this._createGreenskinNode({
                type: GREENSKIN_NODE_TYPES.OUTPOST,
                name,
                position,
                factionId,
                buyModifier: GREENSKIN_ECONOMY.OUTPOST_BUY_MODIFIER,
                sellModifier: GREENSKIN_ECONOMY.OUTPOST_SELL_MODIFIER
            });

            allNodes.push(node);
            greenskinOutposts.push(node);
            this.repo.logNodeHistory(node.id, `Spawned as a hunting outpost of ${camp.name}.`, 'world');
            logs.push(`Goblin marauders set up a new outpost near ${camp.name}.`);
        }
    }

    _fortifyOutposts(factionId, allNodes, greenskinOutposts, greenskinStrongholds, logs) {
        for (const outpost of greenskinOutposts) {
            if (greenskinStrongholds.length >= GREENSKIN_FACTION_CONFIG.MAX_STRONGHOLDS) return;
            if (Math.random() >= GREENSKIN_FACTION_CONFIG.STRONGHOLD_SPREAD_CHANCE) continue;

            const position = this._findSafeSpawnNear(
                outpost,
                allNodes,
                GREENSKIN_FACTION_CONFIG.STRONGHOLD_MIN_DISTANCE_PX,
                GREENSKIN_FACTION_CONFIG.STRONGHOLD_MAX_DISTANCE_PX,
                GREENSKIN_FACTION_CONFIG.COLLISION_DISTANCE_PX
            );
            if (!position) continue;

            const name = `${outpost.name.replace(' Outpost', '')} Stronghold`;
            const node = this._createGreenskinNode({
                type: GREENSKIN_NODE_TYPES.STRONGHOLD,
                name,
                position,
                factionId,
                buyModifier: GREENSKIN_ECONOMY.STRONGHOLD_BUY_MODIFIER,
                sellModifier: GREENSKIN_ECONOMY.STRONGHOLD_SELL_MODIFIER
            });

            allNodes.push(node);
            greenskinStrongholds.push(node);
            this.repo.logNodeHistory(node.id, `Fortified into a massive Greenskin Stronghold.`, 'world');
            logs.push(`A goblin outpost grew into a towering Greenskin Stronghold near ${outpost.name}.`);
        }
    }

    _createGreenskinNode({ type, name, position, factionId, buyModifier, sellModifier }) {
        const info = this.repo.createWorldNode({
            type,
            name,
            x: position.x,
            y: position.y,
            faction_id: factionId,
            reputation: GREENSKIN_ECONOMY.REPUTATION,
            buy_modifier: buyModifier,
            sell_modifier: sellModifier,
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
            reputation: GREENSKIN_ECONOMY.REPUTATION,
            is_hidden: HOSTILE_NODE_FLAGS.VISIBLE,
            is_hostile: HOSTILE_NODE_FLAGS.HOSTILE
        };
    }

    _findSafeSpawnNear(parentNode, allNodes, minDistance, maxDistance, minCollisionDistance) {
        for (let attempt = 0; attempt < GREENSKIN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
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
        for (let attempt = 0; attempt < GREENSKIN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: rng.randomInt(
                    GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: rng.randomInt(
                    GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, GREENSKIN_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: rng.randomInt(
                GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: rng.randomInt(
                GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _findIsolatedPositionRandom(existingNodes) {
        for (let attempt = 0; attempt < GREENSKIN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: this._randomInt(
                    GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: this._randomInt(
                    GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, GREENSKIN_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: this._randomInt(
                GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: this._randomInt(
                GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _isWithinMapBounds(position) {
        return position.x >= GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.x <= WORLD_GENERATION_CONFIG.MAP_WIDTH - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y >= GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y <= WORLD_GENERATION_CONFIG.MAP_HEIGHT - GREENSKIN_FACTION_CONFIG.MAP_EDGE_PADDING_PX;
    }

    _collidesWithAnyNode(position, nodes, minDistance) {
        return nodes.some(node => this.distance(position, node) < minDistance);
    }

    _pickCampName(rng, index) {
        return rng.pick(GREENSKIN_NAMES) || `Goblin Camp ${index + 1}`;
    }

    _pickRandomName() {
        return GREENSKIN_NAMES[this._randomInt(0, GREENSKIN_NAMES.length - 1)];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _getOrCreateFaction() {
        const existingFaction = this.repo.db
            .prepare('SELECT id FROM factions WHERE type = ? OR name = ? LIMIT 1')
            .get(GREENSKIN_FACTION.type, GREENSKIN_FACTION.name);

        if (existingFaction) {
            return { ...GREENSKIN_FACTION, id: Number(existingFaction.id) };
        }

        const result = this.repo.createFaction(GREENSKIN_FACTION);
        return { ...GREENSKIN_FACTION, id: Number(result.lastInsertRowid) };
    }
}