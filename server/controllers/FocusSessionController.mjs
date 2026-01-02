import { FocusSessionRepository } from "../database/SQLite3/repositories/FocusSessionRepository.mjs";

export class FocusSessionController {
    constructor() {
        this.repo = new FocusSessionRepository();
    }

    register(app) {
        app.events.on("saveFocusSession", (payload) => {
            try {
                // payload: { tag, focusSeconds, breakSeconds, ratio }
                const result = this.repo.addSession({
                    tag: payload.tag || "No Tag",
                    focus_seconds: payload.focusSeconds,
                    break_seconds: payload.breakSeconds,
                    ratio: payload.ratio
                });

                console.log(`✅ Focus Session Saved (ID: ${result.lastInsertRowid})`);

                // Send confirmation back to UI
                app.events.broadcast("focusSessionSaved", {
                    success: true,
                    id: result.lastInsertRowid
                });
            } catch (error) {
                console.error("❌ Error saving focus session:", error);
                app.events.broadcast("focusSessionSaved", { success: false, error: error.message });
            }
        });

        app.events.on("getFocusSessions", (payload) => {
            try {
                // payload: { startDate: 'YYYY-MM-DD HH:MM:SS', endDate: '...' }
                const sessions = this.repo.getSessionsByRange(payload.startDate, payload.endDate);
                
                // Send back to UI
                app.events.broadcast("receiveFocusSessions", sessions);
            } catch (error) {
                console.error("❌ Error fetching sessions:", error);
                app.events.broadcast("receiveFocusSessions", []);
            }
        });

        app.events.on("getLifetimeStats", () => {
            try {
                const stats = this.repo.getLifetimeStats();
                // SQLite returns null for SUM if no rows exist
                const payload = {
                    total_focus: stats.total_focus || 0,
                    total_sessions: stats.total_sessions || 0,
                    total_days: stats.total_days || 0
                };
                app.events.broadcast("receiveLifetimeStats", payload);
            } catch (error) {
                console.error("❌ Error fetching lifetime stats:", error);
                app.events.broadcast("receiveLifetimeStats", { total_focus: 0, total_sessions: 0, total_days: 0 });
            }
        });
    }
}