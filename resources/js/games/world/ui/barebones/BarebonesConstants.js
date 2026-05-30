export const BAREBONES_TABS = Object.freeze({
    JOBS: "jobs",
    MARKET: "market",
    HIRE: "hire"
});

export const BAREBONES_UI = Object.freeze({
    DEFAULT_RESOURCE_VALUE: 0,
    DEFAULT_MARKET_MODIFIER: 1,
    MARKET_QUANTITY_THRESHOLD: 1,
    PROGRESS_PERCENT_MAX: 100,
    TOOLTIP_OFFSET_PX: 15,
    MAX_DEVELOPMENT_PROGRESS: 5
});

export const RESOURCE_TOOLTIP = Object.freeze({
    INFINITY_HTML: "&infin;",
    PROVISIONS_PER_PERSON_PER_DAY: 2,
    REPAIR_CONDITION_PER_TOOL: 15,
    TOOL_CAPACITY: 200,
    AMMO_CAPACITY: 500,
    MEDICINE_CAPACITY: 150
});

export const DEFAULT_NODE_ICON = "fa-campground";

export const NODE_TYPE_ICONS = Object.freeze({
    Town: "fa-house-chimney",
    City: "fa-house-chimney",
    "City-State": "fa-city",
    Province: "fa-city",
    Kingdom: "fa-chess-rook",
    "High Kingdom": "fa-chess-rook",
    Empire: "fa-chess-king",
    Stronghold: "fa-shield-halved",
    "Stolen Stronghold": "fa-tower-observation",
    "Bandit Stronghold": "fa-tower-observation",
    "Bandit Outpost": "fa-tent",
    "Barbarian Camp": "fa-campground",
    "Barbarian Outpost": "fa-tent",
    "Barbarian Warcamp": "fa-tower-observation",
    Ruins: "fa-skull",
    "Bandit Camp": "fa-campground",
    "Goblin Camp": "fa-campground",
    "Goblin Outpost": "fa-tent",
    "Greenskin Stronghold": "fa-tower-observation",
    'Desecrated Crypt': "fa-ghost",
    'Ancient Tomb': "fa-monument",
    'Haunted Cave': "fa-mountain",
    'Sunken Dungeon': "fa-dungeon",
    'Necropolis': "fa-skull-crossbones"
});

export const CHRONICLE_EVENT_META = Object.freeze({
    world: {
        className: "world",
        icon: "fa-earth-americas"
    },
    player: {
        className: "player",
        icon: "fa-user-shield"
    },
    mechanic: {
        className: "mechanic",
        icon: "fa-triangle-exclamation"
    }
});

export const HIRE_CONFIG = Object.freeze({
    ROSTER_LIMIT: 12,
    DEFAULT_NODE_TYPE: "Town",
    DEFAULT_BUY_MODIFIER: 1,
    DEFAULT_CANDIDATE_COUNT: 4,
    EXTRA_CANDIDATE_MIN: 0,
    EXTRA_CANDIDATE_MAX: 1,
    EXTRA_LEVEL_CHANCE: 0.82,
    EXTRA_LEVEL_BONUS: 1,
    NO_LEVEL_BONUS: 0,
    STAT_VARIANCE_MIN: -2,
    STAT_VARIANCE_MAX: 4,
    STAT_MIN: 4,
    STAT_MAX: 22,
    MIN_DAILY_WAGE: 5,
    WAGE_LEVEL_WEIGHT: 4,
    WAGE_DIVISOR: 2,
    MIN_HIRE_COST: 50,
    COST_STAT_WEIGHT: 5,
    COST_LEVEL_WEIGHT: 35,
    TRAIT_COUNT: 2,
    DEFAULT_HIT_POINTS: 100,
    DEFAULT_FATIGUE: 0,
    DEFAULT_ICON: "fa-user-shield"
});

export const HIRE_RANDOM = Object.freeze({
    HASH_LEFT_SHIFT_BITS: 5,
    FALLBACK_SEED: 1,
    LCG_MODULUS: 2147483647,
    LCG_MULTIPLIER: 16807,
    LCG_STATE_OFFSET: 2147483646,
    LCG_NORMALIZER: 2147483646
});

export const HIRE_BASE_COUNTS_BY_NODE_TYPE = Object.freeze({
    Town: 4,
    City: 6,
    "City-State": 6,
    Province: 5,
    Kingdom: 6,
    "High Kingdom": 7,
    Empire: 7,
    Stronghold: 5,
    Ruins: 2
});

export const HIRE_BACKGROUNDS = Object.freeze([
    {
        role: "Squire",
        icon: "fa-user",
        baseCost: 70,
        level: 1,
        statBase: { str: 8, int: 7, spd: 8 },
        tags: ["Eager", "Trainable", "Cheap wage"],
        rumor: "Green, affordable, and looking for a first real company."
    },
    {
        role: "Vanguard",
        icon: "fa-shield-halved",
        baseCost: 120,
        level: 1,
        statBase: { str: 11, int: 7, spd: 8 },
        tags: ["Stout", "Front line", "Reliable"],
        rumor: "Used to standing firm when the line gets ugly."
    },
    {
        role: "Skirmisher",
        icon: "fa-person-running",
        baseCost: 115,
        level: 1,
        statBase: { str: 8, int: 8, spd: 12 },
        tags: ["Quick", "Light footed", "Scout"],
        rumor: "Fast enough to get into trouble and sometimes back out again."
    },
    {
        role: "Quartermaster",
        icon: "fa-scroll",
        baseCost: 135,
        level: 1,
        statBase: { str: 7, int: 13, spd: 7 },
        tags: ["Logistics", "Measured", "Camp mind"],
        rumor: "Keeps ledgers, counts food, and notices bad deals."
    },
    {
        role: "Raider",
        icon: "fa-gavel",
        baseCost: 150,
        level: 1,
        statBase: { str: 12, int: 6, spd: 10 },
        tags: ["Aggressive", "Loot minded", "Rough"],
        rumor: "The kind of blade that asks about loot before danger."
    },
    {
        role: "Sellsword",
        icon: "fa-user-shield",
        baseCost: 190,
        level: 2,
        statBase: { str: 12, int: 9, spd: 10 },
        tags: ["Professional", "Veteran", "Costly"],
        rumor: "A practical fighter with a practical price."
    },
    {
        role: "Swordmaster",
        icon: "fa-khanda",
        baseCost: 320,
        level: 2,
        statBase: { str: 13, int: 10, spd: 13 },
        tags: ["Duelist", "Precise", "Expensive"],
        rumor: "Carries themself like steel is a language."
    },
    {
        role: "Hedge Knight",
        icon: "fa-chess-rook",
        baseCost: 380,
        level: 3,
        statBase: { str: 16, int: 8, spd: 9 },
        tags: ["Battle hardened", "Heavy wage", "Brave"],
        rumor: "Big armor, bigger appetite, and no fear of dark halls."
    }
]);

export function createDefaultMarketData() {
    return {
        inventory: [],
        shopItems: [],
        gold: BAREBONES_UI.DEFAULT_RESOURCE_VALUE
    };
}

export function createDefaultPartyData() {
    return {
        mercenaries: [],
        resources: {
            gold: BAREBONES_UI.DEFAULT_RESOURCE_VALUE,
            renown: BAREBONES_UI.DEFAULT_RESOURCE_VALUE
        }
    };
}

export function getReputationString(repValue) {
    if (repValue <= -50) return "Hostile";
    if (repValue <= -10) return "Wary";
    if (repValue <= 9) return "Stranger";
    if (repValue <= 50) return "Neutral";
    if (repValue <= 150) return "Friendly";
    if (repValue <= 300) return "Ally";
    return "Kindred";
}

export function getReputationColor(repValue) {
    if (repValue <= -50) return "#ef4444"; // Red
    if (repValue <= -10) return "#f97316"; // Orange
    if (repValue <= 9) return "#9ca3af";  // Gray
    if (repValue <= 50) return "#fbbf24"; // Yellow
    if (repValue <= 150) return "#34d399"; // Light Green
    if (repValue <= 300) return "#10b981"; // Green
    return "#059669"; // Dark Green
}
