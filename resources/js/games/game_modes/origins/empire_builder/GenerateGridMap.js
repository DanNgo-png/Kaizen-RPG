export function GenerateGridMap(width, height) {
    const tiles = [];
    for (let i = 0; i < width * height; i++) {
        // Simple mock generation
        tiles.push({
            id: i,
            type: 'forest',
            isFog: Math.random() > 0.3 // 30% visible
        });
    }
    return tiles;
}