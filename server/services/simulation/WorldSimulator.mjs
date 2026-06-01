import { NobleBehavior } from './behaviors/NobleBehavior.mjs';
import { BanditBehavior } from './behaviors/BanditBehavior.mjs';
import { BarbarianBehavior } from './behaviors/BarbarianBehavior.mjs';
import { GreenskinBehavior } from './behaviors/GreenskinBehavior.mjs'; 
import { UndeadBehavior } from './behaviors/UndeadBehavior.mjs'; 
import { WebknechtBehavior } from './behaviors/WebknechtBehavior.mjs';
import { SettlementSpecializationPlanner } from './SettlementSpecializationPlanner.mjs';

export class WorldSimulator {
    constructor(repo) {
        this.repo = repo;
        this.behaviors = [
            new NobleBehavior(repo),
            new BanditBehavior(repo),
            new BarbarianBehavior(repo),
            new GreenskinBehavior(repo),
            new UndeadBehavior(repo),
            new WebknechtBehavior(repo)
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

        SettlementSpecializationPlanner.ensureWorldHasBuildingMaterialSettlement(this.repo, rng);
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

        SettlementSpecializationPlanner.ensureWorldHasBuildingMaterialSettlement(this.repo, rng);
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
