import { BARBARIAN_NODE_TYPES } from '../../../../data/factions/BarbarianFactions.mjs';

export const NEGATIVE_ECONOMIC_EVENTS = Object.freeze([
    'ambushed_trade_routes',
    'raided',
    'sieged',
    'ruined_location',
    'terrified_villagers'
]);

export const NEGATIVE_EVENT_DECAY_REDUCTION = 3;
export const NEGATIVE_EVENT_REMEDY_BONUS_REP = 8;
export const NEGATIVE_EVENT_REMEDY_BONUS_INF = 5;

export const WORLD_NODE_SELECT = `
    SELECT 
        world_nodes.*,
        factions.name AS faction_name,
        factions.color AS faction_color,
        factions.archetype AS faction_archetype,
        factions.motto AS faction_motto
    FROM world_nodes
    LEFT JOIN factions ON factions.id = world_nodes.faction_id
`;

export const CONTRACT_SELECT = `
    SELECT
        contracts.*,
        target_nodes.name AS target_node_name,
        target_nodes.type AS target_node_type
    FROM contracts
    LEFT JOIN world_nodes AS target_nodes ON target_nodes.id = contracts.target_node_id
`;

export const CONTRACT_TYPE = Object.freeze({
    STANDARD: 'standard',
    CARAVAN: 'caravan',
    BRIGAND_CAMP: 'brigand_camp',
    HOSTILE_CAMP: 'hostile_camp',
    DIRECT_CLEARING: 'direct_clearing'
});

export const CONTRACT_REPUTATION = Object.freeze({
    MIN_REWARD: 2,
    MINUTES_PER_POINT: 10,
    AMBUSHED_TRADE_ROUTE_CARAVAN_BONUS: 5
});

export const RENOWN_REWARD = Object.freeze({
    MIN_REWARD: 1,
    MINUTES_PER_POINT: 30,
    HOSTILE_CAMP_BONUS: 2,
    DIRECT_CLEARING_BONUS: 1,
    UNDEAD_DEFENSE_BONUS: 3,
    NECROMANCER_HUNT_BONUS: 5
});

export const INFLUENCE_REWARD = Object.freeze({
    MIN_REWARD: 1,
    MINUTES_PER_POINT: 20,
    CARAVAN_BONUS: 1,
    HOSTILE_CAMP_BONUS: 2,
    DIRECT_CLEARING_BONUS: 1,
    UNDEAD_DEFENSE_BONUS: 4,
    NECROMANCER_HUNT_BONUS: 6
});

export const CONTRACT_INFLUENCE_TERMS = Object.freeze([
    Object.freeze({
        id: 'better_pay',
        label: 'Better Pay',
        icon: 'fa-coins',
        cost: 4,
        goldMultiplier: 1.25,
        description: 'Increase the crown reward before accepting the job.'
    }),
    Object.freeze({
        id: 'salvage_rights',
        label: 'Salvage Rights',
        icon: 'fa-box-open',
        cost: 6,
        extraArmorPieces: 2,
        description: 'Keep salvaged enemy armor and war gear.'
    }),
    Object.freeze({
        id: 'footmen',
        label: 'Noble Footmen',
        icon: 'fa-people-group',
        cost: 8,
        damageChanceMultiplier: 0.55,
        description: 'Bring local footmen to screen the next battle.'
    }),
    Object.freeze({
        id: 'local_pardon',
        label: 'Local Pardon',
        icon: 'fa-scale-balanced',
        cost: 5,
        reputationGain: 10,
        description: 'Have a local incident forgiven and restore standing.'
    })
]);

export const CONTRACT_INFLUENCE_TERM_BY_ID = new Map(
    CONTRACT_INFLUENCE_TERMS.map((term) => [term.id, term])
);

export const COMBAT_NEGOTIATION_TERM_IDS = Object.freeze(['salvage_rights', 'footmen']);

export const CONTRACT_GENERATION = Object.freeze({
    BOARD_SIZE: 3,
    DEFAULT_MIN_MINUTES: 10,
    DEFAULT_MAX_MINUTES: 120,
    DEFAULT_GOLD_MULTIPLIER: 1,
    MINUTE_STEP: 5,
    HOSTILE_CAMP_MIN_MINUTES: 45,
    GOLD_PER_MINUTE: 3,
    GOLD_VARIANCE_MIN: 0.8,
    GOLD_VARIANCE_RANGE: 0.4,
    HOSTILE_CAMP_GOLD_MULTIPLIER: 5
});

export const CONTRACT_LOOT = Object.freeze({
    DEFAULT_CHANCE: 0.20,
    COMBAT_CHANCE: 0.65,
    HOSTILE_CAMP_CHANCE: 0.85,
    MIN_ROLLS: 1,
    MINUTES_PER_ROLL: 25,
    HOSTILE_CAMP_EXTRA_ROLLS: 2
});

export const CONTRACT_EVENT_DURATION = Object.freeze({
    WELL_SUPPLIED_DAYS: 5
});

export const DIRECT_CLEARING = Object.freeze({
    GOLD_REWARD: 0
});

export const CONTRACT_SESSION_RISK = Object.freeze({
    BASE_DAMAGE_CHANCE: 0.20,
    DAMAGE_ROLL_RANGE: 8,
    MIN_DAMAGE: 2,
    DEFENSE_MITIGATION_DIVISOR: 4,
    FATIGUE_MINUTES_PER_POINT: 5,
    FATIGUE_GEAR_DIVISOR: 2,
    TRAVELERS_ENCOUNTER_CHANCE: 0.30,
    ATTACK_LOOT_SCORE_DIVISOR: 100,
    ATTACK_LOOT_BONUS_RATE: 0.10,
    BASE_LOOT_CHANCE: 0.30,
    MIN_LOOT_ROLLS: 1,
    MINUTES_PER_LOOT_ROLL: 15
});

export const IDLE_SESSION_CONFIG = Object.freeze({
    XP_PER_MINUTE: 3,
    FATIGUE_RECOVERY_PER_MINUTE: 1.0,
    MIN_MINUTES_FOR_LOG: 5
});

export const SESSION_TIMING = Object.freeze({
    MINUTES_PER_DAY: 30,
    XP_PER_MINUTE: 10
});

export const DUNGEON_DELVE_SESSION = Object.freeze({
    GEAR_DURABILITY_LOSS_CHANCE: 0.25,
    BASE_THREAT_PER_MINUTE: 5,
    MIN_DANGER_MULTIPLIER: 0.1,
    BASE_DAMAGE_CHANCE: 0.40,
    MAX_DAMAGE_CHANCE: 0.80,
    TANK_PROTECTION_RATE: 0.10,
    ATTACK_GOLD_SCORE_DIVISOR: 100,
    GOLD_PER_MINUTE: 2.5,
    FATIGUE_MINUTES_PER_POINT: 5,
    FATIGUE_GEAR_DIVISOR: 2,
    NON_TANK_MIN_HIT_CHANCE: 0.05,
    TANK_MAX_HIT_CHANCE: 0.90,
    TANK_HIT_CHANCE_BONUS: 0.15,
    DAMAGE_ROLL_RANGE: 15,
    MIN_DAMAGE: 5,
    DEFENSE_ATTRIBUTE_DIVISOR: 4,
    DEFENSE_GEAR_DIVISOR: 2,
    SEVERE_DAMAGE_THRESHOLD: 10,
    DEPTH_LOOT_BONUS_PER_MINUTE: 0.015,
    ATTACK_LOOT_SCORE_DIVISOR: 100,
    ATTACK_LOOT_BONUS_RATE: 0.1,
    BASE_LOOT_CHANCE: 0.35,
    MIN_LOOT_ROLLS: 1,
    MINUTES_PER_LOOT_ROLL: 5,
    GUARANTEED_LOOT_MIN_MINUTES: 20,
    DEEP_FLOOR_MIN_MINUTES: 45,
    DEEP_FLOOR_LOOT_CHANCE: 0.30
});

export const TIME_PROGRESSION = Object.freeze({
    DAY_INCREMENT: 1
});

export const INVENTORY_DEFAULTS = Object.freeze({
    FIRST_STASH_SLOT: 0,
    FULL_DURABILITY: 100
});

export const WORLD_NODE_DEFAULTS = Object.freeze({
    REPUTATION: 0,
    BUY_MODIFIER: 1.0,
    SELL_MODIFIER: 0.5,
    ATTACHMENTS: 0,
    INFLUENCE: 0
});

export const COLONY_NODE_DEFAULTS = Object.freeze({
    REPUTATION: 0,
    BUY_MODIFIER: 1.2,
    SELL_MODIFIER: 0.85,
    ATTACHMENTS: 0,
    INFLUENCE: 0
});

export const MERCENARY_DEFAULTS = Object.freeze({
    ROLE: 'Recruit',
    LEVEL: 1,
    ATTRIBUTE: 10,
    MAX_HP: 100,
    CURRENT_HP: 100,
    WAGE: 10
});

export const SETTLEMENT_EVENT_ID = Object.freeze({
    AMBUSHED_TRADE_ROUTES: 'ambushed_trade_routes',
    WELL_SUPPLIED: 'well_supplied'
});

export const NON_GROWING_SETTLEMENT_TYPES = Object.freeze([
    'Ruins',
    'Bandit Camp',
    'Bandit Outpost',
    'Bandit Stronghold',
    'Stolen Stronghold',
    'Webknecht Nest',
    'Webknecht Colony',
    'Webknecht Citadel',
    ...Object.values(BARBARIAN_NODE_TYPES),
    'Goblin Camp',
    'Goblin Outpost',
    'Greenskin Stronghold',
    'Desecrated Crypt',
    'Ancient Tomb',
    'Haunted Cave',
    'Sunken Dungeon',
    'Necropolis',
    'Refugee Camp'
]);

export const HOSTILE_CONTRACT_TARGET_TYPES = Object.freeze([
    'Bandit Camp',
    'Bandit Outpost',
    'Bandit Stronghold',
    'Stolen Stronghold',
    'Webknecht Nest',
    'Webknecht Colony',
    'Webknecht Citadel',
    ...Object.values(BARBARIAN_NODE_TYPES),
    'Goblin Camp',
    'Goblin Outpost',
    'Greenskin Stronghold',
    'Desecrated Crypt',
    'Ancient Tomb',
    'Haunted Cave',
    'Sunken Dungeon',
    'Necropolis'
]);

export const GROWTH_PROGRESS_COMPATIBLE_EVENTS = Object.freeze([
    SETTLEMENT_EVENT_ID.WELL_SUPPLIED
]);

export const CARAVAN_CONTRACT_KEYWORDS = Object.freeze(['caravan', 'escort', 'delivery']);
export const HOSTILE_CAMP_CONTRACT_KEYWORDS = Object.freeze([
    'brigand camp',
    'bandit camp',
    'barbarian camp',
    'barbarian outpost',
    'barbarian warcamp',
    'destroy'
]);
export const COMBAT_CONTRACT_KEYWORDS = Object.freeze(['hunt', 'clear', 'explore']);
export const UNDEAD_NODE_TYPES = Object.freeze([
    'Desecrated Crypt',
    'Ancient Tomb',
    'Haunted Cave',
    'Sunken Dungeon',
    'Necropolis'
]);

export const HOSTILE_REPUTATION_THRESHOLD = -50;
export const MIN_GOLD_BALANCE = 0;
export const NO_GOLD_DELTA = 0;

export const PARTY_STRENGTH = Object.freeze({
    DEFAULT_ATTRIBUTE: 10,
    DEFAULT_LEVEL: 1,
    DEFAULT_MAX_HP: 100,
    MIN_MAX_HP: 1,
    LEVEL_WEIGHT: 10,
    FATIGUE_MAX: 100,
    FATIGUE_PENALTY_MAX_RATIO: 0.30,
    HEALTH_PENALTY_MAX_RATIO: 0.35,
    MIN_READINESS_RATIO: 0.20,
    PROGRESS_SCORE_CAP: 600,
    PROGRESS_PERCENT_MAX: 100,
    RATINGS: Object.freeze([
        Object.freeze({ minScore: 450, label: 'Elite' }),
        Object.freeze({ minScore: 300, label: 'Veteran' }),
        Object.freeze({ minScore: 180, label: 'Seasoned' }),
        Object.freeze({ minScore: 80, label: 'Ready' }),
        Object.freeze({ minScore: 1, label: 'Green' }),
        Object.freeze({ minScore: 0, label: 'Unmanned' })
    ])
});

export const STANDARD_CONTRACT_TEMPLATES = Object.freeze([
    Object.freeze({
        title: 'Clear the Rat Cellar',
        description: 'A simple task, but honest pay.'
    }),
    Object.freeze({
        title: 'Hunt the Goblin Raiders',
        description: 'They have been harassing the local trade routes.'
    }),
    Object.freeze({
        title: 'Explore the Ruined Tower',
        description: 'Ancient secrets and hidden dangers await.'
    })
]);

export const CARAVAN_CONTRACT_TITLES = Object.freeze([
    'Escort Merchant Caravan',
    'Guard the Supply Wagons',
    'Delivery Escort'
]);

export const REFUGEE_CONTRACT = Object.freeze({
    DEFENSE_MIN_MINUTES: 30,
    SUPPLY_MIN_MINUTES: 15,
    GUARD_MIN_MINUTES: 20,
    HUMANITARIAN_GOLD_REWARD: 0,
    SUPPLY_TOKEN_PAY_MIN: 5,
    SUPPLY_TOKEN_PAY_RANGE: 15,
    GUARD_TOKEN_PAY_MIN: 10,
    GUARD_TOKEN_PAY_RANGE: 20,
    DEFENSE_REPUTATION_REWARD: 40,
    SUPPORT_REPUTATION_REWARD: 25,
    DEFENSE_INFLUENCE_REWARD: 50,
    SUPPORT_INFLUENCE_REWARD: 30
});

export const UNDEAD_CONTRACT = Object.freeze({
    DEFENSE_MIN_MINUTES: 30,
    PURGE_MIN_MINUTES: 45,
    NECROMANCER_HUNT_MIN_MINUTES: 60,
    DEFENSE_GOLD_MULTIPLIER: 2.0,
    PURGE_GOLD_MULTIPLIER: 1.5,
    NECROMANCER_HUNT_GOLD_MULTIPLIER: 3.0,
    NECROMANCER_MODULUS: 3,
    NECROMANCER_REMAINDER: 0
});

export const RANDOM_SESSION_EVENT = Object.freeze({
    MIN_DURATION_MINS: 5,
    TRIGGER_CHANCE: 0.35,
    CARRIAGE_GOLD_MIN: 50,
    CARRIAGE_GOLD_RANGE: 100,
    CARRIAGE_TOOLS_REWARD: 10,
    DEFAULT_TOOLS: 20,
    PRIEST_HEAL: 15,
    PRIEST_FATIGUE_RECOVERY: 20,
    LOCAL_LEGEND_RENOWN: 5,
    BEAST_DAMAGE_MIN: 5,
    BEAST_DAMAGE_RANGE: 10,
    SCHOLAR_XP: 35
});

export const DAILY_CAMP_UPKEEP = Object.freeze({
    PROVISIONS_CONSUMED_PER_MERC: 2,
    STARVATION_HP_DAMAGE: 15,
    STARVATION_FATIGUE_GAIN: 25,
    BASE_HEAL_MEDS: 25,
    BASE_HEAL_NO_MEDS: 5,
    DEFAULT_ITEM_PROVISIONS: 25,
    FATIGUE_RECOVERY_ACTIVE: -10,
    FATIGUE_RECOVERY_RESTING: 30,
    DEFAULT_PROVISIONS: 50,
    MIN_SLEEP_HP: 1
});

export const RESOURCE_DEFAULTS = Object.freeze({
    GOLD: 0,
    RENOWN: 0,
    PROVISIONS: 50,
    TOOLS: 20,
    AMMO: 100,
    MEDICINE: 15,
    DAY: 1,
    ACCUMULATED_TIME: 0,
    PLAYER_X: 400,
    PLAYER_Y: 300
});

export const COLONY_PLACEMENT = Object.freeze({
    SEARCH_RADIUS: 150,
    MAX_ATTEMPTS: 50,
    MIN_DISTANCE: 80,
    MAP_MIN_X: 50,
    MAP_MAX_X: 1950,
    MAP_MIN_Y: 50,
    MAP_MAX_Y: 1450,
    MIN_NODE_SPACING: 70,
    FALLBACK_NAME_PREFIXES: Object.freeze(['New', 'North', 'South', 'East', 'West'])
});

export const SETTLEMENT_DEVELOPMENT = Object.freeze({
    DEFAULT_MATERIAL_REQUIREMENT: 10,
    CONTRACT_COMPLETION_INCREMENT: 1,
    AUTONOMOUS_PROJECT_EXPIRATION: 999,
    FIRST_MATERIAL_PROGRESS_DIVISOR: 3,
    SECOND_MATERIAL_PROGRESS_NUMERATOR: 2,
    SECOND_MATERIAL_PROGRESS_DIVISOR: 3,
    BUILDING_MATERIAL_SPECIALIZATIONS: Object.freeze([
        'Peat Pit',
        'Lumber Camp',
        'Copper Mine'
    ])
});

export const POPULATION = Object.freeze({
    DEFAULT_TIER: 1,
    MAX_TIER: 5,
    LABELS: Object.freeze({
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High',
        5: 'Overpopulated'
    })
});

export const EXPANSION_POLICY = Object.freeze({
    EXPANDABLE_TYPES: Object.freeze(['City', 'City-State', 'Province', 'Kingdom', 'High Kingdom']),
    MIN_EXPANSION_POP_TIER: 2,
    MIN_REQUIRED_INFLUENCE: 15,
    STABILITY_CRISIS_EVENTS: Object.freeze([
        'sieged',
        'raided',
        'ruined_location',
        'undead_invasion',
        'undead_siege',
        'web_infestation'
    ]),
    HOSTILE_STANDING_LIMIT: 0,
    CROWDING_RADIUS_PX: 300,
    LOCAL_CROWDING_LIMIT: 5,
    HIGH_POPULATION_TIER: 4,
    SURPLUS_INFLUENCE_LIMIT: 30
});

export function contractTitleHasKeyword(title, keywords) {
    const titleLower = String(title ?? '').toLowerCase();
    return keywords.some((keyword) => titleLower.includes(keyword));
}

export function canTrackSettlementGrowth(node, tierData) {
    if (!node || !tierData?.growthReqs) return false;
    if (NON_GROWING_SETTLEMENT_TYPES.includes(node.type)) return false;

    return !node.current_event || GROWTH_PROGRESS_COMPATIBLE_EVENTS.includes(node.current_event);
}
