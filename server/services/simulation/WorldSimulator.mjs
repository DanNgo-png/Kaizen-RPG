import { NobleBehavior } from './behaviors/NobleBehavior.mjs';
import { BanditBehavior } from './behaviors/BanditBehavior.mjs';
import { BarbarianBehavior } from './behaviors/BarbarianBehavior.mjs';

export class WorldSimulator {
    constructor(repo) {
        this.repo = repo;
        // Add active factions in the world here
        this.behaviors = [
            new NobleBehavior(repo),
            new BanditBehavior(repo),
            new BarbarianBehavior(repo)
        ];
    }

    generateProceduralWorld(rng) {
        const context = { nodes: [], factions: [], isPremade: false };

        for (const behavior of this.behaviors) {
            const factions = behavior.setupFactions(rng, context);
            context.factions.push(...factions);
        }

        for (const behavior of this.behaviors) {
            const nodes = behavior.generateNodes(rng, context);
            context.nodes.push(...nodes);
        }
    }

    setupPremadeWorld(rng, premadeNodes) {
         const context = { nodes: premadeNodes, factions: [], isPremade: true };

         for (const behavior of this.behaviors) {
            const factions = behavior.setupFactions(rng, context);
            context.factions.push(...factions);
        }

        for (const behavior of this.behaviors) {
            const nodes = behavior.generateNodes(rng, context);
            context.nodes.push(...nodes);
        }
    }

    processDayEnd(currentDay) {
        const logs = [];
        for (const behavior of this.behaviors) {
            const behaviorLogs = behavior.processDayEnd(currentDay);
            if (Array.isArray(behaviorLogs)) {
                logs.push(...behaviorLogs);
            }
        }
        return logs;
    }
}
