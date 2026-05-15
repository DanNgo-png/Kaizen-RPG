import { ORIGIN_CONFIGS, ROLE_STATS, NAMES, TITLES } from '../data/GameDataConstants.mjs';
import { WorldSimulator } from './simulation/WorldSimulator.mjs';
import { RNG } from '../utils/RNG.mjs';

const DEFAULT_WORLD_MODIFIERS = Object.freeze({
    BUY: 1.0, SELL: 1.0, LOW_FUNDS: 0.5, HIGH_FUNDS: 1.5, STARTING_DAY: 1, ACTIVE_MERCENARY: 1
});

const ROSTER_GENERATION = Object.freeze({
    TITLE_CHANCE: 0.7, BASE_HIT_POINTS: 50, STRENGTH_HIT_POINT_MULTIPLIER: 2, WAGE_STAT_DIVISOR: 2
});

export class CampaignGenerator {
    constructor(repository) {
        this.repo = repository;
    }

    generate(config) {
        console.log(`Generating Campaign: Source: ${config.mapSource}`);

        this._setupWorld(config);
        this._generateRoster(config.modeId, config.seed);

        const simulator = new WorldSimulator(this.repo);
        const rng = new RNG(config.seed);

        if (config.mapSource === 'premade') {
            if (config.premadeNodes && Array.isArray(config.premadeNodes)) {
                simulator.setupPremadeWorld(rng, config.premadeNodes);
            } else {
                console.error("Map Source is premade but no nodes provided in config.");
            }
        } else {
            simulator.generateProceduralWorld(rng);
        }
    }

    _setupWorld(config) {
        const originData = ORIGIN_CONFIGS[config.modeId] || ORIGIN_CONFIGS['default'];
        let startingGold = originData.gold;
        if (config.funds === 'low') startingGold *= DEFAULT_WORLD_MODIFIERS.LOW_FUNDS;
        if (config.funds === 'high') startingGold *= DEFAULT_WORLD_MODIFIERS.HIGH_FUNDS;

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
        const rng = new RNG(seed); // Seed the names too

        originData.roster.forEach((template) => {
            const name = rng.pick(NAMES);
            const title = Math.random() > ROSTER_GENERATION.TITLE_CHANCE ? ` ${rng.pick(TITLES)}` : '';
            const fullName = `${name}${title}`;
            const ranges = ROLE_STATS[template.role] || ROLE_STATS['default'];
            const multiplier = template.statsMod || 1.0;

            const str = Math.floor(rng.randomInt(ranges.str[0], ranges.str[1]) * multiplier);
            const int = Math.floor(rng.randomInt(ranges.int[0], ranges.int[1]) * multiplier);
            const spd = Math.floor(rng.randomInt(ranges.spd[0], ranges.spd[1]) * multiplier);
            const maxHp = ROSTER_GENERATION.BASE_HIT_POINTS + (str * ROSTER_GENERATION.STRENGTH_HIT_POINT_MULTIPLIER);
            const wage = Math.floor((str + int + spd) / ROSTER_GENERATION.WAGE_STAT_DIVISOR);

            const result = this.repo.addMercenary({
                name: fullName, role: template.role, level: template.level,
                str, int, spd, max_hp: maxHp, current_hp: maxHp, wage: wage,
                is_active: DEFAULT_WORLD_MODIFIERS.ACTIVE_MERCENARY
            });

            if (template.gear) {
                template.gear.forEach(itemId => this.repo.addItemToInventory(itemId, result.lastInsertRowid));
            }
        });
    }
}