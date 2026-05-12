export const UNDEAD = [
    {
        id: 'skeleton_thrall',
        name: 'Skeleton Thrall',
        faction: 'undead',
        baseHp: 40,
        baseAtk: 10,
        baseDef: 5,
        xpReward: 15,
        lootTable: ['wooden_shield'] // Drops common, weak items
    },
    {
        id: 'zombie',
        name: 'Plague Zombie',
        faction: 'undead',
        baseHp: 120,
        baseAtk: 20,
        baseDef: 0,
        xpReward: 35,
        lootTable: ['healing_salve'] // Often carries intact salves on their rotting bodies
    },
    {
        id: 'skeleton_knight',
        name: 'Fallen Knight',
        faction: 'undead',
        baseHp: 150,
        baseAtk: 35,
        baseDef: 25,
        xpReward: 100,
        lootTable: ['iron_sword', 'chainmail'] // Good source of mid-tier gear
    },
    {
        id: 'necromancer',
        name: 'Necromancer',
        faction: 'undead',
        baseHp: 80,
        baseAtk: 50, // High attack/magic damage
        baseDef: 10,
        xpReward: 250,
        lootTable: ['focus_elixir'] // Drops rare magical items
    }
];