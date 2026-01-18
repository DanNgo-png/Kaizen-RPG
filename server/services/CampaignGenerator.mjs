import { ORIGIN_CONFIGS, ROLE_STATS, NAMES, TITLES } from '../data/GameDataConstants.mjs';

export class CampaignGenerator {
    constructor(repository) {
        this.repo = repository;
    }

    generate(config) {
        console.log(`🎲 Generating Campaign: [${config.modeId}] Seed: ${config.seed}`);

        // 1. Setup Economy & Settings
        this._setupWorld(config);

        // 2. Generate Mercenaries based on Origin
        this._generateRoster(config.modeId, config.seed);

        // 3. Generate World Map
        this._generateWorldMap(config.seed);
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

    _generateWorldMap(seed) {
        console.log("🗺️ Generating Persistent World Map...");
        
        // Simple pseudo-random logic (In a real app, use a Seeded RNG library)
        const nodes = [];
        const nodeCount = 15; // Number of locations

        // Node Types
        const types = ['Stronghold', 'Village', 'Ruins', 'Town'];
        const names = ['Oakhaven', 'Ironhold', 'Grimwatch', 'Blackwood', 'Sunnydale', 'Stormpeak'];

        for (let i = 0; i < nodeCount; i++) {
            // Generate random coordinates within a safe 2000x1500 bounds
            const x = Math.floor(Math.random() * 2000);
            const y = Math.floor(Math.random() * 1500);
            
            const type = types[Math.floor(Math.random() * types.length)];
            const nameBase = names[Math.floor(Math.random() * names.length)];
            
            const nodeData = {
                type: type,
                name: `${nameBase} ${i + 1}`,
                x: x,
                y: y,
                faction_id: null
            };

            // Save to DB immediately
            this.repo.createWorldNode(nodeData);
        }
        
        console.log(`✅ Created ${nodeCount} permanent world nodes.`);
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