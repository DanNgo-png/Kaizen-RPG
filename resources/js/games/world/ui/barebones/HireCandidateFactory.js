import {
    HIRE_BACKGROUNDS,
    HIRE_BASE_COUNTS_BY_NODE_TYPE,
    HIRE_CONFIG,
    HIRE_RANDOM
} from "./BarebonesConstants.js";
import { NAMES } from "../../../party/Names.js";
import { ROLES } from "../../../party/Roles.js";

export class HireCandidateFactory {
    constructor({
        names = NAMES,
        roles = ROLES,
        backgrounds = HIRE_BACKGROUNDS,
        config = HIRE_CONFIG
    } = {}) {
        this.names = names;
        this.roles = roles;
        this.backgrounds = backgrounds;
        this.config = config;
        this.candidatesByNode = new Map();
    }

    getCandidatesForNode(node) {
        if (!node) return [];

        const nodeKey = String(node.id);
        if (!this.candidatesByNode.has(nodeKey)) {
            this.candidatesByNode.set(nodeKey, this._generateCandidates(node));
        }

        return this.candidatesByNode.get(nodeKey);
    }

    removeCandidate(nodeId, candidateId) {
        const nodeKey = String(nodeId);
        const candidates = this.candidatesByNode.get(nodeKey) || [];
        this.candidatesByNode.set(
            nodeKey,
            candidates.filter((candidate) => candidate.id !== candidateId)
        );
    }

    _generateCandidates(node) {
        const seed = this._hashString(`${node.id}-${node.name}-${node.type}`);
        const rand = this._createSeededRandom(seed);
        const type = node.type || this.config.DEFAULT_NODE_TYPE;
        const baseCount = HIRE_BASE_COUNTS_BY_NODE_TYPE[type] || this.config.DEFAULT_CANDIDATE_COUNT;
        const count = baseCount + this._roll(rand, this.config.EXTRA_CANDIDATE_MIN, this.config.EXTRA_CANDIDATE_MAX);
        const buyModifier = Number(node.buy_modifier) || this.config.DEFAULT_BUY_MODIFIER;
        const candidates = [];

        for (let index = 0; index < count; index++) {
            candidates.push(this._createCandidate(node, index, rand, buyModifier));
        }

        return candidates.sort((a, b) => a.cost - b.cost);
    }

    _createCandidate(node, index, rand, buyModifier) {
        const background = this._pick(this.backgrounds, rand);
        const name = this._pick(this.names, rand);
        const role = background.role || this._pick(this.roles, rand);
        const level = background.level + this._rollBonusLevel(rand);
        const stats = this._rollStats(background.statBase, rand);
        const statSum = stats.str + stats.int + stats.spd;
        const wage = Math.max(
            this.config.MIN_DAILY_WAGE,
            Math.floor((statSum + (level * this.config.WAGE_LEVEL_WEIGHT)) / this.config.WAGE_DIVISOR)
        );
        const cost = Math.max(
            this.config.MIN_HIRE_COST,
            Math.round((background.baseCost + (statSum * this.config.COST_STAT_WEIGHT) + (level * this.config.COST_LEVEL_WEIGHT)) * buyModifier)
        );

        return {
            id: `${node.id}-${index}-${name}-${role}`,
            name,
            role,
            level,
            ...stats,
            wage,
            cost,
            icon: background.icon || this.config.DEFAULT_ICON,
            rumor: background.rumor,
            traits: this._pickTraits(background.tags, rand),
            current_hp: this.config.DEFAULT_HIT_POINTS,
            max_hp: this.config.DEFAULT_HIT_POINTS,
            fatigue: this.config.DEFAULT_FATIGUE
        };
    }

    _rollBonusLevel(rand) {
        return rand() > this.config.EXTRA_LEVEL_CHANCE
            ? this.config.EXTRA_LEVEL_BONUS
            : this.config.NO_LEVEL_BONUS;
    }

    _rollStats(statBase, rand) {
        return {
            str: this._clamp(
                statBase.str + this._roll(rand, this.config.STAT_VARIANCE_MIN, this.config.STAT_VARIANCE_MAX),
                this.config.STAT_MIN,
                this.config.STAT_MAX
            ),
            int: this._clamp(
                statBase.int + this._roll(rand, this.config.STAT_VARIANCE_MIN, this.config.STAT_VARIANCE_MAX),
                this.config.STAT_MIN,
                this.config.STAT_MAX
            ),
            spd: this._clamp(
                statBase.spd + this._roll(rand, this.config.STAT_VARIANCE_MIN, this.config.STAT_VARIANCE_MAX),
                this.config.STAT_MIN,
                this.config.STAT_MAX
            )
        };
    }

    _pickTraits(tags, rand) {
        return this._shuffle([...tags], rand).slice(0, this.config.TRAIT_COUNT);
    }

    _shuffle(list, rand) {
        for (let index = list.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(rand() * (index + 1));
            [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
        }

        return list;
    }

    _hashString(value) {
        let hash = 0;
        const text = String(value);

        for (let index = 0; index < text.length; index++) {
            hash = ((hash << HIRE_RANDOM.HASH_LEFT_SHIFT_BITS) - hash) + text.charCodeAt(index);
            hash |= 0;
        }

        return Math.abs(hash) || HIRE_RANDOM.FALLBACK_SEED;
    }

    _createSeededRandom(seed) {
        let state = seed % HIRE_RANDOM.LCG_MODULUS;
        if (state <= 0) state += HIRE_RANDOM.LCG_STATE_OFFSET;

        return () => {
            state = (state * HIRE_RANDOM.LCG_MULTIPLIER) % HIRE_RANDOM.LCG_MODULUS;
            return (state - 1) / HIRE_RANDOM.LCG_NORMALIZER;
        };
    }

    _pick(list, rand) {
        return list[Math.floor(rand() * list.length)];
    }

    _roll(rand, min, max) {
        return min + Math.floor(rand() * (max - min + 1));
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}
