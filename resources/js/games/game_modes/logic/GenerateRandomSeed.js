export function generateRandomSeed(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let seed = '';
    for (let i = 0; i < length; i++) {
        seed += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return seed;
}