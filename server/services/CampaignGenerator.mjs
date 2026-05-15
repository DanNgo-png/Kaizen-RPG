import {
    ORIGIN_CONFIGS,
    ROLE_STATS,
    NAMES,
    TITLES,
    SETTLEMENT_NAMES,
    SETTLEMENT_TIERS,
    SPECIALIZATIONS
} from '../data/GameDataConstants.mjs';
import {
    NOBLE_HOUSE_LORE_POOL,
    WORLD_GENERATION_CONFIG,
    WORLD_NODE_TYPE_WEIGHTS,
    WORLD_RANDOM_CONFIG
} from '../data/NobleHouses.mjs';

const DEFAULT_WORLD_MODIFIERS = Object.freeze({
    BUY: 1.0,
    SELL: 0.5,
    LOW_FUNDS: 0.5,
    HIGH_FUNDS: 1.5,
    STARTING_DAY: 1,
    ACTIVE_MERCENARY: 1
});

const ROSTER_GENERATION = Object.freeze({
    TITLE_CHANCE: 0.7,
    BASE_HIT_POINTS: 50,
    STRENGTH_HIT_POINT_MULTIPLIER: 2,
    WAGE_STAT_DIVISOR: 2
});

const INCLUSIVE_RANGE_OFFSET = 1;

export class CampaignGenerator {
    constructor(repository) {
        this.repo = repository;
    }

    generate(config) {
        console.log(`Generating Campaign: Source: ${config.mapSource}`);

        // 1. Setup Economy & Settings
        this._setupWorld(config);

        // 2. Generate Mercenaries based on Origin
        this._generateRoster(config.modeId, config.seed);

        // 3. Generate World Map
        if (config.mapSource === 'premade') {
            if (config.premadeNodes && Array.isArray(config.premadeNodes)) {
                this._createPremadeNodes(config.premadeNodes, config.seed);
            } else {
                console.error("Map Source is premade but no nodes provided in config.");
            }
        } else {
            this._generateWorldMap(config.seed);
        }
    }

    _createPremadeNodes(nodes, seed) {
        console.log(`Importing ${nodes.length} Premade Nodes...`);
        const factionIdMap = this._createPremadeFactionMap(nodes, seed);

        nodes.forEach(n => {
            const tierInfo = SETTLEMENT_TIERS[n.type] || {
                buyMult: DEFAULT_WORLD_MODIFIERS.BUY,
                sellMult: DEFAULT_WORLD_MODIFIERS.SELL
            };
            const originalFactionId = n.faction_id === null || n.faction_id === undefined
                ? null
                : Number(n.faction_id);
            const factionId = Number.isFinite(originalFactionId)
                ? factionIdMap.get(originalFactionId) ?? null
                : null;

            this.repo.createWorldNode({
                ...n,
                faction_id: factionId,
                buy_modifier: n.buy_modifier || tierInfo.buyMult,
                sell_modifier: n.sell_modifier || tierInfo.sellMult
            });
        });
    }

    _setupWorld(config) {
        const originData = ORIGIN_CONFIGS[config.modeId] || ORIGIN_CONFIGS['default'];

        let startingGold = originData.gold;
        if (config.funds === 'low') startingGold *= DEFAULT_WORLD_MODIFIERS.LOW_FUNDS;
        if (config.funds === 'high') startingGold *= DEFAULT_WORLD_MODIFIERS.HIGH_FUNDS;

        // Save Global Settings
        this.repo.setCampaignSetting('company_name', config.name || "The Nameless");
        this.repo.setCampaignSetting('origin', config.modeId || 'sellswords');
        this.repo.setCampaignSetting('game_version', config.version || 'standard');
        this.repo.setCampaignSetting('gold', Math.floor(startingGold));
        this.repo.setCampaignSetting('day', DEFAULT_WORLD_MODIFIERS.STARTING_DAY);
        this.repo.setCampaignSetting('difficulty_eco', config.economy);
        this.repo.setCampaignSetting('difficulty_com', config.combat);
        this.repo.setCampaignSetting('map_seed', config.seed);
    }

    _generateRoster(modeId, seed) {
        const originData = ORIGIN_CONFIGS[modeId] || ORIGIN_CONFIGS['default'];

        originData.roster.forEach((template) => {
            const name = NAMES[Math.floor(Math.random() * NAMES.length)];
            const title = Math.random() > ROSTER_GENERATION.TITLE_CHANCE
                ? ` ${TITLES[Math.floor(Math.random() * TITLES.length)]}`
                : '';
            const fullName = `${name}${title}`;

            const ranges = ROLE_STATS[template.role] || ROLE_STATS['default'];
            const multiplier = template.statsMod || DEFAULT_WORLD_MODIFIERS.BUY;

            const str = Math.floor(this._rand(ranges.str) * multiplier);
            const int = Math.floor(this._rand(ranges.int) * multiplier);
            const spd = Math.floor(this._rand(ranges.spd) * multiplier);

            const maxHp = ROSTER_GENERATION.BASE_HIT_POINTS + (str * ROSTER_GENERATION.STRENGTH_HIT_POINT_MULTIPLIER);
            const wage = Math.floor((str + int + spd) / ROSTER_GENERATION.WAGE_STAT_DIVISOR);

            const mercData = {
                name: fullName,
                role: template.role,
                level: template.level,
                str,
                int,
                spd,
                max_hp: maxHp,
                current_hp: maxHp,
                wage: wage,
                is_active: DEFAULT_WORLD_MODIFIERS.ACTIVE_MERCENARY
            };

            const result = this.repo.addMercenary(mercData);
            const mercId = result.lastInsertRowid;

            if (template.gear) {
                template.gear.forEach(itemId => {
                    this.repo.addItemToInventory(itemId, mercId);
                });
            }
        });
    }

    _generateWorldMap(seed) {
        console.log("Generating Persistent World Map...");
        const rng = this._createSeededRandom(seed);
        const houseCount = this._randomInt(
            rng,
            WORLD_GENERATION_CONFIG.MIN_HOUSES,
            WORLD_GENERATION_CONFIG.MAX_HOUSES
        );
        const houses = this._createFactions(houseCount, rng);
        const capitals = this._createCapitalNodes(houses, rng);
        const availableNames = this._shuffledSettlementNames(houses, rng);
        const specKeys = Object.keys(SPECIALIZATIONS);
        const remainingNodeCount = Math.max(
            0,
            WORLD_GENERATION_CONFIG.NODE_COUNT - capitals.length
        );

        for (let i = 0; i < remainingNodeCount; i++) {
            const x = this._randomInt(rng, WORLD_GENERATION_CONFIG.MAP_MIN_X, WORLD_GENERATION_CONFIG.MAP_WIDTH);
            const y = this._randomInt(rng, WORLD_GENERATION_CONFIG.MAP_MIN_Y, WORLD_GENERATION_CONFIG.MAP_HEIGHT);

            const type = this._pick(WORLD_NODE_TYPE_WEIGHTS, rng);
            const settlementName = availableNames.pop() || `Unknown Lands ${i}`;
            const tierInfo = SETTLEMENT_TIERS[type] || {
                buyMult: DEFAULT_WORLD_MODIFIERS.BUY,
                sellMult: DEFAULT_WORLD_MODIFIERS.SELL
            };
            const closestCapital = this._findClosestCapital({ x, y }, capitals);

            // Poor settlements can lack a signature trade or craft.
            const isPoor = rng() < WORLD_GENERATION_CONFIG.POOR_SPECIALIZATION_CHANCE;
            const specialization = isPoor ? null : this._pick(specKeys, rng);

            this.repo.createWorldNode({
                type,
                name: settlementName,
                x,
                y,
                faction_id: type === 'Ruins' ? null : closestCapital?.factionId ?? null,
                buy_modifier: tierInfo.buyMult,
                sell_modifier: tierInfo.sellMult,
                specialization
            });
        }

        console.log(`Created ${WORLD_GENERATION_CONFIG.NODE_COUNT} permanent world nodes across ${houses.length} noble houses.`);
    }

    _createPremadeFactionMap(nodes, seed) {
        const originalFactionIds = [
            ...new Set(
                nodes
                    .map(node => (
                        node.faction_id === null || node.faction_id === undefined
                            ? null
                            : Number(node.faction_id)
                    ))
                    .filter(Number.isFinite)
            )
        ].sort((a, b) => a - b);

        if (!originalFactionIds.length) return new Map();

        const rng = this._createSeededRandom(`${seed}:premade-factions`);
        const factions = this._createFactions(originalFactionIds.length, rng);

        return new Map(originalFactionIds.map((id, index) => [id, factions[index]?.id ?? null]));
    }

    _createFactions(count, rng) {
        const selectedHouses = this
            ._shuffle([...NOBLE_HOUSE_LORE_POOL], rng)
            .slice(0, Math.min(count, NOBLE_HOUSE_LORE_POOL.length));

        return selectedHouses.map(house => {
            const result = this.repo.createFaction(house);
            return {
                ...house,
                id: Number(result.lastInsertRowid)
            };
        });
    }

    _createCapitalNodes(houses, rng) {
        const capitals = [];

        houses.forEach(house => {
            const position = this._findCapitalPosition(capitals, rng);
            const tierInfo = SETTLEMENT_TIERS[house.capitalType] || {
                buyMult: DEFAULT_WORLD_MODIFIERS.BUY,
                sellMult: DEFAULT_WORLD_MODIFIERS.SELL
            };

            this.repo.createWorldNode({
                type: house.capitalType,
                name: house.seatName,
                x: position.x,
                y: position.y,
                faction_id: house.id,
                buy_modifier: tierInfo.buyMult,
                sell_modifier: tierInfo.sellMult,
                specialization: null
            });

            capitals.push({
                ...position,
                factionId: house.id,
                factionName: house.name,
                name: house.seatName
            });
        });

        return capitals;
    }

    _findCapitalPosition(existingCapitals, rng) {
        for (let attempt = 0; attempt < WORLD_GENERATION_CONFIG.CAPITAL_PLACEMENT_ATTEMPTS; attempt++) {
            const candidate = this._randomCapitalPosition(rng);
            const hasEnoughDistance = existingCapitals.every(capital => {
                return this._distance(candidate, capital) >= WORLD_GENERATION_CONFIG.CAPITAL_MIN_DISTANCE;
            });

            if (hasEnoughDistance) return candidate;
        }

        return this._randomCapitalPosition(rng);
    }

    _randomCapitalPosition(rng) {
        return {
            x: this._randomInt(
                rng,
                WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING,
                WORLD_GENERATION_CONFIG.MAP_WIDTH - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING
            ),
            y: this._randomInt(
                rng,
                WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING,
                WORLD_GENERATION_CONFIG.MAP_HEIGHT - WORLD_GENERATION_CONFIG.CAPITAL_EDGE_PADDING
            )
        };
    }

    _findClosestCapital(position, capitals) {
        return capitals.reduce((closest, capital) => {
            const distance = this._distance(position, capital);
            if (!closest || distance < closest.distance) {
                return { capital, distance };
            }
            return closest;
        }, null)?.capital ?? null;
    }

    _shuffledSettlementNames(houses, rng) {
        const reservedCapitalNames = new Set(houses.map(house => house.seatName));
        const names = SETTLEMENT_NAMES.filter(name => !reservedCapitalNames.has(name));
        return this._shuffle(names, rng);
    }

    _shuffle(items, rng) {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this._randomInt(rng, 0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    _pick(items, rng) {
        if (!items.length) return null;
        return items[this._randomInt(rng, 0, items.length - INCLUSIVE_RANGE_OFFSET)];
    }

    _distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    _createSeededRandom(seed) {
        let state = this._seedToNumber(seed);

        return () => {
            state = (
                Math.imul(state, WORLD_RANDOM_CONFIG.LCG_MULTIPLIER) +
                WORLD_RANDOM_CONFIG.LCG_INCREMENT
            ) >>> 0;

            return state / WORLD_RANDOM_CONFIG.LCG_MODULUS;
        };
    }

    _seedToNumber(seed) {
        const seedText = String(seed ?? WORLD_RANDOM_CONFIG.FALLBACK_SEED);
        let hash = 0;

        for (let i = 0; i < seedText.length; i++) {
            hash = (
                Math.imul(hash, WORLD_RANDOM_CONFIG.HASH_MULTIPLIER) +
                seedText.charCodeAt(i)
            ) >>> 0;
        }

        return hash || WORLD_RANDOM_CONFIG.FALLBACK_SEED;
    }

    _randomInt(rng, min, max) {
        return Math.floor(rng() * (max - min + INCLUSIVE_RANGE_OFFSET)) + min;
    }

    _rand([min, max]) {
        return Math.floor(Math.random() * (max - min + INCLUSIVE_RANGE_OFFSET)) + min;
    }
}
