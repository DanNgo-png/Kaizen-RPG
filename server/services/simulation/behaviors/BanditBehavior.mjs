import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { BANDIT_FACTION_CONFIG, BANDIT_NAMES } from "../../../data/factions/BanditFactions.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

export class BanditBehavior extends BaseFactionBehavior {
    setupFactions(rng, context) {
        const faction = {
            name: "Brigands",
            color: "#475569", // Slate grey
            archetype: "bandits",
            motto: "Your money or your life.",
            type: "bandit"
        };
        const result = this.repo.createFaction(faction);
        return [{ ...faction, id: Number(result.lastInsertRowid) }];
    }

    generateNodes(rng, context) {
        const createdNodes = [];
        if (context.isPremade) return createdNodes; 

        const banditFaction = context.factions.find(f => f.type === 'bandit');
        if (!banditFaction) return createdNodes;

        const existingNodes = context.nodes;
        const campCount = rng.randomInt(2, 4);

        for (let i = 0; i < campCount; i++) {
            const pos = this._findIsolatedPosition(rng, existingNodes);
            const name = rng.pick(BANDIT_NAMES) || `Bandit Camp ${i}`;

            const info = this.repo.createWorldNode({
                type: 'Bandit Camp',
                name: name,
                x: pos.x, y: pos.y,
                faction_id: banditFaction.id,
                buy_modifier: 1.0,
                sell_modifier: 0.3,
                specialization: null,
                attachments: 0
            });

            // Update specific properties natively since createWorldNode lacks those arguments
            this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);

            const node = { id: info.lastInsertRowid, type: 'Bandit Camp', ...pos, faction_id: banditFaction.id, is_hidden: 0, is_hostile: 1 };
            createdNodes.push(node);
            existingNodes.push(node); 
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        if (currentDay % BANDIT_FACTION_CONFIG.SPAWN_INTERVAL_DAYS === 0) {
            const camps = this.repo.db.prepare('SELECT id FROM world_nodes WHERE type = "Bandit Camp"').all();
            if (camps.length < BANDIT_FACTION_CONFIG.MAX_CAMPS) {
                const banditFaction = this.repo.db.prepare('SELECT id FROM factions WHERE type = "bandit" LIMIT 1').get();
                if (!banditFaction) return;

                const allNodes = this.repo.db.prepare('SELECT x, y FROM world_nodes').all();
                const pos = this._findIsolatedPositionRandom(allNodes);
                const name = BANDIT_NAMES[Math.floor(Math.random() * BANDIT_NAMES.length)];
                
                const info = this.repo.createWorldNode({
                    type: 'Bandit Camp',
                    name: name,
                    x: pos.x, y: pos.y,
                    faction_id: banditFaction.id,
                    buy_modifier: 1.0, sell_modifier: 0.3,
                    specialization: null, attachments: 0
                });

                this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);
                this.repo.logNodeHistory(info.lastInsertRowid, `A new bandit camp was established in the wilderness.`, 'world');
            }
        }
    }

    _findIsolatedPosition(rng, existingNodes) {
        for (let i = 0; i < 50; i++) {
            const pos = {
                x: rng.randomInt(100, WORLD_GENERATION_CONFIG.MAP_WIDTH - 100),
                y: rng.randomInt(100, WORLD_GENERATION_CONFIG.MAP_HEIGHT - 100)
            };
            const isIsolated = existingNodes.every(n => this.distance(pos, n) > 300);
            if (isIsolated) return pos;
        }
        return {
            x: rng.randomInt(100, WORLD_GENERATION_CONFIG.MAP_WIDTH - 100),
            y: rng.randomInt(100, WORLD_GENERATION_CONFIG.MAP_HEIGHT - 100)
        };
    }

    _findIsolatedPositionRandom(existingNodes) {
        for (let i = 0; i < 50; i++) {
            const pos = {
                x: Math.floor(Math.random() * (WORLD_GENERATION_CONFIG.MAP_WIDTH - 200)) + 100,
                y: Math.floor(Math.random() * (WORLD_GENERATION_CONFIG.MAP_HEIGHT - 200)) + 100
            };
            const isIsolated = existingNodes.every(n => this.distance(pos, n) > 300);
            if (isIsolated) return pos;
        }
        return {
            x: Math.floor(Math.random() * (WORLD_GENERATION_CONFIG.MAP_WIDTH - 200)) + 100,
            y: Math.floor(Math.random() * (WORLD_GENERATION_CONFIG.MAP_HEIGHT - 200)) + 100
        };
    }
}