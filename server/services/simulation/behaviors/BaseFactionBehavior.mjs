export class BaseFactionBehavior {
    constructor(repo) { this.repo = repo; }
    
    // Abstract Methods
    setupFactions(rng, context) { return []; }
    generateNodes(rng, context) { return []; }
    processDayEnd(currentDay) {}
    
    // Utilities
    distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
}