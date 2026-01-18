import { ORIGIN_CONFIGS, ROLE_STATS, NAMES, TITLES } from '../data/GameDataConstants.mjs';

export class CampaignGenerator {
    constructor(repository) {
        this.repo = repository;
    }

    /**
     * Main Entry Point
     * @param {Object} config - { modeId, seed, economy, combat, name, color, ... }
     */
    generate(config) {
        console.log(`🎲 Generating Campaign: [${config.modeId}] Seed: ${config.seed}`);

        // 1. Setup Economy & Settings
        this._setupWorld(config);

        // 2. Generate Mercenaries based on Origin
        this._generateRoster(config.modeId, config.seed);

        // 3. (Optional) Generate Initial Map/Tiles
        if (config.modeId === 'empire') {
            this._generateEmpireMap(config.seed);
        }
    }

    _setupWorld(config) {
        const originData = ORIGIN_CONFIGS[config.modeId] || ORIGIN_CONFIGS['default'];
        
        // Adjust Gold based on Difficulty setting
        let startingGold = originData.gold;
        if (config.funds === 'low') startingGold *= 0.5;
        if (config.funds === 'high') startingGold *= 1.5;

        // Save Global Settings
        this.repo.setCampaignSetting('company_name', config.name || "The Nameless");
        this.repo.setCampaignSetting('gold', Math.floor(startingGold));
        this.repo.setCampaignSetting('day', 1);
        this.repo.setCampaignSetting('difficulty_eco', config.economy);
        this.repo.setCampaignSetting('difficulty_com', config.combat);
        this.repo.setCampaignSetting('map_seed', config.seed);
    }

    _generateRoster(modeId, seed) {
        const originData = ORIGIN_CONFIGS[modeId] || ORIGIN_CONFIGS['default'];
        
        originData.roster.forEach((template, index) => {
            // 1. Generate Name
            const name = NAMES[Math.floor(Math.random() * NAMES.length)];
            const title = Math.random() > 0.7 ? ` ${TITLES[Math.floor(Math.random() * TITLES.length)]}` : '';
            const fullName = `${name}${title}`;

            // 2. Generate Stats
            const ranges = ROLE_STATS[template.role] || ROLE_STATS['default'];
            const multiplier = template.statsMod || 1.0;

            const str = Math.floor(this._rand(ranges.str) * multiplier);
            const int = Math.floor(this._rand(ranges.int) * multiplier);
            const spd = Math.floor(this._rand(ranges.spd) * multiplier);
            
            // Calculate Derived Stats
            const maxHp = 50 + (str * 2);
            const wage = Math.floor((str + int + spd) / 2);

            // 3. Insert Mercenary
            const mercData = {
                name: fullName,
                role: template.role,
                level: template.level,
                str, int, spd,
                max_hp: maxHp,
                current_hp: maxHp,
                wage: wage,
                is_active: 1
            };

            const result = this.repo.addMercenary(mercData);
            const mercId = result.lastInsertRowid;

            // 4. Equip Gear (Insert into Inventory linked to Merc ID)
            if (template.gear) {
                template.gear.forEach(itemId => {
                    this.repo.addItemToInventory(itemId, mercId);
                });
            }
        });
    }

    _generateEmpireMap(seed) {
        // Placeholder for grid generation logic if using Empire mode
        console.log("🗺️ Generating Grid Map for seed:", seed);
        // this.repo.createMapTiles(...)
    }

    // Helper: Random Integer between min and max
    _rand([min, max]) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}