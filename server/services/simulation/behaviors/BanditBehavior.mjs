import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { BANDIT_FACTION_CONFIG, BANDIT_NAMES } from "../../../data/factions/BanditFactions.mjs";
import { WORLD_GENERATION_CONFIG } from "../../../data/factions/NobleFactions.mjs";

// --- Configuration Constants (Rule 5: No Magic Numbers) ---
const OUTPOST_SPAWN_CHANCE = 0.15;      // 15% daily chance per camp to establish an outpost
const STRONGHOLD_SPAWN_CHANCE = 0.08;   // 8% daily chance per outpost to escalate to a stronghold
const SIEGE_SUCCESS_CHANCE = 0.25;      // 25% daily chance for a nearby siege to succeed
const PROXIMITY_LIMIT_PX = 300;         // Max distance for a brigand base to participate in a siege
const COLLISION_THRESHOLD_PX = 70;      // Distance buffer to prevent overlapping map nodes
const SPAWN_MIN_DIST = 80;              // Minimum distance for a new outpost/stronghold from its parent
const SPAWN_MAX_DIST = 220;             // Maximum distance for a new outpost/stronghold from its parent

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
                reputation: -100,
                buy_modifier: 1.0,
                sell_modifier: 0.3,
                specialization: null,
                attachments: 0
            });

            // Update specific properties natively since createWorldNode lacks those arguments
            this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);

            const node = { id: info.lastInsertRowid, type: 'Bandit Camp', name, ...pos, faction_id: banditFaction.id, reputation: -100, is_hidden: 0, is_hostile: 1 };
            createdNodes.push(node);
            existingNodes.push(node); 
        }

        return createdNodes;
    }

    processDayEnd(currentDay) {
        const logs = [];

        const banditFaction = this.repo.db.prepare('SELECT id FROM factions WHERE type = "bandit" LIMIT 1').get();
        if (!banditFaction) return logs;

        // --- 1. SIEGE CONQUEST MECHANIC (Stolen Strongholds) ---
        const siegedStrongholds = this.repo.db.prepare(`
            SELECT id, name, x, y 
            FROM world_nodes 
            WHERE type = 'Stronghold' AND current_event = 'sieged'
        `).all();

        for (const stronghold of siegedStrongholds) {
            // Locate any nearby brigand nodes participating in the assault
            const nearbyBandit = this.repo.db.prepare(`
                SELECT id FROM world_nodes 
                WHERE faction_id = ? 
                  AND (type = 'Bandit Camp' OR type = 'Bandit Outpost' OR type = 'Bandit Stronghold')
                  AND ((x - @sx)*(x - @sx) + (y - @sy)*(y - @sy)) <= @proxLimitSquared
                LIMIT 1
            `).get(banditFaction.id, { 
                sx: stronghold.x, 
                sy: stronghold.y, 
                proxLimitSquared: PROXIMITY_LIMIT_PX * PROXIMITY_LIMIT_PX 
            });

            if (nearbyBandit) {
                if (Math.random() < SIEGE_SUCCESS_CHANCE) {
                    const newName = stronghold.name.startsWith("Stolen ") ? stronghold.name : `Stolen ${stronghold.name}`;
                    
                    this.repo.db.prepare(`
                        UPDATE world_nodes 
                        SET type = 'Stolen Stronghold', 
                            name = ?, 
                            faction_id = ?, 
                            is_hostile = 1, 
                            current_event = NULL, 
                            event_expiration = 0, 
                            reputation = -100 
                        WHERE id = ?
                    `).run(newName, banditFaction.id, stronghold.id);

                    this.repo.logNodeHistory(stronghold.id, `The siege succeeded! Brigands have captured the stronghold of ${stronghold.name}, turning it into a stolen bastion.`, 'world');
                    logs.push(`🏰 The stronghold of ${stronghold.name} has fallen to the Brigands and is now a Stolen Stronghold!`);
                }
            }
        }

        // --- 2. NATURAL BRIGAND TERRITORY EXPANSION ---
        const allNodes = this.repo.db.prepare('SELECT id, type, name, x, y, faction_id FROM world_nodes').all();
        const banditCamps = allNodes.filter(n => n.faction_id === banditFaction.id && n.type === 'Bandit Camp');
        const banditOutposts = allNodes.filter(n => n.faction_id === banditFaction.id && n.type === 'Bandit Outpost');

        // Main camps expand outwards to form outposts
        for (const camp of banditCamps) {
            if (Math.random() < OUTPOST_SPAWN_CHANCE) {
                const pos = this._findSafeSpawnNear(camp, allNodes, SPAWN_MIN_DIST, SPAWN_MAX_DIST, COLLISION_THRESHOLD_PX);
                if (pos) {
                    const outpostName = `${camp.name} Outpost`;
                    const info = this.repo.createWorldNode({
                        type: 'Bandit Outpost',
                        name: outpostName,
                        x: pos.x, y: pos.y,
                        faction_id: banditFaction.id,
                        reputation: -100,
                        buy_modifier: 1.1, sell_modifier: 0.25,
                        specialization: null, attachments: 0
                    });

                    this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);
                    this.repo.logNodeHistory(info.lastInsertRowid, `Established as a forward outpost of ${camp.name}.`, 'world');
                    
                    const newNode = { id: info.lastInsertRowid, type: 'Bandit Outpost', x: pos.x, y: pos.y, faction_id: banditFaction.id };
                    allNodes.push(newNode);
                    banditOutposts.push(newNode); 
                    
                    logs.push(`⛺ Brigands established a new outpost near ${camp.name}!`);
                }
            }
        }

        // Outposts fortify into robust strongholds
        for (const outpost of banditOutposts) {
            if (Math.random() < STRONGHOLD_SPAWN_CHANCE) {
                const pos = this._findSafeSpawnNear(outpost, allNodes, SPAWN_MIN_DIST + 40, SPAWN_MAX_DIST + 30, COLLISION_THRESHOLD_PX);
                if (pos) {
                    const cleanBaseName = outpost.name.replace(' Outpost', '');
                    const strongholdName = `${cleanBaseName} Stronghold`;
                    const info = this.repo.createWorldNode({
                        type: 'Bandit Stronghold',
                        name: strongholdName,
                        x: pos.x, y: pos.y,
                        faction_id: banditFaction.id,
                        reputation: -100,
                        buy_modifier: 1.25, sell_modifier: 0.2,
                        specialization: null, attachments: 0
                    });

                    this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);
                    this.repo.logNodeHistory(info.lastInsertRowid, `Erected as a formidable stronghold, expanding the brigand reign.`, 'world');
                    
                    allNodes.push({ id: info.lastInsertRowid, type: 'Bandit Stronghold', x: pos.x, y: pos.y, faction_id: banditFaction.id });
                    logs.push(`🏰 Brigands have erected a formidable Stronghold near ${outpost.name}!`);
                }
            }
        }

        // --- 3. ORIGINAL BANDIT CAMP SPAWNING ---
        if (currentDay % BANDIT_FACTION_CONFIG.SPAWN_INTERVAL_DAYS === 0) {
            const camps = this.repo.db.prepare('SELECT id FROM world_nodes WHERE type = "Bandit Camp"').all();
            if (camps.length < BANDIT_FACTION_CONFIG.MAX_CAMPS) {
                const physicalNodes = this.repo.db.prepare('SELECT x, y FROM world_nodes').all();
                const pos = this._findIsolatedPositionRandom(physicalNodes);
                const name = BANDIT_NAMES[Math.floor(Math.random() * BANDIT_NAMES.length)];
                
                const info = this.repo.createWorldNode({
                    type: 'Bandit Camp',
                    name: name,
                    x: pos.x, y: pos.y,
                    faction_id: banditFaction.id,
                    reputation: -100,
                    buy_modifier: 1.0, sell_modifier: 0.3,
                    specialization: null, attachments: 0
                });

                this.repo.db.prepare('UPDATE world_nodes SET is_hidden = 0, is_hostile = 1 WHERE id = ?').run(info.lastInsertRowid);
                this.repo.logNodeHistory(info.lastInsertRowid, `A new bandit camp was established in the wilderness.`, 'world');
                logs.push(`⚔️ Reports say a new Bandit Camp (${name}) has been set up in the wilderness.`);
            }
        }

        return logs;
    }

    _findSafeSpawnNear(parentNode, allNodes, minDistance = 80, maxDistance = 200, minCollisionDist = 70) {
        const maxAttempts = 50;
        let attempt = 0;
        let newX, newY;
        let valid = false;
        
        while (attempt < maxAttempts && !valid) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDistance + Math.random() * (maxDistance - minDistance);
            newX = parentNode.x + Math.cos(angle) * dist;
            newY = parentNode.y + Math.sin(angle) * dist;
            
            // Check boundary safety limits
            if (newX < 50 || newX > (WORLD_GENERATION_CONFIG.MAP_WIDTH - 50) || newY < 50 || newY > (WORLD_GENERATION_CONFIG.MAP_HEIGHT - 50)) {
                attempt++;
                continue;
            }
            
            valid = true;
            for (const n of allNodes) {
                const d = Math.hypot(n.x - newX, n.y - newY);
                if (d < minCollisionDist) {
                    valid = false;
                    break;
                }
            }
            attempt++;
        }
        
        return valid ? { x: Math.round(newX), y: Math.round(newY) } : null;
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