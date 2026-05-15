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
        availableIn: ['Town', 'Stronghold', 'Ruins'] 
    },

    // --- RANGED WEAPONS ---
    { 
        id: 'hunting_bow', 
        name: 'Hunting Bow', 
        type: 'Ranged', 
        description: "A simple wooden bow, typically used to hunt game but deadly enough against unarmored foes.",
        icon: 'fa-solid fa-location-crosshairs', 
        baseValue: 120, 
        rarity: 'common',
        stats: { attack: 15, ammo: 10, weight: 4 },
        availableIn: ['Village', 'Town', 'Ruins'] 
    },
    { 
        id: 'heavy_crossbow', 
        name: 'Heavy Crossbow', 
        type: 'Ranged', 
        description: "Takes time to crank back, but launches bolts with enough force to punch clean through mail.",
        icon: 'fa-solid fa-crosshairs', 
        baseValue: 280, 
        rarity: 'rare',
        stats: { attack: 28, armor_penetration: 40, ammo: 15, weight: 8 },
        availableIn: ['Town', 'Stronghold', 'Ruins'] 
    },
    { 
        id: 'bundle_of_throwing_axes', 
        name: 'Bundle of Throwing Axes', 
        type: 'Ranged', 
        icon: 'fa-solid fa-hammer', 
        baseValue: 150, 
        rarity: 'uncommon',
        stats: { attack: 18, ammo: 5, weight: 6 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'bundle_of_javelins', 
        name: 'Bundle of Javelins', 
        type: 'Ranged', 
        icon: 'fa-solid fa-arrows-up-down', 
        baseValue: 140, 
        rarity: 'uncommon',
        stats: { attack: 16, ammo: 6, weight: 5 },
        availableIn: ['Town', 'Ruins'] 
    },

    // --- BRIGAND LOOT WEAPONS ---
    { 
        id: 'woodcutters_axe', 
        name: "Woodcutter's Axe", 
        type: 'Weapon', 
        icon: 'fa-solid fa-hammer', 
        baseValue: 120, 
        rarity: 'common',
        stats: { attack: 20, armor_penetration: 30, weight: 14 },
        availableIn: ['Village', 'Ruins'] 
    },
    { 
        id: 'two_handed_mallet', 
        name: 'Two-Handed Mallet', 
        type: 'Weapon', 
        icon: 'fa-solid fa-gavel', 
        baseValue: 140, 
        rarity: 'common',
        stats: { attack: 22, armor_penetration: 45, weight: 16 },
        availableIn: ['Village', 'Ruins'] 
    },
    { 
        id: 'hooked_blade', 
        name: 'Hooked Blade', 
        type: 'Weapon', 
        icon: 'fa-solid fa-khanda', 
        baseValue: 180, 
        rarity: 'uncommon',
        stats: { attack: 25, armor_penetration: 20, weight: 12 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'pike', 
        name: 'Pike', 
        type: 'Weapon', 
        icon: 'fa-solid fa-text-height', 
        baseValue: 200, 
        rarity: 'uncommon',
        stats: { attack: 24, armor_penetration: 25, weight: 10 },
        availableIn: ['Town', 'Stronghold', 'Ruins'] 
    },
    { 
        id: 'boar_spear', 
        name: 'Boar Spear', 
        type: 'Weapon', 
        icon: 'fa-solid fa-arrow-up-long', 
        baseValue: 160, 
        rarity: 'uncommon',
        stats: { attack: 18, defense: 5, weight: 8 },
        availableIn: ['Town', 'Village', 'Ruins'] 
    },
    { 
        id: 'flail', 
        name: 'Flail', 
        type: 'Weapon', 
        icon: 'fa-solid fa-link', 
        baseValue: 170, 
        rarity: 'uncommon',
        stats: { attack: 16, armor_penetration: 30, weight: 9 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'handaxe', 
        name: 'Handaxe', 
        type: 'Weapon', 
        icon: 'fa-solid fa-hammer', 
        baseValue: 110, 
        rarity: 'common',
        stats: { attack: 14, armor_penetration: 20, weight: 6 },
        availableIn: ['Village', 'Town', 'Ruins'] 
    },
    { 
        id: 'shortsword', 
        name: 'Shortsword', 
        type: 'Weapon', 
        icon: 'fa-solid fa-khanda', 
        baseValue: 130, 
        rarity: 'common',
        stats: { attack: 12, defense: 2, weight: 4 },
        availableIn: ['Town', 'Ruins'] 
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