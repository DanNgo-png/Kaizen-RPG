import {
    BUILDING_MATERIAL_SPECIALIZATIONS,
    normalizeSpecializations
} from "../../data/GameDataConstants.mjs";

const DEFAULT_MAP_BOUNDS = Object.freeze({
    minX: 0,
    minY: 0,
    width: 2000,
    height: 1500
});

const LOCATION_BANDS = Object.freeze({
    WEST_MAX_RATIO: 0.38,
    EAST_MIN_RATIO: 0.62,
    NORTH_MAX_RATIO: 0.34,
    SOUTH_MIN_RATIO: 0.66,
    CENTRAL_MIN_RATIO: 0.30,
    CENTRAL_MAX_RATIO: 0.70
});

const SPECIALIZATION_COUNT_CHANCE = Object.freeze({
    SECOND: 0.38,
    THIRD: 0.16
});

const SPECIALIZATION_CAP_BY_TYPE = Object.freeze({
    Hamlet: 2,
    Village: 2,
    Town: 2,
    City: 3,
    "City-State": 3,
    Province: 3,
    Kingdom: 3,
    "High Kingdom": 3,
    Empire: 3,
    Stronghold: 3
});

const DEFAULT_SPECIALIZATION_CAP = 2;
const FOUNDATIONAL_SPECIALIZATION = "Weavers";

const NON_SPECIALIZED_NODE_TYPES = Object.freeze([
    "Ruins",
    "Bandit Camp",
    "Bandit Outpost",
    "Bandit Stronghold",
    "Stolen Stronghold",
    "Barbarian Camp",
    "Barbarian Outpost",
    "Barbarian Warcamp",
    "Goblin Camp",
    "Goblin Outpost",
    "Greenskin Stronghold"
]);

const BUILDING_MATERIAL_SPECIALIZATION_BY_ITEM = Object.freeze({
    quality_wood: "Lumber Camp",
    peat_bricks: "Peat Pit",
    copper_ingots: "Copper Mine"
});

const NAME_KEYWORD_RULES = Object.freeze([
    { specialization: "Lumber Camp", keywords: ["oak", "pine", "wood", "blackwood", "forest", "timber"] },
    { specialization: "Peat Pit", keywords: ["mire", "fen", "moor", "mud", "silt", "swamp", "bog"] },
    { specialization: "Copper Mine", keywords: ["copper", "iron", "stone", "crag", "mount", "high", "ridge"] },
    { specialization: "Salt Mine", keywords: ["salt", "harbor", "deepwater", "oar", "whale", "ferry"] },
    { specialization: "Amber Collector", keywords: ["amber", "vault", "reach"] },
    { specialization: "Gem Mine", keywords: ["gem", "onyx", "silver", "crystal"] },
    { specialization: "Silk Weaver", keywords: ["silk", "garden"] },
    { specialization: "Dye Maker", keywords: ["dye", "bright", "red"] }
]);

export class SettlementSpecializationPlanner {
    static canHaveSpecializations(node) {
        if (!node) return false;
        if (node.is_hostile === 1) return false;
        return !NON_SPECIALIZED_NODE_TYPES.includes(node.type);
    }

    static pickInitialSpecializations(node, rng, { poorChance = 0, map = DEFAULT_MAP_BOUNDS } = {}) {
        if (!this.canHaveSpecializations(node)) return [];
        if (poorChance > 0 && rng.next() < poorChance) return [];

        const eligible = rng.shuffle(this.getEligibleSpecializations(node, map));
        const count = this._pickSpecializationCount(node, eligible.length, rng);

        return eligible.slice(0, count);
    }

    static getEligibleSpecializations(node, map = DEFAULT_MAP_BOUNDS) {
        if (!this.canHaveSpecializations(node)) return [];

        const location = this._getLocation(node, map);
        const specializations = [];
        const add = (specialization) => {
            if (!specializations.includes(specialization)) specializations.push(specialization);
        };

        NAME_KEYWORD_RULES
            .filter((rule) => this._nodeNameHasKeyword(node, rule.keywords))
            .forEach((rule) => add(rule.specialization));

        if (location.isWest) {
            add("Lumber Camp");
            add("Hunters");
            add("Amber Collector");
        }

        if (location.isNorth) {
            add("Copper Mine");
            add("Furs");
            add("Gem Mine");
        }

        if (location.isSouth) {
            add("Spice Farm");
            add("Incense Gatherer");
            add("Vineyard");
        }

        if (location.isEast) {
            add("Salt Mine");
            add("Silk Weaver");
            add("Copper Mine");
        }

        if (location.isWetland) {
            add("Peat Pit");
            add("Dye Maker");
        }

        if (location.isCentral) {
            add("Weavers");
            add("Vineyard");
            add("Lumber Camp");
        }

        if (specializations.length === 0) {
            add(FOUNDATIONAL_SPECIALIZATION);
        }

        return specializations;
    }

    static chooseBuildableSpecialization(node, materialItemId, existingSpecializations = [], options = {}) {
        const current = new Set(normalizeSpecializations(existingSpecializations));
        const eligible = this.getEligibleSpecializations(node, options.map)
            .filter((specialization) => !current.has(specialization));

        const preferred = BUILDING_MATERIAL_SPECIALIZATION_BY_ITEM[materialItemId];
        if (preferred && eligible.includes(preferred)) return preferred;

        const localBuildingMaterial = eligible.find((specialization) => (
            BUILDING_MATERIAL_SPECIALIZATIONS.includes(specialization)
        ));
        if (localBuildingMaterial) return localBuildingMaterial;

        return eligible[0] ?? null;
    }

    static getEligibleBuildingMaterialSpecializations(node, map = DEFAULT_MAP_BOUNDS) {
        return this.getEligibleSpecializations(node, map)
            .filter((specialization) => BUILDING_MATERIAL_SPECIALIZATIONS.includes(specialization));
    }

    static ensureWorldHasBuildingMaterialSettlement(repo, rng, { map = DEFAULT_MAP_BOUNDS } = {}) {
        const nodes = repo.getWorldNodes().filter((node) => this.canHaveSpecializations(node));
        const hasBuildingMaterials = nodes.some((node) => (
            normalizeSpecializations(node.specializations ?? node.specialization)
                .some((specialization) => BUILDING_MATERIAL_SPECIALIZATIONS.includes(specialization))
        ));

        if (hasBuildingMaterials || nodes.length === 0) return null;

        const shuffledNodes = rng.shuffle(nodes);
        const localCandidates = shuffledNodes.filter((node) => (
            this.getEligibleBuildingMaterialSpecializations(node, map).length > 0
        ));
        const targetNode = rng.pick(localCandidates.length > 0 ? localCandidates : shuffledNodes);
        if (!targetNode) return null;

        const supplyOptions = this.getEligibleBuildingMaterialSpecializations(targetNode, map);
        const fallbackOptions = supplyOptions.length > 0
            ? supplyOptions
            : BUILDING_MATERIAL_SPECIALIZATIONS;
        const newSpecialization = rng.pick(fallbackOptions);
        const nextSpecializations = [
            ...normalizeSpecializations(targetNode.specializations ?? targetNode.specialization),
            newSpecialization
        ];

        repo.updateNodeSpecialization(targetNode.id, nextSpecializations);

        return {
            nodeId: targetNode.id,
            specialization: newSpecialization
        };
    }

    static _pickSpecializationCount(node, eligibleCount, rng) {
        const cap = Math.min(
            SPECIALIZATION_CAP_BY_TYPE[node.type] ?? DEFAULT_SPECIALIZATION_CAP,
            eligibleCount
        );

        if (cap <= 1) return cap;

        let count = 1;
        if (rng.next() < SPECIALIZATION_COUNT_CHANCE.SECOND) count = 2;
        if (cap > 2 && rng.next() < SPECIALIZATION_COUNT_CHANCE.THIRD) count = 3;

        return Math.min(count, cap);
    }

    static _getLocation(node, map) {
        const bounds = this._getMapBounds(map);
        const xRatio = this._ratio(node.x, bounds.minX, bounds.width);
        const yRatio = this._ratio(node.y, bounds.minY, bounds.height);
        const isWest = xRatio <= LOCATION_BANDS.WEST_MAX_RATIO;
        const isEast = xRatio >= LOCATION_BANDS.EAST_MIN_RATIO;
        const isNorth = yRatio <= LOCATION_BANDS.NORTH_MAX_RATIO;
        const isSouth = yRatio >= LOCATION_BANDS.SOUTH_MIN_RATIO;

        return {
            isWest,
            isEast,
            isNorth,
            isSouth,
            isWetland: isWest && isSouth,
            isCentral:
                xRatio >= LOCATION_BANDS.CENTRAL_MIN_RATIO
                && xRatio <= LOCATION_BANDS.CENTRAL_MAX_RATIO
                && yRatio >= LOCATION_BANDS.CENTRAL_MIN_RATIO
                && yRatio <= LOCATION_BANDS.CENTRAL_MAX_RATIO
        };
    }

    static _getMapBounds(map = DEFAULT_MAP_BOUNDS) {
        return {
            minX: map.minX ?? map.MAP_MIN_X ?? DEFAULT_MAP_BOUNDS.minX,
            minY: map.minY ?? map.MAP_MIN_Y ?? DEFAULT_MAP_BOUNDS.minY,
            width: map.width ?? map.MAP_WIDTH ?? DEFAULT_MAP_BOUNDS.width,
            height: map.height ?? map.MAP_HEIGHT ?? DEFAULT_MAP_BOUNDS.height
        };
    }

    static _ratio(value, min, span) {
        const numericValue = Number(value);
        const numericMin = Number(min);
        const numericSpan = Number(span);
        if (!Number.isFinite(numericValue) || !Number.isFinite(numericSpan) || numericSpan <= 0) {
            return 0;
        }

        return Math.min(Math.max((numericValue - numericMin) / numericSpan, 0), 1);
    }

    static _nodeNameHasKeyword(node, keywords) {
        const name = String(node?.name ?? "").toLowerCase();
        return keywords.some((keyword) => name.includes(keyword));
    }
}
