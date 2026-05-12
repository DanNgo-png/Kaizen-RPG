export const ARMOR = [
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
        id: 'plate_armor', 
        name: 'Heavy Plate', 
        type: 'Armor', 
        icon: 'fa-solid fa-user-shield', 
        baseValue: 1200, 
        rarity: 'legendary',
        stats: { defense: 60, weight: 30, fatigue_penalty: -25 },
        availableIn: ['Stronghold'] 
    }
];