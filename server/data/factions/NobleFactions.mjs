export const NOBLE_HOUSE_ARCHETYPES = Object.freeze({
    MERCHANT: "merchant",
    MILITARISTIC: "militaristic",
    OLD_BLOOD: "old_blood",
    FRONTIER: "frontier",
    SCHOLARLY: "scholarly"
});

export const NOBLE_HOUSE_LORE_POOL = Object.freeze([
    { name: "House Blackwood", color: "#22c55e", archetype: NOBLE_HOUSE_ARCHETYPES.OLD_BLOOD, motto: "Roots deeper than steel.", seatName: "Blackwood Hold", capitalType: "Stronghold" },
    { name: "House Sterling", color: "#fbbf24", archetype: NOBLE_HOUSE_ARCHETYPES.MERCHANT, motto: "Prosperity binds the realm.", seatName: "Sterlingport", capitalType: "City" },
    { name: "House Veyr", color: "#60a5fa", archetype: NOBLE_HOUSE_ARCHETYPES.SCHOLARLY, motto: "Wisdom before conquest.", seatName: "Veyrspire", capitalType: "City" },
    { name: "House Thornwatch", color: "#ef4444", archetype: NOBLE_HOUSE_ARCHETYPES.MILITARISTIC, motto: "The border does not break.", seatName: "Thornwatch Keep", capitalType: "Stronghold" },
    { name: "House Emberfall", color: "#f97316", archetype: NOBLE_HOUSE_ARCHETYPES.FRONTIER, motto: "From ash, dominion.", seatName: "Emberfall", capitalType: "City" },
    { name: "House Silverpine", color: "#a78bfa", archetype: NOBLE_HOUSE_ARCHETYPES.OLD_BLOOD, motto: "Grace endures the winter.", seatName: "Silverpine Court", capitalType: "City" },
    { name: "House Ironvale", color: "#94a3b8", archetype: NOBLE_HOUSE_ARCHETYPES.MILITARISTIC, motto: "Iron answers all.", seatName: "Ironvale Bastion", capitalType: "Stronghold" },
    { name: "House Mirecrest", color: "#14b8a6", archetype: NOBLE_HOUSE_ARCHETYPES.MERCHANT, motto: "Every road pays its due.", seatName: "Mirecrest", capitalType: "City" }
]);

export const WORLD_GENERATION_CONFIG = Object.freeze({
    NODE_COUNT: 15,
    MIN_HOUSES: 2,
    MAX_HOUSES: 4,
    MAP_MIN_X: 0,
    MAP_MIN_Y: 0,
    MAP_WIDTH: 2000,
    MAP_HEIGHT: 1500,
    CAPITAL_EDGE_PADDING: 180,
    CAPITAL_MIN_DISTANCE: 420,
    CAPITAL_PLACEMENT_ATTEMPTS: 80,
    POOR_SPECIALIZATION_CHANCE: 0.3
});

export const WORLD_NODE_TYPE_WEIGHTS = Object.freeze([
    "Hamlet", "Hamlet", "Hamlet", "Hamlet",
    "Village", "Village", "Village",
    "Town", "Town",
    "Ruins", "Ruins"
]);