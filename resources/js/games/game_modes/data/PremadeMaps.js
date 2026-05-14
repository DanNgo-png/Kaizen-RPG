export const PREMADE_MAPS = [
    {
        id: 'kingdom_classic',
        name: 'The Classic Kingdom',
        description: 'A balanced geography with a central capital, trade routes to the south, and dangerous mountains to the north.',
        difficulty: 'Normal',
        nodes: [
            { type: 'Kingdom', name: 'Capital City', x: 400, y: 300, faction_id: 1, specialization: 'Silk Weaver'},
            { type: 'Village', name: 'Northshire', x: 400, y: 150, faction_id: 1, specialization: 'Lumber Camp' },
            { type: 'Town', name: 'Goldshire', x: 200, y: 400, faction_id: 1 },
            { type: 'Ruins', name: 'Dark Hollow', x: 600, y: 500, faction_id: null },
            { type: 'Hamlet', name: 'Riverwood', x: 550, y: 350, faction_id: 2 },
            { type: 'Stronghold', name: 'Ironforge', x: 700, y: 200, faction_id: 2 }
        ]
    },
    {
        id: 'shattered_isles',
        name: 'The Shattered Isles',
        description: 'A disconnected archipelago. Travel between settlements requires crossing dangerous waters.',
        difficulty: 'Hard',
        nodes: [
            { type: 'City', name: 'Port Royal', x: 100, y: 300, faction_id: 1 },
            { type: 'Village', name: 'Tortuga', x: 150, y: 450, faction_id: 1 },
            { type: 'High Kingdom', name: 'Stormwind Keep', x: 600, y: 100, faction_id: 2 },
            { type: 'Ruins', name: 'Sunken Temple', x: 700, y: 500, faction_id: null },
            { type: 'Hamlet', name: 'Lonely Rock', x: 400, y: 300, faction_id: null }
        ]
    },
    {
        id: 'frontier_lands',
        name: 'The Frontier',
        description: 'A linear stretch of civilization bordering a massive, untamed wilderness to the East.',
        difficulty: 'Expert',
        nodes: [
            { type: 'Stronghold', name: 'Westguard', x: 100, y: 300, faction_id: 1 },
            { type: 'Hamlet', name: 'Border Watch', x: 250, y: 300, faction_id: 1 },
            { type: 'City-State', name: 'Eastwatch', x: 400, y: 300, faction_id: 1 },
            { type: 'Ruins', name: 'The Unknown', x: 700, y: 300, faction_id: null },
            { type: 'Ruins', name: 'Deep Wilds', x: 700, y: 100, faction_id: null },
            { type: 'Ruins', name: 'Dark Forest', x: 700, y: 500, faction_id: null }
        ]
    }
];