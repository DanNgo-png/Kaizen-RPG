import { UI_CONFIG } from "../data/GameModeConfig.js";

export function generateRandomSeed(length = UI_CONFIG.SEED_LENGTH) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let seed = '';
    for (let i = 0; i < length; i++) {
        seed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return seed;
}