import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    register(app) {
        // Handle World Data Request (Load)
        app.events.on("getWorldData", () => {
            try {
                // 1. Get Resources
                const resources = this.repo.getResources();
                
                // 2. Get World State (Nodes + Player Position)
                const worldState = this.repo.getWorldState();

                app.events.broadcast("receiveWorldData", { 
                    resources: resources,
                    nodes: worldState.nodes,
                    player: worldState.player // Send saved position
                });
            } catch (error) {
                console.error("❌ Map Load Error:", error);
                app.events.broadcast("receiveWorldData", { nodes: [], player: {x: 400, y: 300} });
            }
        });

        // Handle Save World Data (Save Position)
        app.events.on("saveWorldData", (payload) => {
            try {
                if (payload && payload.x !== undefined && payload.y !== undefined) {
                    this.repo.savePlayerPosition(payload.x, payload.y);
                    // console.log(`💾 Saved Player Position: ${Math.round(payload.x)}, ${Math.round(payload.y)}`);
                }
            } catch (error) {
                console.error("❌ Save World Data Error:", error);
            }
        });

        // Get Party + Resources
        app.events.on("getPartyData", () => {
            try {
                const mercs = this.repo.getAllMercenaries();
                const resources = this.repo.getResources();
                
                app.events.broadcast("receivePartyData", { 
                    mercenaries: mercs, 
                    resources: resources 
                });
            } catch (error) {
                if (error.message.includes("No active save")) {
                    app.events.broadcast("receivePartyData", null);
                } else {
                    console.error("❌ DB Error:", error);
                }
            }
        });

        app.events.on("processDayEnd", () => {
            try {
                const result = this.repo.processDayEnd();
                app.events.broadcast("dayEnded", { success: true, ...result });
                this._refreshParty(app); // Refresh UI
            } catch (error) {
                app.events.broadcast("dayEnded", { success: false, error: error.message });
            }
        });

        app.events.on("internal:sessionCompleted", (payload) => {
            try {
                const { focusSeconds } = payload;
                const minutes = focusSeconds / 60;
                const result = this.repo.distributeSessionXP(minutes);
                console.log(`⚔️ Distributed ${result.xp} XP to active party.`);
                
                // Notify frontend to show an RPG toast
                app.events.broadcast("xpGained", result); 
            } catch (e) {
                console.error("XP Distribution failed", e);
            }
        });

        // Hire Mercenary (Transactional)
        app.events.on("hireMercenary", (payload) => {
            try {
                const cost = payload.cost || 100; // Default hiring cost
                
                // 1. Deduct Gold (Throws if insufficient)
                const newGoldBalance = this.repo.updateGold(-cost);

                // 2. Add Mercenary
                const result = this.repo.addMercenary(payload.mercData);

                // 3. Broadcast Success & Updates
                app.events.broadcast("mercenaryHired", {
                    success: true,
                    newGold: newGoldBalance,
                    merc: { id: result.lastInsertRowid, ...payload.mercData }
                });

                // Refresh the full view
                this._refreshParty(app);

            } catch (error) {
                console.error("❌ Hiring Error:", error);
                app.events.broadcast("mercenaryHired", { success: false, error: error.message });
            }
        });
    }

    _refreshParty(app) {
        const mercs = this.repo.getAllMercenaries();
        const resources = this.repo.getResources();
        app.events.broadcast("receivePartyData", { mercenaries: mercs, resources });
    }
}