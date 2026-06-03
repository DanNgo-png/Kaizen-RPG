// server/data/items/Provisions.mjs
export const PROVISIONS = [
    // --- BASIC PROVISIONS ---
    { 
        id: 'ground_grains', 
        name: 'Ground Grains', 
        type: 'Provision', 
        description: 'A sack of coarsely ground grains, perfect for making a filling, if bland, porridge. Counts as 25 provisions.',
        icon: 'fa-solid fa-wheat-awn', 
        baseValue: 50, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 7 }, 
        availableIn: ['Village'] 
    },
    { 
        id: 'rice', 
        name: 'Rice', 
        type: 'Provision', 
        description: 'A staple crop from distant lands, easy to boil and quite filling. Counts as 25 provisions.',
        icon: 'fa-solid fa-bowl-rice', 
        baseValue: 60, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 8 }, 
        availableIn: ['Village'] 
    },
    { 
        id: 'roots_and_berries', 
        name: 'Roots and Berries', 
        type: 'Provision', 
        description: 'Foraged goods from the local wilderness. Sweet, tart, and earthy. Counts as 25 provisions.',
        icon: 'fa-brands fa-pagelines', 
        baseValue: 60, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 8 }, 
        availableIn: ['Village'] 
    },
    { 
        id: 'bread', 
        name: 'Bread', 
        type: 'Provision', 
        description: 'Freshly baked loaves. A basic comfort on the road. Counts as 25 provisions.',
        icon: 'fa-solid fa-bread-slice', 
        baseValue: 65, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 8 }, 
        availableIn: ['Town'] 
    },
    { 
        id: 'dried_fish', 
        name: 'Dried Fish', 
        type: 'Provision', 
        description: 'Salted and dried to last longer. Smells terrible, but keeps you moving. Counts as 25 provisions.',
        icon: 'fa-solid fa-fish', 
        baseValue: 70, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 8 }, 
        availableIn: ['Village'] 
    },
    { 
        id: 'mushrooms', 
        name: 'Mushrooms', 
        type: 'Provision', 
        description: 'Foraged fungi. Earthy and filling. Counts as 25 provisions.',
        icon: 'fa-solid fa-cloud-meatball', 
        baseValue: 70, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 9 }, 
        availableIn: ['Village'] 
    },

    // --- STANDARD PROVISIONS ---
    { 
        id: 'beer', 
        name: 'Beer', 
        type: 'Provision', 
        description: 'A small cask of common ale. Lifts the spirits and fills the belly. Counts as 25 provisions.',
        icon: 'fa-solid fa-beer-mug-empty', 
        baseValue: 75, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 10 }, 
        availableIn: ['Town'] 
    },
    { 
        id: 'dried_fruits', 
        name: 'Dried Fruits', 
        type: 'Provision', 
        description: 'Sweet, preserved fruits that provide a quick burst of energy. Counts as 25 provisions.',
        icon: 'fa-solid fa-apple-whole', 
        baseValue: 80, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 10 }, 
        availableIn: ['Town'] 
    },
    { 
        id: 'dates', 
        name: 'Dates', 
        type: 'Provision', 
        description: 'Sweet, sticky dates traded from arid regions. Counts as 25 provisions.',
        icon: 'fa-solid fa-seedling', 
        baseValue: 80, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 10 }, 
        availableIn: ['Town'] 
    },
    { 
        id: 'goat_cheese', 
        name: 'Goat Cheese', 
        type: 'Provision', 
        description: 'A pungent wheel of hard cheese. Counts as 25 provisions.',
        icon: 'fa-solid fa-cheese', 
        baseValue: 85, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 11 }, 
        availableIn: ['Village'] 
    },
    { 
        id: 'mead', 
        name: 'Mead', 
        type: 'Provision', 
        description: 'Fermented honey wine. A favorite among Northmen. Counts as 25 provisions.',
        icon: 'fa-solid fa-wine-glass', 
        baseValue: 90, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 11 }, 
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'smoked_ham', 
        name: 'Smoked Ham', 
        type: 'Provision', 
        description: 'A hearty cut of cured pork. Counts as 25 provisions.',
        icon: 'fa-solid fa-bacon', 
        baseValue: 95, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 12 }, 
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'cured_venison', 
        name: 'Cured Venison', 
        type: 'Provision', 
        description: 'Salted and dried deer meat from a successful hunt. Counts as 25 provisions.',
        icon: 'fa-solid fa-drumstick-bite', 
        baseValue: 95, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 12 }, 
        availableIn: ['Town', 'Stronghold'] 
    },

    // --- HIGH TIER PROVISIONS ---
    { 
        id: 'webknecht_eggs', 
        name: 'Webknecht Eggs', 
        type: 'Provision', 
        description: 'A clutch of large, translucent eggs. Pungent and earthy, but heavily rich in essential nutrients. Counts as 25 provisions.',
        icon: 'fa-solid fa-circle-dot', 
        baseValue: 80, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 6 }, 
        availableIn: [] 
    },
    { 
        id: 'dried_lamb', 
        name: 'Dried Lamb', 
        type: 'Provision', 
        description: 'Strips of lamb meat, dried to survive long marches. Counts as 25 provisions.',
        icon: 'fa-solid fa-drumstick-bite', 
        baseValue: 105, 
        rarity: 'rare',
        stats: { provisions: 25, spoil_days: 13 }, 
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'wine', 
        name: 'Fine Wine', 
        type: 'Provision', 
        description: 'A cask of excellent vintage. A rare luxury on the road. Counts as 25 provisions.',
        icon: 'fa-solid fa-wine-bottle', 
        baseValue: 110, 
        rarity: 'rare',
        stats: { provisions: 25, spoil_days: 14 }, 
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'masterfully_cured_rations', 
        name: 'Masterfully Cured Rations', 
        type: 'Provision', 
        description: 'Prepared by an expert provisions master. These will last a long time. Counts as 25 provisions.',
        icon: 'fa-solid fa-box-open', 
        baseValue: 150, 
        rarity: 'legendary',
        stats: { provisions: 25, spoil_days: 16 }, 
        availableIn: ['Stronghold'] 
    },

    // --- MONSTROUS PROVISIONS (Loot Only) ---
    { 
        id: 'strange_meat', 
        name: 'Strange Meat', 
        type: 'Provision', 
        description: "It's meat. It's best not to ask what kind. Counts as 25 provisions.",
        icon: 'fa-solid fa-bone', 
        baseValue: 50, 
        rarity: 'common',
        stats: { provisions: 25, spoil_days: 4 }, 
        availableIn: [] 
    },
    { 
        id: 'black_marsh_stew', 
        name: 'Black Marsh Stew', 
        type: 'Provision', 
        description: 'A thick, dark stew of dubious origin. Counts as 25 provisions.',
        icon: 'fa-solid fa-bowl-food', 
        baseValue: 85, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 12 }, 
        availableIn: [] 
    },
    { 
        id: 'fermented_unhold_heart', 
        name: 'Fermented Unhold Heart', 
        type: 'Provision', 
        description: 'A giant\'s heart, fermented into a potent, if disgusting, meal. Counts as 25 provisions.',
        icon: 'fa-solid fa-heart', 
        baseValue: 150, 
        rarity: 'legendary',
        stats: { provisions: 25, spoil_days: 20 }, 
        availableIn: [] 
    }
];