/**
 * Webknecht Faction Templates
 * Scans from primitive, instinct-driven beasts to conscious, highly individualistic arachnids.
 */
export const WEBKNECHTS = [
    // --- Primitive / Feral Types ---
    {
        id: 'webknecht_hatchling',
        name: 'Webknecht Hatchling',
        faction: 'webknechts',
        baseHp: 40,
        baseAtk: 10,
        baseDef: 12,
        xpReward: 15,
        lootTable: [
            'strange_meat'
        ]
    },
    {
        id: 'webknecht_hunter',
        name: 'Webknecht Hunter',
        faction: 'webknechts',
        baseHp: 80,
        baseAtk: 22,
        baseDef: 15,
        xpReward: 45,
        lootTable: [
            'strange_meat',
            'healing_salve'
        ]
    },

    // --- Conscious / Intellectual Types ---
    {
        id: 'webknecht_weaver',
        name: 'Conscious Weaver',
        faction: 'webknechts',
        baseHp: 110,
        baseAtk: 26,
        baseDef: 18,
        xpReward: 75,
        lootTable: [
            'strange_meat',
            'ancient_coin',
            'glowing_orb'
        ]
    },
    {
        id: 'webknecht_awakened',
        name: 'Awakened Webknecht',
        faction: 'webknechts',
        baseHp: 130,
        baseAtk: 32,
        baseDef: 20,
        xpReward: 110,
        lootTable: [
            'strange_meat',
            'handaxe',
            'buckler',
            'ancient_coin'
        ]
    },
    {
        id: 'webknecht_broodlord',
        name: 'Webknecht Broodlord',
        faction: 'webknechts',
        baseHp: 210,
        baseAtk: 45,
        baseDef: 25,
        xpReward: 190,
        lootTable: [
            'strange_meat',
            'gold_goblet',
            'glowing_orb',
            'focus_elixir'
        ]
    }
];