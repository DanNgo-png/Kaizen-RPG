export const UNDEAD_FACTION_CONFIG = Object.freeze({
    INITIAL_CAMP_MIN: 1,
    INITIAL_CAMP_MAX: 3,
    MAX_CAMPS: 6,
    SPAWN_INTERVAL_DAYS: 15,
    CAMP_SPAWN_CHANCE: 0.35,
    INVASION_CHANCE: 0.18,       // 18% daily chance for mindless crypts to strike nearby towns
    SIEGE_CHANCE: 0.10,          // 10% daily chance for Necromancers to organize a calculated siege
    CAMP_ATTACK_CHANCE: 0.25,    // 25% daily chance of wild monsters/enemies raiding a Refugee Camp
    MAP_EDGE_PADDING_PX: 100,
    ISOLATED_DISTANCE_PX: 320,
    COLLISION_DISTANCE_PX: 80,
    PLACEMENT_ATTEMPTS: 50
});

export const UNDEAD_NODE_TYPES = Object.freeze({
    CRYPT: 'Desecrated Crypt',
    TOMB: 'Ancient Tomb',
    CAVE: 'Haunted Cave',
    DUNGEON: 'Sunken Dungeon',
    NECROPOLIS: 'Necropolis'
});

export const UNDEAD_NAMES = Object.freeze([
    "Ancient Barrow of the Kings",
    "Gloomwood Crypt",
    "The Weeping Catacombs",
    "Desecrated Sepulcher",
    "Shadowed Tomb of Sanguine",
    "Whispering Ossuary",
    "The Hollow Mausoleum",
    "Sunken Crypt of Despair",
    "Necropolis of the Lost",
    "Gravesend Sepulcher",
    "Ancient Lich's Rest",
    "Blighted Barrow",
    "Catacombs of the Restless",
    "Cursed Depths of Traitor's Gate"
]);