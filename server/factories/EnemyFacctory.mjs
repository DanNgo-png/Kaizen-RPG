import { GREENSKINS } from '../data/enemies/Greenskins.mjs';
import { UNDEAD } from '../data/enemies/Undead.mjs';
import { BRIGANDS } from '../data/enemies/Brigands.mjs';
import { BARBARIANS } from '../data/enemies/Barbarians.mjs';

class EnemyFactoryClass {
    constructor() {
        this.templates = new Map();
        this._registerTemplates([...GREENSKINS, ...UNDEAD, ...BRIGANDS, ...BARBARIANS]);
    }

    _registerTemplates(enemies) {
        enemies.forEach(enemy => this.templates.set(enemy.id, enemy));
    }

    /**
     * Factory Method: Creates an enemy scaled to the party's level
     */
    createEnemy(id, levelMultiplier = 1.0) {
        const template = this.templates.get(id);
        if (!template) throw new Error(`Enemy ${id} not found.`);

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
        const group = [];
        
        for (let i = 0; i < count; i++) {
            const randomTemplate = factionEnemies[Math.floor(Math.random() * factionEnemies.length)];
            group.push(this.createEnemy(randomTemplate.id, difficultyLevel));
        }
        
        return group;
    }
}

export const EnemyFactory = new EnemyFactoryClass();
