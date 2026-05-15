export const WORLD_RANDOM_CONFIG = Object.freeze({
    HASH_MULTIPLIER: 31,
    LCG_MULTIPLIER: 1664525,
    LCG_INCREMENT: 1013904223,
    LCG_MODULUS: 4294967296,
    FALLBACK_SEED: 1
});

export class RNG {
    constructor(seedText) {
        this.state = this._seedToNumber(seedText);
    }

    next() {
        this.state = (Math.imul(this.state, WORLD_RANDOM_CONFIG.LCG_MULTIPLIER) + WORLD_RANDOM_CONFIG.LCG_INCREMENT) >>> 0;
        return this.state / WORLD_RANDOM_CONFIG.LCG_MODULUS;
    }

    randomInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick(items) {
        if (!items.length) return null;
        return items[this.randomInt(0, items.length - 1)];
    }

    shuffle(items) {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    _seedToNumber(seed) {
        const seedText = String(seed ?? WORLD_RANDOM_CONFIG.FALLBACK_SEED);
        let hash = 0;
        for (let i = 0; i < seedText.length; i++) {
            hash = (Math.imul(hash, WORLD_RANDOM_CONFIG.HASH_MULTIPLIER) + seedText.charCodeAt(i)) >>> 0;
        }
        return hash || WORLD_RANDOM_CONFIG.FALLBACK_SEED;
    }
}