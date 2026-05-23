export const BARBARIAN_NODE_TYPES = Object.freeze({
    CAMP: 'Barbarian Camp',
    OUTPOST: 'Barbarian Outpost',
    WARCAMP: 'Barbarian Warcamp'
});

export const BARBARIAN_FACTION_CONFIG = Object.freeze({
    INITIAL_CAMP_MIN: 1,
    INITIAL_CAMP_MAX: 3,
    MAX_CAMPS: 5,
    MAX_OUTPOSTS: 8,
    MAX_WARCAMPS: 3,
    CAMP_SPAWN_INTERVAL_DAYS: 12,
    CAMP_SPAWN_CHANCE: 0.35,
    OUTPOST_SPREAD_CHANCE: 0.12,
    WARCAMP_SPREAD_CHANCE: 0.06,
    MAP_EDGE_PADDING_PX: 100,
    ISOLATED_DISTANCE_PX: 340,
    COLLISION_DISTANCE_PX: 80,
    SPAWN_MIN_DISTANCE_PX: 90,
    SPAWN_MAX_DISTANCE_PX: 240,
    WARCAMP_MIN_DISTANCE_PX: 130,
    WARCAMP_MAX_DISTANCE_PX: 280,
    PLACEMENT_ATTEMPTS: 60
});

export const BARBARIAN_NAMES = Object.freeze([
    "Ashen Moot",
    "Red Banner Camp",
    "Ironroot Enclave",
    "Frostbite Hold",
    "Spearfall",
    "Storm Cairn",
    "Blood Oath Camp",
    "Broken Banner",
    "Skullroad",
    "Charred Palisade",
    "Rimewatch",
    "Ember-Marked Camp"
]);
