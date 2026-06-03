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
            'strange_meat',
            'webknecht_eggs'
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
            'webknecht_venom_gland',
            'webknecht_chitin_helm'
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
            'unrefined_arachnid_silk',
            'webknecht_chitin_dagger',
            'ancient_coin'
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
            'webknecht_chitin_dagger',
            'webknecht_chitin_helm',
            'unrefined_arachnid_silk'
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
            'webknecht_venom_spear',
            'webknecht_chitin_armor',
            'steel_web_silk',
            'petrified_web_egg',
            'focus_elixir'
        ]
    }
];