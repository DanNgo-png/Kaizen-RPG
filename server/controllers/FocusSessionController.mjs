import { FocusSessionRepository } from "../database/SQLite3/repositories/FocusSessionRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";

export class FocusSessionController {
    constructor() {
        this.repo = new FocusSessionRepository();
        this.settingsRepo = new AppSettingsRepository();
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

        app.events.on("updateFocusSession", (payload) => {
            try {
                this.repo.updateSession(payload.id, payload.tag);
                // Broadcast update so UI refreshes
                app.events.broadcast("focusSessionUpdated", { success: true });
            } catch (error) {
                console.error("❌ Error updating session:", error);
            }
        });

        app.events.on("deleteFocusSession", (payload) => {
            try {
                this.repo.deleteSession(payload.id);
                app.events.broadcast("focusSessionDeleted", { success: true });
            } catch (error) {
                console.error("❌ Error deleting session:", error);
            }
        });

        app.events.on("getLifetimeStats", () => {
            try {
                // 1. Get Basic Stats
                const stats = this.repo.getLifetimeStats();
                
                // 2. Fetch Goal for Streak Calculation
                const dailyGoalMin = this.settingsRepo.getSetting('dailyGoal');
                const minSeconds = dailyGoalMin ? (parseInt(dailyGoalMin) * 60) : 900; // Default 15m if not set

                // 3. Get Streak Stats (passing threshold)
                const streaks = this.repo.getStreakStats(minSeconds);

                // 4. Combine Payloads
                const payload = {
                    total_focus: stats.total_focus || 0,
                    total_sessions: stats.total_sessions || 0,
                    total_days: stats.total_days || 0,
                    currentStreak: streaks.currentStreak || 0, 
                    bestStreak: streaks.bestStreak || 0
                };
                
                app.events.broadcast("receiveLifetimeStats", payload);
            } catch (error) {
                console.error("❌ Error fetching lifetime stats:", error);
                app.events.broadcast("receiveLifetimeStats", { 
                    total_focus: 0, 
                    total_sessions: 0, 
                    total_days: 0,
                    currentStreak: 0,
                    bestStreak: 0
                });
            }
        });

        // Fetch data specifically for the Calendar view
        app.events.on("getCalendarData", (payload) => {
            try {
                // payload: { startDate, endDate }
                const sessions = this.repo.getSessionsByRange(payload.startDate, payload.endDate);
                app.events.broadcast("receiveCalendarData", sessions);
            } catch (error) {
                console.error("❌ Error fetching calendar data:", error);
                app.events.broadcast("receiveCalendarData", []);
            }
        });

        // Handle clearing history
        app.events.on("clearFocusHistory", () => {
            try {
                this.repo.clearAllSessions();
                console.log("🧹 Focus History Cleared.");
                app.events.broadcast("focusHistoryCleared", { success: true });
            } catch (error) {
                console.error("❌ Error clearing focus history:", error);
                app.events.broadcast("focusHistoryCleared", { success: false, error: error.message });
            }
        });

        // Get all saved tags
        app.events.on("getTags", () => {
            try {
                const tags = this.repo.getAllTags();
                app.events.broadcast("receiveTags", tags);
            } catch (error) {
                console.error("❌ Error fetching tags:", error);
            }
        });

        // Save a new tag
        app.events.on("saveTag", (payload) => {
            try {
                // payload: { name: "Coding", color: "#ff0000" }
                this.repo.addTag(payload.name, payload.color);
                
                // Automatically send back the updated list
                const tags = this.repo.getAllTags();
                app.events.broadcast("receiveTags", tags);
            } catch (error) {
                console.error("❌ Error saving tag:", error);
            }
        });

        // Update Tag
        app.events.on("updateTag", (payload) => {
            try {
                this.repo.updateTag(payload.id, payload.name, payload.color);
                // Broadcast updated list
                const tags = this.repo.getAllTags();
                app.events.broadcast("receiveTags", tags);
            } catch (error) {
                console.error("❌ Error updating tag:", error);
            }
        });

        // Delete Tag
        app.events.on("deleteTag", (payload) => {
            try {
                this.repo.deleteTag(payload.id);
                // Broadcast updated list
                const tags = this.repo.getAllTags();
                app.events.broadcast("receiveTags", tags);
            } catch (error) {
                console.error("❌ Error deleting tag:", error);
            }
        });
    }
}