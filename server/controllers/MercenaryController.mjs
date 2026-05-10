import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    register(app) {
        app.events.on("getWorldData", () => {
            try {
                const resources = this.repo.getResources();
                const worldState = this.repo.getWorldState();

                app.events.broadcast("receiveWorldData", { 
                    resources: resources,
                    nodes: worldState.nodes,
                    player: worldState.player, 
                    origin: worldState.origin,
                    gameVersion: worldState.gameVersion
                });
            } catch (error) {
                app.events.broadcast("receiveWorldData", { nodes: [], player: {x: 400, y: 300}, origin: 'default', gameVersion: 'standard' });
            }
        });

        app.events.on("saveWorldData", (payload) => {
            try {
                if (payload && payload.x !== undefined && payload.y !== undefined) {
                    this.repo.savePlayerPosition(payload.x, payload.y);
                }
            } catch (error) {}
        });

        app.events.on("getPartyData", () => {
            try {
                const mercs = this.repo.getAllMercenaries();
                const resources = this.repo.getResources();
                app.events.broadcast("receivePartyData", { mercenaries: mercs, resources: resources });
            } catch (error) {
                if (error.message.includes("No active save")) app.events.broadcast("receivePartyData", null);
            }
        });

        app.events.on("processDayEnd", () => {
            try {
                const result = this.repo.processDayEnd();
                app.events.broadcast("dayEnded", { success: true, ...result });
                this._refreshParty(app); 
            } catch (error) {
                app.events.broadcast("dayEnded", { success: false, error: error.message });
            }
        });

        app.events.on("internal:sessionCompleted", (payload) => {
            try {
                // Ensure ratio is extracted and passed
                const { focusSeconds, ratio } = payload;
                const minutes = focusSeconds / 60;
                
                const result = this.repo.distributeSessionXP(minutes, ratio);
                
                // Notify frontend to show an RPG toast/logs
                app.events.broadcast("xpGained", result); 
            } catch (e) {
                if (!e.message.includes("No game save is currently loaded")) {
                    console.error("XP Distribution failed", e);
                }
            }
        });

        app.events.on("hireMercenary", (payload) => {
            try {
                const cost = payload.cost || 100; 
                const newGoldBalance = this.repo.updateGold(-cost);
                const result = this.repo.addMercenary(payload.mercData);

                app.events.broadcast("mercenaryHired", {
                    success: true,
                    newGold: newGoldBalance,
                    merc: { id: result.lastInsertRowid, ...payload.mercData }
                });

                this._refreshParty(app);

            } catch (error) {
                app.events.broadcast("mercenaryHired", { success: false, error: error.message });
            }
        });

        app.events.on("getContractsForNode", (payload) => {
            try {
                const contracts = this.repo.getOrGenerateContracts(payload.nodeId);
                const activeContract = this.repo.getActiveContract();
                app.events.broadcast("receiveContracts", { contracts, activeContract });
            } catch(e) { console.error(e); }
        });

        app.events.on("acceptContract", (payload) => {
            try {
                this.repo.acceptContract(payload.contractId);
                const activeContract = this.repo.getActiveContract();
                app.events.broadcast("contractAccepted", { activeContract });
            } catch(e) { console.error(e); }
        });
    }

    _refreshParty(app) {
        const mercs = this.repo.getAllMercenaries();
        const resources = this.repo.getResources();
        app.events.broadcast("receivePartyData", { mercenaries: mercs, resources });
    }
}