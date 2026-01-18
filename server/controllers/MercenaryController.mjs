import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    register(app) {
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