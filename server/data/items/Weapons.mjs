export const WEAPONS = [
    // --- HUMAN WEAPONS ---
    { 
        id: 'iron_sword', 
        name: 'Iron Sword', 
        type: 'Weapon', 
        icon: 'fa-solid fa-khanda', 
        baseValue: 150, 
        rarity: 'common',
        stats: { attack: 10, defense: 2, weight: 5 },
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'warhammer', 
        name: 'Warhammer', 
        type: 'Weapon', 
        icon: 'fa-solid fa-gavel', 
        baseValue: 250, 
        rarity: 'rare',
        stats: { attack: 18, armor_penetration: 50, weight: 12 },
        availableIn: ['Stronghold'] 
    },
    { 
        id: 'falchion', 
        name: 'Falchion', 
        type: 'Weapon', 
        description: "A heavy, single-edged blade favored by those who prefer chopping over thrusting.",
        icon: 'fa-solid fa-khanda', 
        baseValue: 180, 
        rarity: 'uncommon',
        stats: { attack: 14, defense: 0, weight: 7 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'morning_star', 
        name: 'Morning Star', 
        type: 'Weapon', 
        description: "A spiked metal head attached to a wooden shaft. Devastating against armor.",
        icon: 'fa-solid fa-gavel', 
        baseValue: 210, 
        rarity: 'uncommon',
        stats: { attack: 15, armor_penetration: 25, weight: 8 },
        availableIn: ['Town', 'Stronghold'] 
    },

    // --- GREENSKIN CRUDE WEAPONS ---
    { 
        id: 'tree_limb', 
        name: 'Tree Limb', 
        type: 'Weapon', 
        description: "Literally just a heavy piece of wood ripped from a tree.",
        icon: 'fa-solid fa-leaf', 
        baseValue: 10, 
        rarity: 'common',
        stats: { attack: 6, weight: 8, fatigue_penalty: -2 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'cudgel', 
        name: 'Crude Cudgel', 
        type: 'Weapon', 
        description: "A block of wood hammered with iron nails.",
        icon: 'fa-solid fa-hammer', 
        baseValue: 40, 
        rarity: 'common',
        stats: { attack: 9, weight: 6 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'hatchet', 
        name: 'Rusted Hatchet', 
        type: 'Weapon', 
        description: "A small, poorly maintained axe. Still perfectly capable of severing limbs.",
        icon: 'fa-solid fa-hammer', 
        baseValue: 60, 
        rarity: 'common',
        stats: { attack: 12, armor_penetration: 10, weight: 5 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'bundle_of_crude_javelins', 
        name: 'Crude Javelins', 
        type: 'Ranged', 
        description: "A bundle of sharpened wooden sticks.",
        icon: 'fa-solid fa-arrows-up-down', 
        baseValue: 80, 
        rarity: 'common',
        stats: { attack: 11, ammo: 4, weight: 6 },
        availableIn: ['Ruins'] 
    },
    
    // --- GREENSKIN HEAVY WEAPONS ---
    { 
        id: 'head_splitter', 
        name: 'Head Splitter', 
        type: 'Weapon', 
        description: "A heavy piece of metal with a sharp head. Not made for human hands.",
        icon: 'fa-solid fa-gavel', 
        baseValue: 350, 
        rarity: 'rare',
        stats: { attack: 26, armor_penetration: 40, weight: 18, fatigue_penalty: -10 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'head_chopper', 
        name: 'Head Chopper', 
        type: 'Weapon', 
        description: "A sharp and crude shard of metal with a wrapped grip resembling a sword, but a lot heavier. Not made for human hands.",
        icon: 'fa-solid fa-khanda', 
        baseValue: 380, 
        rarity: 'rare',
        stats: { attack: 30, defense_penalty: -5, weight: 16, fatigue_penalty: -8 },
        availableIn: ['Ruins'] 
    }
];