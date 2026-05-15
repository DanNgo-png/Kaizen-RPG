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

    // --- BRIGAND LOOT ARMOR ---
    { 
        id: 'reinforced_mail_shirt', 
        name: 'Reinforced Mail Shirt', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 600, 
        rarity: 'uncommon',
        stats: { defense: 110, weight: 15, fatigue_penalty: -12 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'leather_lamellar_armor', 
        name: 'Leather Lamellar Armor', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 400, 
        rarity: 'uncommon',
        stats: { defense: 95, weight: 12, fatigue_penalty: -10 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'patched_mail_shirt', 
        name: 'Patched Mail Shirt', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 300, 
        rarity: 'common',
        stats: { defense: 90, weight: 14, fatigue_penalty: -11 },
        availableIn: ['Village', 'Ruins'] 
    },
    { 
        id: 'padded_leather', 
        name: 'Padded Leather', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 200, 
        rarity: 'common',
        stats: { defense: 80, weight: 8, fatigue_penalty: -6 },
        availableIn: ['Village', 'Ruins'] 
    },
    { 
        id: 'rugged_surcoat', 
        name: 'Rugged Surcoat', 
        type: 'Armor', 
        icon: 'fa-solid fa-shirt', 
        baseValue: 100, 
        rarity: 'common',
        stats: { defense: 55, weight: 4, fatigue_penalty: -3 },
        availableIn: ['Village', 'Ruins'] 
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
    
    // --- BRIGAND LOOT HELMETS ---
    { 
        id: 'padded_dented_nasal_helmet', 
        name: 'Padded Dented Nasal Helmet', 
        type: 'Head', 
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 250, 
        rarity: 'uncommon',
        stats: { defense: 110, weight: 6, fatigue_penalty: -4 },
        availableIn: ['Ruins'] 
    },
    { 
        id: 'brigand_nasal_helmet', 
        name: 'Nasal Helmet', 
        type: 'Head', 
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 240, 
        rarity: 'uncommon',
        stats: { defense: 105, weight: 5, fatigue_penalty: -3 },
        availableIn: ['Town', 'Ruins'] 
    },
    { 
        id: 'rusty_mail_coif', 
        name: 'Rusty Mail Coif', 
        type: 'Head', 
        icon: 'fa-solid fa-helmet-safety', 
        baseValue: 150, 
        rarity: 'common',
        stats: { defense: 70, weight: 4, fatigue_penalty: -2 },
        availableIn: ['Village', 'Ruins'] 
    },
    { 
        id: 'headscarf', 
        name: 'Headscarf', 
        type: 'Head', 
        icon: 'fa-solid fa-mask', 
        baseValue: 30, 
        rarity: 'common',
        stats: { defense: 20, weight: 0, fatigue_penalty: 0 },
        availableIn: ['Village', 'Ruins'] 
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
        availableIn: ['Village', 'Town', 'Stronghold', 'Ruins'] 
    },
    { 
        id: 'buckler', 
        name: 'Buckler', 
        type: 'Off-Hand', 
        icon: 'fa-solid fa-shield', 
        baseValue: 100, 
        rarity: 'common',
        stats: { defense: 10, weight: 2, fatigue_penalty: 0 },
        availableIn: ['Village', 'Town', 'Ruins'] 
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