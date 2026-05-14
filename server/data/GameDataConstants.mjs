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
    'Oldham', 'Hewe', 'Eastbourne', 'Quan Ma', 'Travercraig', 'Bournemouth'
];

// --- Settlement Tiers & Economy ---
// Order of Development with isolated economies to prevent infinite money glitches
export const SETTLEMENT_TIERS = {
    'Hamlet':       { buyMult: 1.20, sellMult: 0.30, shopLevel: 1 },
    'Village':      { buyMult: 1.15, sellMult: 0.35, shopLevel: 1 },
    'Town':         { buyMult: 1.10, sellMult: 0.40, shopLevel: 2 },
    'City':         { buyMult: 1.05, sellMult: 0.45, shopLevel: 2 },
    'City-State':   { buyMult: 1.00, sellMult: 0.50, shopLevel: 3 },
    'Province':     { buyMult: 0.95, sellMult: 0.55, shopLevel: 3 },
    'Kingdom':      { buyMult: 0.90, sellMult: 0.60, shopLevel: 4 },
    'High Kingdom': { buyMult: 0.85, sellMult: 0.65, shopLevel: 4 },
    'Empire':       { buyMult: 0.80, sellMult: 0.70, shopLevel: 5 },
    'Stronghold':   { buyMult: 1.30, sellMult: 0.60, shopLevel: 3 }, // Military: charges premium, pays well for gear
    'Ruins':        { buyMult: 1.00, sellMult: 1.00, shopLevel: 0 }
};

// Definitions for "Origins" (Game Modes)
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
    // Default fallback
    'default': {
        gold: 1000,
        roster: [
            { role: 'Recruit', level: 1, gear: ['club', 'tunic'] }
        ]
    }
};

// Simple stat ranges for generation
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