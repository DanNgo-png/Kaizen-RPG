export const NAMES = [
    'Torsten', 'Bjorn', 'Gareth', 'Roland', 'Leif', 'Konrad', 'Sigurd', 'Otto', 
    'Baldric', 'Ulrich', 'Wulf', 'Ragnar', 'Godfrey', 'Sven', 'Hagen', 'Dietrich'
];

export const TITLES = [
    'the Brave', 'the Coward', 'Ironhead', 'Strongjaw', 'the Wolf', 'Quickhands'
];

export const SETTLEMENT_NAMES = [
    'Harrow', 'Heartland', "Dragon's Hollow", 'Wyvernstone', 'Mirefen', 
    'Aethelgard', 'Caerleon', 'Estoria', 'Iron-Lung', 'Oakhaven', 
    'Ironhold', 'Grimwatch', 'Blackwood', 'Stormpeak', "Raven's Roost",
    'Silverpine', 'Gloomhaven', 'Frostford', 'Emberfall', 'Kingswatch',
    'Duskhollow', 'Ashbourne', 'Wolfsden', 'Thornbury', "Viper's Run",
    'Stonehaven', "Crow's Nest", 'Highmount', 'Deepwater', 'Mistveil',
    'Whitestone', 'Gallowsgate', 'Mournstead', 'Everlight', 'Glimmerbrook',
    'Briar-Bight', 'North-Cross', 'Skyshelf', 'Rust-Creek', 'Smokefall',
    'Oldham', 'Hewe', 'Eastbourne', 'Quan Ma', 'Travercraig', 'Bournemouth',
    'Salt-Point', 'Singe', 'Copper-Mill', 'Marrow-Wall', 'Whalefall', 
    'Onyx-Reach', 'Gristle-Creek', 'Sun-Spear', "Valkyrie's Landing", 'Broken-Oar',
    'Shale-Town', 'Cinder-Hold', 'Verglas', 'Oakshade', 'Silt-Sump', 
    'Bright-Moor', 'Wyrm-Tail', 'Fallowfield', 'Iron-Suture', 'Cold-Harbor',
    'Brambleheart', 'Hollow-Gully', 'Cloudreach', 'Blood-Ridge', 'Wren-Hollow',
    'Gold-Thirst', 'Nettle-Bed', 'Soot-Vail', 'Elder-Link', 'Rime-Crest',
    'Silk-Garden', 'Mud-Spit', 'Twin-Spire', 'Goddlezipstle', 'Ferryzostle',
    'Amber-Vault', 'Quick-Silver', 'Thistle-Down', 'Red-Reach', 'Crag-End',
    'Kluarmont', 'Itreeta', 'Shuxmery', 'Wrifwell', 'Jufridge', 'Vragos', 'Strison'
];

// --- Settlement Tiers & Economy ---
export const SETTLEMENT_TIERS = {
    'Hamlet':       { buyMult: 1.20, sellMult: 0.85, shopLevel: 1, growthReqs: { contracts: 3, trade: 1000, materials: 5 } },
    'Village':      { buyMult: 1.15, sellMult: 0.90, shopLevel: 1, growthReqs: { contracts: 5, trade: 2500, materials: 10 } },
    'Town':         { buyMult: 1.10, sellMult: 1.00, shopLevel: 2, growthReqs: { contracts: 8, trade: 5000, materials: 15 } },
    'City':         { buyMult: 1.05, sellMult: 1.05, shopLevel: 2, growthReqs: { contracts: 12, trade: 8000, materials: 20 } },
    'City-State':   { buyMult: 1.00, sellMult: 1.10, shopLevel: 3, growthReqs: { contracts: 15, trade: 12000, materials: 25 } },
    'Province':     { buyMult: 0.95, sellMult: 1.15, shopLevel: 3, growthReqs: { contracts: 20, trade: 18000, materials: 30 } },
    'Kingdom':      { buyMult: 0.90, sellMult: 1.20, shopLevel: 4, growthReqs: { contracts: 25, trade: 25000, materials: 40 } },
    'High Kingdom': { buyMult: 0.85, sellMult: 1.25, shopLevel: 4, growthReqs: { contracts: 35, trade: 35000, materials: 50 } },
    'Empire':       { buyMult: 0.80, sellMult: 1.30, shopLevel: 5, growthReqs: { contracts: 50, trade: 50000, materials: 60 } },
    'Stronghold':   { buyMult: 1.30, sellMult: 0.95, shopLevel: 3, growthReqs: { contracts: 15, trade: 10000, materials: 25 } },
    'Ruins':              { buyMult: 1.00, sellMult: 1.00, shopLevel: 0 },
    'Bandit Camp':        { buyMult: 1.00, sellMult: 0.30, shopLevel: 0 },
    'Bandit Outpost':     { buyMult: 1.10, sellMult: 0.25, shopLevel: 0 },
    'Bandit Stronghold':  { buyMult: 1.25, sellMult: 0.20, shopLevel: 0 },
    'Stolen Stronghold':  { buyMult: 1.25, sellMult: 0.20, shopLevel: 0 },
    'Barbarian Camp':     { buyMult: 1.05, sellMult: 0.25, shopLevel: 0 },
    'Barbarian Outpost':  { buyMult: 1.15, sellMult: 0.20, shopLevel: 0 },
    'Barbarian Warcamp':  { buyMult: 1.30, sellMult: 0.15, shopLevel: 0 }
};

export const ORIGIN_CONFIGS = {
    'sellswords': {
        gold: 2000,
        roster: [
            { role: 'Vanguard', level: 1, gear: ['spear', 'shield', 'leather_armor'] },
            { role: 'Sellsword', level: 1, gear: ['axe', 'padded_armor'] },
            { role: 'Skirmisher', level: 1, gear: ['bow', 'tunic'] }
        ]
    },
    'lonewolf': {
        gold: 500,
        roster: [
            { role: 'Hedge Knight', level: 4, gear: ['greatsword', 'heavy_plate', 'full_helm'], statsMod: 1.5 }
        ]
    },
    'empire': {
        gold: 5000,
        roster: [
            { role: 'Quartermaster', level: 2, gear: ['dagger', 'noble_tunic'] },
            { role: 'Guard', level: 1, gear: ['sword', 'shield', 'mail_shirt'] }
        ]
    },
    'default': {
        gold: 1000,
        roster: [
            { role: 'Recruit', level: 1, gear: ['club', 'tunic'] }
        ]
    }
};

export const ROLE_STATS = {
    'Vanguard': { str: [12, 18], int: [8, 12], spd: [8, 12] },
    'Skirmisher': { str: [8, 12], int: [10, 14], spd: [14, 18] },
    'Hedge Knight': { str: [18, 25], int: [10, 15], spd: [8, 12] },
    'default': { str: [8, 12], int: [8, 12], spd: [8, 12] }
};

export const SPECIALIZATIONS = {
    'Peat Pit': ['peat_bricks'],
    'Weavers': ['cloth_rolls'],
    'Lumber Camp': ['quality_wood'],
    'Vineyard': ['wine'],
    'Copper Mine': ['copper_ingots'],
    'Amber Collector': ['amber_shards'],
    'Hunters': ['furs'],
    'Spice Farm': ['spices'],
    'Salt Mine': ['salt'],
    'Incense Gatherer': ['incense'],
    'Dye Maker': ['dyes'],
    'Silk Weaver': ['silk'],
    'Gem Mine': ['uncut_gems']
};

export const SETTLEMENT_EVENTS = {
    'ruined_location': { 
        name: 'Ruined Location', 
        buyMult: 1.5, 
        sellMult: 0.8, 
        qtyMult: 0.0, 
        specDisabled: true,
        freqMod: 5 
    },
    'ambushed_trade_routes': { 
        name: 'Ambushed Trade Routes', 
        buyMult: 2.5, 
        sellMult: 2.0, 
        qtyMult: 0.2, 
        specDisabled: false,
        freqMod: 3 
    },
    'well_supplied': { 
        name: 'Well Supplied', 
        buyMult: 0.75, 
        sellMult: 0.6, 
        qtyMult: 2.5, 
        rareChanceMult: 3.0,
        specDisabled: false,
        freqMod: 0 
    },
    'safe_roads': { 
        name: 'Safe Roads', 
        buyMult: 0.9, 
        sellMult: 0.8, 
        qtyMult: 1.3, 
        specDisabled: false,
        freqMod: 1 
    },
    'building_boom': {
        name: 'Building Boom',
        buyMult: 1.1,
        sellMult: 1.5,
        qtyMult: 1.2,
        specDisabled: false,
        freqMod: 3,
        isRandom: false
    },
    'settlement_expansion': {
        name: 'Settlement Expansion',
        buyMult: 1.1,
        sellMult: 1.5,
        qtyMult: 1.2,
        specDisabled: false,
        freqMod: 3,
        isRandom: false
    },
    'raided': { 
        name: 'Raided', 
        buyMult: 1.8, 
        sellMult: 0.7, 
        qtyMult: 0.2, 
        specDisabled: true, 
        freqMod: 3 
    },
    'terrified_villagers': { 
        name: 'Terrified Villagers', 
        buyMult: 1.6, 
        sellMult: 1.5, 
        qtyMult: 0.8, 
        specDisabled: false, 
        freqMod: 2 
    },
    'sieged': { 
        name: 'Sieged', 
        buyMult: 2.5, 
        sellMult: 0.5, 
        qtyMult: 0.1, 
        specDisabled: true, 
        freqMod: 1 
    }
};

export const BUILDING_MATERIALS = [
    'peat_bricks', 
    'quality_wood', 
    'copper_ingots'
];
export const SETTLEMENT_UPGRADE_PATH = {
    'Ruins': 'Hamlet',
    'Hamlet': 'Village',
    'Village': 'Town',
    'Town': 'City',
    'City': 'City-State',
    'City-State': 'Province',
    'Province': 'Kingdom',
    'Kingdom': 'High Kingdom',
    'High Kingdom': 'Empire',
    'Empire': null,     
    'Stronghold': null  
};
