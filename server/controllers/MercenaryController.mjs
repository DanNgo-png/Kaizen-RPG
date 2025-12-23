import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    register(app) {
        app.events.on("getMercenaries", () => {
            try {
                const data = this.repo.getAllMercenaries();
                app.events.broadcast("receiveMercenaries", data);
            } catch (error) {
                console.error("❌ Mercenary DB Error:", error);
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