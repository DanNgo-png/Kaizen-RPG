export const WEAPONS = [
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
    }
];