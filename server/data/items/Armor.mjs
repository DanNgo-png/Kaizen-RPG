export const ARMOR = [
    // --- HUMAN ARMOR ---
    { 
        id: 'padded_tunic', 
        name: 'Padded Tunic', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 50, 
        rarity: 'common',
        stats: { defense: 5, weight: 2, fatigue_penalty: 0 },
        availableIn: ['Village', 'Town'] 
    },
    { 
        id: 'chainmail', 
        name: 'Chainmail Hauberk', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 400, 
        rarity: 'uncommon',
        stats: { defense: 25, weight: 12, fatigue_penalty: -10 },
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'reinforced_mail', 
        name: 'Reinforced Mail', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 650, 
        rarity: 'rare',
        stats: { defense: 40, weight: 18, fatigue_penalty: -15 },
        availableIn: ['Stronghold', 'City'] 
    },
    { 
        id: 'scale_armor', 
        name: 'Scale Armor', 
        type: 'Armor', 
        icon: 'fa-solid fa-user-shield', 
        baseValue: 850, 
        rarity: 'rare',
        stats: { defense: 45, weight: 22, fatigue_penalty: -18 },
        availableIn: ['Stronghold'] 
    },
    { 
        id: 'plate_armor', 
        name: 'Heavy Plate', 
        type: 'Armor', 
        icon: 'fa-solid fa-user-shield', 
        baseValue: 1200, 
        rarity: 'legendary',
        stats: { defense: 65, weight: 30, fatigue_penalty: -25 },
        availableIn: ['Stronghold', 'High Kingdom'] 
    },

    // --- HELMETS ---
    { 
        id: 'kettle_hat', 
        name: 'Kettle Hat', 
        type: 'Head', 
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 150, 
        rarity: 'uncommon',
        stats: { defense: 15, weight: 3, fatigue_penalty: -1 },
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'nasal_helmet', 
        name: 'Nasal Helmet', 
        type: 'Head', 
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 220, 
        rarity: 'uncommon',
        stats: { defense: 22, weight: 4, fatigue_penalty: -2 },
        availableIn: ['Town', 'Stronghold'] 
    },

    // --- SHIELDS ---
    { 
        id: 'wooden_shield', 
        name: 'Wooden Shield', 
        type: 'Off-Hand', 
        icon: 'fa-solid fa-shield-halved', 
        baseValue: 80, 
        rarity: 'common',
        stats: { defense: 15, weight: 4, fatigue_penalty: -2 },
        availableIn: ['Village', 'Town', 'Stronghold'] 
    },
    { 
        id: 'heavy_metal_shield', 
        name: 'Heavy Metal Shield', 
        type: 'Off-Hand', 
        icon: 'fa-solid fa-shield', 
        baseValue: 350, 
        rarity: 'rare',
        stats: { defense: 35, weight: 12, fatigue_penalty: -8 },
        availableIn: ['Stronghold', 'Ruins'] 
    },

    // --- GREENSKIN / CRUDE ARMOR ---
    { 
        id: 'hide_armor', 
        name: 'Thick Hide Armor', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 80, 
        rarity: 'common',
        stats: { defense: 10, weight: 6, fatigue_penalty: -3 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'metal_plated_hide_armor', 
        name: 'Metal-Plated Hide', 
        type: 'Armor', 
        description: "Scraps of metal bolted onto thick leather.",
        icon: 'fa-solid fa-shirt', 
        baseValue: 200, 
        rarity: 'uncommon',
        stats: { defense: 22, weight: 10, fatigue_penalty: -6 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'metal_plated_helmet', 
        name: 'Looted Plated Helmet', 
        type: 'Head', 
        description: "A rusty helmet stretched to fit a larger skull.",
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 180, 
        rarity: 'uncommon',
        stats: { defense: 18, weight: 5, fatigue_penalty: -3 },
        availableIn: ['Ruins'] 
    }
];