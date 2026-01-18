import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    register(app) {
        app.events.on("getMercenaries", () => {
            try {
                // This will throw if no save is loaded
                const data = this.repo.getAllMercenaries();
                app.events.broadcast("receiveMercenaries", data);
            } catch (error) {
                // If it's the specific "No active save" error, just send null/empty
                if (error.message.includes("No active save slot")) {
                    // Ideally, the frontend PartyManager handles null to show "Please load a game"
                    app.events.broadcast("receiveMercenaries", null);
                } else {
                    console.error("❌ Mercenary DB Error:", error);
                }
            }
        });

        app.events.on("addMercenary", (payload) => {
            try {
                const result = this.repo.addMercenary(payload);
                app.events.broadcast("mercenaryAdded", {
                    success: true,
                    id: result.lastInsertRowid,
                    ...payload
                });
            } catch (error) {
                console.error("❌ Mercenary DB Error:", error);
            }
        });
    }
}