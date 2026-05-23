import { BaseFactionBehavior } from "./BaseFactionBehavior.mjs";
import { NOBLE_HOUSE_LORE_POOL, WORLD_GENERATION_CONFIG, WORLD_NODE_TYPE_WEIGHTS } from "../../../data/factions/NobleFactions.mjs";
import { BARBARIAN_NODE_TYPES } from "../../../data/factions/BarbarianFactions.mjs";
import { SETTLEMENT_NAMES, SETTLEMENT_TIERS, SPECIALIZATIONS, SETTLEMENT_EVENTS } from "../../../data/GameDataConstants.mjs";

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
                const info = this.repo.createWorldNode({
                    type: house.capitalType,
                    name: house.seatName,
                    x: pos.x, y: pos.y,
                    faction_id: house.id,
                    buy_modifier: tierInfo.buyMult, sell_modifier: tierInfo.sellMult,
                    specialization: null,
                    attachments: rng.randomInt(1, 3)
                });
                const node = { id: info.lastInsertRowid, ...pos, factionId: house.id, name: house.seatName, type: house.capitalType };
                capitals.push(node);
                createdNodes.push(node);
            });

            const reservedNames = new Set(factions.map(h => h.seatName));
            const availableNames = rng.shuffle(SETTLEMENT_NAMES.filter(n => !reservedNames.has(n)));
            const specKeys = Object.keys(SPECIALIZATIONS);
            const remaining = Math.max(0, WORLD_GENERATION_CONFIG.NODE_COUNT - capitals.length);

            for (let i = 0; i < remaining; i++) {
                const x = rng.randomInt(WORLD_GENERATION_CONFIG.MAP_MIN_X, WORLD_GENERATION_CONFIG.MAP_WIDTH);
                const y = rng.randomInt(WORLD_GENERATION_CONFIG.MAP_MIN_Y, WORLD_GENERATION_CONFIG.MAP_HEIGHT);
                const type = rng.pick(WORLD_NODE_TYPE_WEIGHTS);
                const name = availableNames.pop() || `Unknown ${i}`;
                const closest = this._findClosestCapital({x,y}, capitals);
                const isPoor = rng.next() < WORLD_GENERATION_CONFIG.POOR_SPECIALIZATION_CHANCE;
                const spec = isPoor ? null : rng.pick(specKeys);
                const tierInfo = SETTLEMENT_TIERS[type] || { buyMult: 1, sellMult: 1 };

                const info = this.repo.createWorldNode({
                    type, name, x, y,
                    faction_id: type === 'Ruins' ? null : closest?.factionId ?? null,
                    buy_modifier: tierInfo.buyMult, sell_modifier: tierInfo.sellMult,
                    specialization: spec,
                    attachments: rng.randomInt(0, 3)
                });
                createdNodes.push({ id: info.lastInsertRowid, type, name, x, y, faction_id: closest?.factionId });
            }
        }
        return createdNodes;
    }

    processDayEnd(currentDay) {
        // Fetch nodes including hostile camps to calculate safety distances
        const allNodes = this.repo.db.prepare('SELECT id, type, x, y, current_event, event_expiration, name FROM world_nodes').all();
        
        const settlements = allNodes.filter(n => !HOSTILE_SETTLEMENT_TYPES.includes(n.type));
        
        const enemies = allNodes.filter(n => HOSTILE_SETTLEMENT_TYPES.includes(n.type));

        const eventKeys = Object.keys(SETTLEMENT_EVENTS);

        for (const n of settlements) {
            if (n.current_event) {
                const newExp = n.event_expiration - 1;
                if (newExp <= 0) {
                    this.repo.db.prepare('UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?').run(n.id);
                    this.repo.logNodeHistory(n.id, `The local situation has stabilized. Things return to normal.`, 'world');
                } else {
                    this.repo.db.prepare('UPDATE world_nodes SET event_expiration = ? WHERE id = ?').run(newExp, n.id);
                }
            } else {
                // Calculate distance to nearest enemy camp
                let minEnemyDist = Infinity;
                enemies.forEach(e => {
                    const dist = Math.hypot(n.x - e.x, n.y - e.y);
                    if (dist < minEnemyDist) minEnemyDist = dist;
                });

                if (Math.random() < SETTLEMENT_EVENT_CHANCE) {
                    const validEvents = eventKeys.filter(k => SETTLEMENT_EVENTS[k].isRandom !== false);
                    
                    // Filter events based on safety
                    let pool = validEvents;
                    if (minEnemyDist < DANGEROUS_DISTANCE_PX) {
                        // Very close to enemies: high chance of negative events
                        pool = validEvents.filter(k => DANGEROUS_EVENT_KEYS.includes(k));
                    } else if (minEnemyDist > SAFE_DISTANCE_PX) {
                        // Very safe: high chance of positive events
                        pool = validEvents.filter(k => SAFE_EVENT_KEYS.includes(k));
                    }
                    
                    // Fallback to random if pool is empty
                    if (pool.length === 0) pool = validEvents;

                    const randomEvent = pool[Math.floor(Math.random() * pool.length)];
                    const duration = Math.floor(Math.random() * EVENT_DURATION_VARIANCE_DAYS) + EVENT_DURATION_MIN_DAYS;
                    
                    this.repo.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ? WHERE id = ?').run(randomEvent, duration, n.id);
                    this.repo.logNodeHistory(n.id, `Rumors spread of: ${SETTLEMENT_EVENTS[randomEvent].name}.`, 'world');
                }
            }
        }
        return [];
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
