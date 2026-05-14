export const TRADE_GOODS = [
    { id: 'peat_bricks', name: 'Peat Bricks', type: 'Trade Good', icon: 'fa-solid fa-cubes', baseValue: 100, rarity: 'common' },
    { id: 'cloth_rolls', name: 'Cloth Rolls', type: 'Trade Good', icon: 'fa-solid fa-scroll', baseValue: 140, rarity: 'common' },
    { id: 'quality_wood', name: 'Quality Wood', type: 'Trade Good', icon: 'fa-solid fa-tree', baseValue: 180, rarity: 'common' },
    { id: 'copper_ingots', name: 'Copper Ingots', type: 'Trade Good', icon: 'fa-solid fa-bars', baseValue: 220, rarity: 'uncommon' },
    { id: 'amber_shards', name: 'Amber Shards', type: 'Trade Good', icon: 'fa-regular fa-gem', baseValue: 260, rarity: 'uncommon' },
    { id: 'furs', name: 'Furs', type: 'Trade Good', icon: 'fa-solid fa-paw', baseValue: 300, rarity: 'uncommon' },
    { id: 'spices', name: 'Spices', type: 'Trade Good', icon: 'fa-solid fa-leaf', baseValue: 320, rarity: 'rare' },
    { id: 'salt', name: 'Salt', type: 'Trade Good', icon: 'fa-solid fa-mound', baseValue: 340, rarity: 'rare' },
    { id: 'incense', name: 'Incense', type: 'Trade Good', icon: 'fa-solid fa-fire', baseValue: 380, rarity: 'rare' },
    { id: 'dyes', name: 'Dyes', type: 'Trade Good', icon: 'fa-solid fa-palette', baseValue: 400, rarity: 'legendary' },
    { id: 'silk', name: 'Silk', type: 'Trade Good', icon: 'fa-brands fa-yarn', baseValue: 460, rarity: 'legendary' },
    { id: 'uncut_gems', name: 'Uncut Gems', type: 'Trade Good', icon: 'fa-solid fa-gem', baseValue: 520, rarity: 'legendary' },
    { 
        id: 'wine', 
        name: 'Fine Wine', 
        type: 'Trade Good', 
        description: 'A cask of excellent vintage. Counts as 25 provisions, but will spoil in 14 days.',
        icon: 'fa-solid fa-wine-bottle', 
        baseValue: 200, 
        rarity: 'uncommon',
        stats: { provisions: 25, spoil_days: 14 } 
    },
];