import { ORIGIN_CONFIGS, ROLE_STATS, NAMES, TITLES } from '../data/GameDataConstants.mjs';

export class CampaignGenerator {
    constructor(repository) {
        this.repo = repository;
    }

    generate(config) {
        console.log(`🎲 Generating Campaign: Source: ${config.mapSource}`);

        // 1. Setup Economy & Settings
        this._setupWorld(config);

        // 2. Generate Mercenaries based on Origin
        this._generateRoster(config.modeId, config.seed);

        // 3. Generate World Map
        if (config.mapSource === 'premade') {
            // [NEW] Use nodes passed from frontend
            if (config.premadeNodes && Array.isArray(config.premadeNodes)) {
                this._createPremadeNodes(config.premadeNodes);
            } else {
                console.error("❌ Map Source is premade but no nodes provided in config.");
            }
        } else {
            this._generateWorldMap(config.seed);
        }
    }

    _createPremadeNodes(nodes) {
        console.log(`🗺️ Importing ${nodes.length} Premade Nodes...`);
        nodes.forEach(n => this.repo.createWorldNode(n));
    }

    _setupWorld(config) {
        const originData = ORIGIN_CONFIGS[config.modeId] || ORIGIN_CONFIGS['default'];
        
        // Adjust Gold based on Difficulty setting
        let startingGold = originData.gold;
        if (config.funds === 'low') startingGold *= 0.5;
        if (config.funds === 'high') startingGold *= 1.5;

        // Save Global Settings
        this.repo.setCampaignSetting('company_name', config.name || "The Nameless");
        this.repo.setCampaignSetting('origin', config.modeId || 'sellswords'); 
        this.repo.setCampaignSetting('gold', Math.floor(startingGold));
        this.repo.setCampaignSetting('day', 1);
        this.repo.setCampaignSetting('difficulty_eco', config.economy);
        this.repo.setCampaignSetting('difficulty_com', config.combat);
        this.repo.setCampaignSetting('map_seed', config.seed);
    }

    _generateRoster(modeId, seed) {
        const originData = ORIGIN_CONFIGS[modeId] || ORIGIN_CONFIGS['default'];
        
        originData.roster.forEach((template, index) => {
            const name = NAMES[Math.floor(Math.random() * NAMES.length)];
            const title = Math.random() > 0.7 ? ` ${TITLES[Math.floor(Math.random() * TITLES.length)]}` : '';
            const fullName = `${name}${title}`;

            const ranges = ROLE_STATS[template.role] || ROLE_STATS['default'];
            const multiplier = template.statsMod || 1.0;

            const str = Math.floor(this._rand(ranges.str) * multiplier);
            const int = Math.floor(this._rand(ranges.int) * multiplier);
            const spd = Math.floor(this._rand(ranges.spd) * multiplier);
            
            const maxHp = 50 + (str * 2);
            const wage = Math.floor((str + int + spd) / 2);

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

            if (template.gear) {
                template.gear.forEach(itemId => {
                    this.repo.addItemToInventory(itemId, mercId);
                });
            }
        });
    }

    _loadPremadeMap() {
        console.log("🗺️ Loading Premade Map...");
        const nodes = [
            { type: 'Stronghold', name: 'Capital City', x: 400, y: 300, faction_id: 1 },
            { type: 'Village', name: 'Northshire', x: 400, y: 150, faction_id: 1 },
            { type: 'Town', name: 'Goldshire', x: 200, y: 400, faction_id: 1 },
            { type: 'Ruins', name: 'Dark Hollow', x: 600, y: 500, faction_id: null },
            { type: 'Village', name: 'Riverwood', x: 550, y: 350, faction_id: 2 },
            { type: 'Stronghold', name: 'Ironforge', x: 700, y: 200, faction_id: 2 }
        ];
        
        nodes.forEach(n => this.repo.createWorldNode(n));
        console.log(`✅ Loaded ${nodes.length} Premade Map nodes.`);
    }

    _generateWorldMap(seed) {
        console.log("🗺️ Generating Persistent World Map...");
        
        const nodes = [];
        const nodeCount = 15; 

        const types = ['Stronghold', 'Village', 'Ruins', 'Town'];
        const names = ['Oakhaven', 'Ironhold', 'Grimwatch', 'Blackwood', 'Sunnydale', 'Stormpeak'];

        for (let i = 0; i < nodeCount; i++) {
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

            this.repo.createWorldNode(nodeData);
        }
        
        console.log(`✅ Created ${nodeCount} permanent world nodes.`);
    }

    _generateEmpireMap(seed) {
        console.log("🗺️ Generating Grid Map for seed:", seed);
    }

    _rand([min, max]) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}