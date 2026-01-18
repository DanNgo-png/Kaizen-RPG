export const NAMES = [
    'Torsten', 'Bjorn', 'Gareth', 'Roland', 'Leif', 'Konrad', 'Sigurd', 'Otto', 
    'Baldric', 'Ulrich', 'Wulf', 'Ragnar', 'Godfrey', 'Sven', 'Hagen', 'Dietrich'
];

export const TITLES = [
    'the Brave', 'the Coward', 'Ironhead', 'Strongjaw', 'the Wolf', 'Quickhands'
];

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