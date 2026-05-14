import { ORIGIN_CONFIGS, ROLE_STATS, NAMES, TITLES, SETTLEMENT_NAMES, SETTLEMENT_TIERS, SPECIALIZATIONS } from '../data/GameDataConstants.mjs';

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
        nodes.forEach(n => {
            const tierInfo = SETTLEMENT_TIERS[n.type] || { buyMult: 1.0, sellMult: 0.5 };
            n.buy_modifier = n.buy_modifier || tierInfo.buyMult;
            n.sell_modifier = n.sell_modifier || tierInfo.sellMult;
            this.repo.createWorldNode(n);
        });
    }

    _setupWorld(config) {
        const originData = ORIGIN_CONFIGS[config.modeId] || ORIGIN_CONFIGS['default'];
        
        let startingGold = originData.gold;
        if (config.funds === 'low') startingGold *= 0.5;
        if (config.funds === 'high') startingGold *= 1.5;

        // Save Global Settings
        this.repo.setCampaignSetting('company_name', config.name || "The Nameless");
        this.repo.setCampaignSetting('origin', config.modeId || 'sellswords'); 
        this.repo.setCampaignSetting('game_version', config.version || 'standard'); // Save Game Version
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

    _generateWorldMap(seed) {
        console.log("🗺️ Generating Persistent World Map...");
        
        const nodeCount = 15; 
        
        // Weighted tiers - more hamlets and villages, very few empires
        const weightedTypes = [
            'Hamlet', 'Hamlet', 'Hamlet', 'Hamlet',
            'Village', 'Village', 'Village',
            'Town', 'Town',
            'City', 'City',
            'City-State',
            'Province',
            'Kingdom',
            'High Kingdom',
            'Empire',
            'Stronghold', 'Stronghold',
            'Ruins', 'Ruins'
        ];
        
        const availableNames = [...SETTLEMENT_NAMES];
        const specKeys = Object.keys(SPECIALIZATIONS);

        for (let i = availableNames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableNames[i], availableNames[j]] = [availableNames[j], availableNames[i]];
        }

        for (let i = 0; i < nodeCount; i++) {
            const x = Math.floor(Math.random() * 2000);
            const y = Math.floor(Math.random() * 1500);
            
            const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
            const settlementName = availableNames.pop() || `Unknown Lands ${i}`;
            const tierInfo = SETTLEMENT_TIERS[type] || { buyMult: 1.0, sellMult: 0.5 };

            // 30% chance the settlement is too poor to have a specialization (null)
            const isPoor = Math.random() < 0.30;
            const specialization = isPoor ? null : specKeys[Math.floor(Math.random() * specKeys.length)];
            
            const nodeData = {
                type: type,
                name: settlementName,
                x: x,
                y: y,
                faction_id: null,
                buy_modifier: tierInfo.buyMult,
                sell_modifier: tierInfo.sellMult,
                specialization: specialization
            };

            this.repo.createWorldNode(nodeData);
        }
        
        console.log(`✅ Created ${nodeCount} permanent world nodes.`);
    }

    _rand([min, max]) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}