class EnemyFactoryClass {
    constructor() {
        this.templates = new Map();
        this.isInitialized = false;
        this.ready = this._initialize();
    }

    /**
     * Dynamically auto-discovers and registers all enemy template files.
     * Runs in the background on import and works in both dev (ESM) and prod (Webpack).
     */
    async _initialize() {
        if (this.isInitialized) return;

        const templates = [];

        if (typeof require !== 'undefined' && require.context) {
            try {
                const context = require.context('../data/enemies', false, /\.mjs$/);
                context.keys().forEach((key) => {
                    const module = context(key);
                    for (const exportKey in module) {
                        const val = module[exportKey];
                        if (Array.isArray(val)) {
                            templates.push(...val);
                        }
                    }
                });
            } catch (error) {
                console.error("❌ Failed to load enemy templates via Webpack require.context:", error);
            }
        } else {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const { fileURLToPath, pathToFileURL } = await import('url');

                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                const enemiesDir = path.resolve(__dirname, '../data/enemies');

                if (fs.existsSync(enemiesDir)) {
                    const files = fs.readdirSync(enemiesDir).filter(file => file.endsWith('.mjs'));
                    for (const file of files) {
                        const filePath = path.join(enemiesDir, file);
                        const fileUrl = pathToFileURL(filePath).href;

                        const module = await import(/* webpackIgnore: true */ fileUrl);
                        
                        for (const exportKey in module) {
                            const val = module[exportKey];
                            if (Array.isArray(val)) {
                                templates.push(...val);
                            }
                        }
                    }
                } else {
                    console.error(`❌ Enemies directory not found at: ${enemiesDir}`);
                }
            } catch (error) {
                console.error("❌ Failed to load enemy templates via Node.js fs/import:", error);
            }
        }

        this._registerTemplates(templates);
        this.isInitialized = true;
        console.log(`⚔️ EnemyFactory: Auto-registered ${this.templates.size} enemy templates.`);
    }

    _registerTemplates(enemies) {
        enemies.forEach(enemy => this.templates.set(enemy.id, enemy));
    }

    /**
     * Factory Method: Creates an enemy scaled to the party's level
     */
    createEnemy(id, levelMultiplier = 1.0) {
        const template = this.templates.get(id);
        if (!template) {
            throw new Error(`Enemy ${id} not found. Factory initialization status: ${this.isInitialized}`);
        }

        return {
            id: template.id,
            name: template.name,
            faction: template.faction,
            hp: Math.floor(template.baseHp * levelMultiplier),
            maxHp: Math.floor(template.baseHp * levelMultiplier),
            atk: Math.floor(template.baseAtk * levelMultiplier),
            def: Math.floor(template.baseDef * levelMultiplier),
            xpReward: Math.floor(template.xpReward * levelMultiplier),
            lootTable: template.lootTable
        };
    }

    /**
     * Generates a random encounter group based on faction
     */
    generateEncounterGroup(faction, difficultyLevel, count) {
        const factionEnemies = Array.from(this.templates.values()).filter(e => e.faction === faction);
        if (factionEnemies.length === 0) {
            throw new Error(`No enemies found for faction: ${faction}`);
        }
        const group = [];
        
        for (let i = 0; i < count; i++) {
            const randomTemplate = factionEnemies[Math.floor(Math.random() * factionEnemies.length)];
            group.push(this.createEnemy(randomTemplate.id, difficultyLevel));
        }
        
        return group;
    }
}

export const EnemyFactory = new EnemyFactoryClass();