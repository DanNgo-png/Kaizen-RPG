import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import {
    BARBARIAN_FACTION_CONFIG,
    BARBARIAN_NAMES,
    BARBARIAN_NODE_TYPES
} from "../../../data/factions/BarbarianFactions.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

const BARBARIAN_FACTION = Object.freeze({
    name: "Barbarian Clans",
    color: "#dc2626",
    archetype: "barbarian",
    motto: "The border is kindling.",
    type: "barbarian"
});

const BARBARIAN_ECONOMY = Object.freeze({
    REPUTATION: -100,
    CAMP_BUY_MODIFIER: 1.05,
    CAMP_SELL_MODIFIER: 0.25,
    OUTPOST_BUY_MODIFIER: 1.15,
    OUTPOST_SELL_MODIFIER: 0.20,
    WARCAMP_BUY_MODIFIER: 1.30,
    WARCAMP_SELL_MODIFIER: 0.15
});

const HOSTILE_NODE_FLAGS = Object.freeze({
    VISIBLE: 0,
    HOSTILE: 1
});

const FULL_CIRCLE_RADIANS = Math.PI * 2;

export class BarbarianBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        return [this._getOrCreateFaction()];
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        if (context.isPremade) return createdNodes;

        const barbarianFaction = context.factions.find(faction => faction.type === BARBARIAN_FACTION.type);
        if (!barbarianFaction) return createdNodes;

        const existingNodes = context.nodes;
        const campCount = rng.randomInt(
            BARBARIAN_FACTION_CONFIG.INITIAL_CAMP_MIN,
            BARBARIAN_FACTION_CONFIG.INITIAL_CAMP_MAX
        );

        for (let index = 0; index < campCount; index++) {
            const position = this._findIsolatedPosition(rng, existingNodes);
            const name = this._pickCampName(rng, index);
            const node = this._createBarbarianNode({
                type: BARBARIAN_NODE_TYPES.CAMP,
                name,
                position,
                factionId: barbarianFaction.id,
                buyModifier: BARBARIAN_ECONOMY.CAMP_BUY_MODIFIER,
                sellModifier: BARBARIAN_ECONOMY.CAMP_SELL_MODIFIER
            });

            createdNodes.push(node);
            existingNodes.push(node);
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        const logs = [];
        const barbarianFaction = this._getOrCreateFaction();

        const allNodes = this.repo.db
            .prepare('SELECT id, type, name, x, y, faction_id FROM world_nodes')
            .all();

        const barbarianCamps = allNodes.filter(node =>
            node.faction_id === barbarianFaction.id && node.type === BARBARIAN_NODE_TYPES.CAMP
        );
        const barbarianOutposts = allNodes.filter(node =>
            node.faction_id === barbarianFaction.id && node.type === BARBARIAN_NODE_TYPES.OUTPOST
        );
        const barbarianWarcamps = allNodes.filter(node =>
            node.faction_id === barbarianFaction.id && node.type === BARBARIAN_NODE_TYPES.WARCAMP
        );

        this._spawnNewCamp(currentDay, barbarianFaction.id, allNodes, barbarianCamps, logs);
        this._spreadCamps(barbarianFaction.id, allNodes, barbarianCamps, barbarianOutposts, logs);
        this._fortifyOutposts(barbarianFaction.id, allNodes, barbarianOutposts, barbarianWarcamps, logs);

        return logs;
    }

    _spawnNewCamp(currentDay, factionId, allNodes, barbarianCamps, logs) {
        const hasNoCamps = barbarianCamps.length === 0;
        const isSpawnDay = hasNoCamps || currentDay % BARBARIAN_FACTION_CONFIG.CAMP_SPAWN_INTERVAL_DAYS === 0;
        const canAddCamp = barbarianCamps.length < BARBARIAN_FACTION_CONFIG.MAX_CAMPS;

        if (!isSpawnDay || !canAddCamp || Math.random() >= BARBARIAN_FACTION_CONFIG.CAMP_SPAWN_CHANCE) {
            return;
        }

        const position = this._findIsolatedPositionRandom(allNodes);
        const name = this._pickRandomName();
        const node = this._createBarbarianNode({
            type: BARBARIAN_NODE_TYPES.CAMP,
            name,
            position,
            factionId,
            buyModifier: BARBARIAN_ECONOMY.CAMP_BUY_MODIFIER,
            sellModifier: BARBARIAN_ECONOMY.CAMP_SELL_MODIFIER
        });

        allNodes.push(node);
        barbarianCamps.push(node);
        this.repo.logNodeHistory(node.id, "A new barbarian camp was raised beyond the settled roads.", 'world');
        logs.push(`Scouts report a new Barbarian Camp (${name}) in the wilderness.`);
    }

    _spreadCamps(factionId, allNodes, barbarianCamps, barbarianOutposts, logs) {
        for (const camp of barbarianCamps) {
            if (barbarianOutposts.length >= BARBARIAN_FACTION_CONFIG.MAX_OUTPOSTS) return;
            if (Math.random() >= BARBARIAN_FACTION_CONFIG.OUTPOST_SPREAD_CHANCE) continue;

            const position = this._findSafeSpawnNear(
                camp,
                allNodes,
                BARBARIAN_FACTION_CONFIG.SPAWN_MIN_DISTANCE_PX,
                BARBARIAN_FACTION_CONFIG.SPAWN_MAX_DISTANCE_PX,
                BARBARIAN_FACTION_CONFIG.COLLISION_DISTANCE_PX
            );
            if (!position) continue;

            const name = `${camp.name} Outpost`;
            const node = this._createBarbarianNode({
                type: BARBARIAN_NODE_TYPES.OUTPOST,
                name,
                position,
                factionId,
                buyModifier: BARBARIAN_ECONOMY.OUTPOST_BUY_MODIFIER,
                sellModifier: BARBARIAN_ECONOMY.OUTPOST_SELL_MODIFIER
            });

            allNodes.push(node);
            barbarianOutposts.push(node);
            this.repo.logNodeHistory(node.id, `Raised as a forward outpost from ${camp.name}.`, 'world');
            logs.push(`Barbarians raised a new outpost near ${camp.name}.`);
        }
    }

    _fortifyOutposts(factionId, allNodes, barbarianOutposts, barbarianWarcamps, logs) {
        for (const outpost of barbarianOutposts) {
            if (barbarianWarcamps.length >= BARBARIAN_FACTION_CONFIG.MAX_WARCAMPS) return;
            if (Math.random() >= BARBARIAN_FACTION_CONFIG.WARCAMP_SPREAD_CHANCE) continue;

            const position = this._findSafeSpawnNear(
                outpost,
                allNodes,
                BARBARIAN_FACTION_CONFIG.WARCAMP_MIN_DISTANCE_PX,
                BARBARIAN_FACTION_CONFIG.WARCAMP_MAX_DISTANCE_PX,
                BARBARIAN_FACTION_CONFIG.COLLISION_DISTANCE_PX
            );
            if (!position) continue;

            const name = `${outpost.name.replace(' Outpost', '')} Warcamp`;
            const node = this._createBarbarianNode({
                type: BARBARIAN_NODE_TYPES.WARCAMP,
                name,
                position,
                factionId,
                buyModifier: BARBARIAN_ECONOMY.WARCAMP_BUY_MODIFIER,
                sellModifier: BARBARIAN_ECONOMY.WARCAMP_SELL_MODIFIER
            });

            allNodes.push(node);
            barbarianWarcamps.push(node);
            this.repo.logNodeHistory(node.id, `Fortified from ${outpost.name} into a warcamp.`, 'world');
            logs.push(`A barbarian outpost has grown into a warcamp near ${outpost.name}.`);
        }
    }

    _createBarbarianNode({ type, name, position, factionId, buyModifier, sellModifier }) {
        const info = this.repo.createWorldNode({
            type,
            name,
            x: position.x,
            y: position.y,
            faction_id: factionId,
            reputation: BARBARIAN_ECONOMY.REPUTATION,
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
            reputation: BARBARIAN_ECONOMY.REPUTATION,
            is_hidden: HOSTILE_NODE_FLAGS.VISIBLE,
            is_hostile: HOSTILE_NODE_FLAGS.HOSTILE
        };
    }

    _findSafeSpawnNear(parentNode, allNodes, minDistance, maxDistance, minCollisionDistance) {
        for (let attempt = 0; attempt < BARBARIAN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
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
        for (let attempt = 0; attempt < BARBARIAN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: rng.randomInt(
                    BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: rng.randomInt(
                    BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, BARBARIAN_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: rng.randomInt(
                BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: rng.randomInt(
                BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _findIsolatedPositionRandom(existingNodes) {
        for (let attempt = 0; attempt < BARBARIAN_FACTION_CONFIG.PLACEMENT_ATTEMPTS; attempt++) {
            const position = {
                x: this._randomInt(
                    BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_WIDTH - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                ),
                y: this._randomInt(
                    BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                    WORLD_GENERATION_CONFIG.MAP_HEIGHT - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
                )
            };

            if (!this._collidesWithAnyNode(position, existingNodes, BARBARIAN_FACTION_CONFIG.ISOLATED_DISTANCE_PX)) {
                return position;
            }
        }

        return {
            x: this._randomInt(
                BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            ),
            y: this._randomInt(
                BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            )
        };
    }

    _isWithinMapBounds(position) {
        return position.x >= BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.x <= WORLD_GENERATION_CONFIG.MAP_WIDTH - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y >= BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX
            && position.y <= WORLD_GENERATION_CONFIG.MAP_HEIGHT - BARBARIAN_FACTION_CONFIG.MAP_EDGE_PADDING_PX;
    }

    _collidesWithAnyNode(position, nodes, minDistance) {
        return nodes.some(node => this.distance(position, node) < minDistance);
    }

    _pickCampName(rng, index) {
        return rng.pick(BARBARIAN_NAMES) || `Barbarian Camp ${index + 1}`;
    }

    _pickRandomName() {
        return BARBARIAN_NAMES[this._randomInt(0, BARBARIAN_NAMES.length - 1)];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _getOrCreateFaction() {
        const existingFaction = this.repo.db
            .prepare('SELECT id FROM factions WHERE type = ? OR name = ? LIMIT 1')
            .get(BARBARIAN_FACTION.type, BARBARIAN_FACTION.name);

        if (existingFaction) {
            return { ...BARBARIAN_FACTION, id: Number(existingFaction.id) };
        }

        const result = this.repo.createFaction(BARBARIAN_FACTION);
        return { ...BARBARIAN_FACTION, id: Number(result.lastInsertRowid) };
    }
}
