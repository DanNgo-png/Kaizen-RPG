import { FocusSessionRepository } from "../database/SQLite3/repositories/FocusSessionRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";
import { internalEventBus } from "../utils/InternalEventBus.mjs";

const getLocalSQLDateTime = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const MIN_SESSION_SECONDS = 0;
const DEFAULT_SESSION_RATIO = 1.0;
const DEFAULT_TIMER_TYPE = 'standard';

const normalizeSessionSeconds = (value) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return MIN_SESSION_SECONDS;
    return Math.max(MIN_SESSION_SECONDS, Math.round(seconds));
};

const normalizeSessionRatio = (value) => {
    const ratio = Number(value);
    if (!Number.isFinite(ratio) || ratio <= 0) return DEFAULT_SESSION_RATIO;
    return ratio;
};

export class FocusSessionController {
    constructor() {
        this.repo = new FocusSessionRepository();
        this.settingsRepo = new AppSettingsRepository();
    }

    register(app) {
        app.events.on("saveFocusSession", (payload) => {
            try {
                const localCreatedAt = getLocalSQLDateTime();
                const sessionPayload = payload || {};
                const focusSeconds = normalizeSessionSeconds(sessionPayload.focusSeconds);
                const breakSeconds = normalizeSessionSeconds(sessionPayload.breakSeconds);
                const ratio = normalizeSessionRatio(sessionPayload.ratio);

                const result = this.repo.addSession({
                    tag: sessionPayload.tag || "No Tag",
                    focus_seconds: focusSeconds,
                    break_seconds: breakSeconds,
                    ratio,
                    timer_type: sessionPayload.timer_type || DEFAULT_TIMER_TYPE,
                    created_at: localCreatedAt
                });

                console.log(`✅ Focus Session Saved (ID: ${result.lastInsertRowid}) at ${localCreatedAt}`);

                // Publish internal event via server-side event bus
                internalEventBus.emit("sessionCompleted", { 
                    focusSeconds, 
                    breakSeconds, 
                    ratio 
                });
                
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
                const sessions = this.repo.getSessionsByRange(payload.startDate, payload.endDate);
                const responseEvent = payload.targetEvent || "receiveFocusSessions";
                app.events.broadcast(responseEvent, sessions);
            } catch (error) {
                const responseEvent = payload.targetEvent || "receiveFocusSessions";
                app.events.broadcast(responseEvent, []);
            }
        });

        app.events.on("updateFocusSession", (payload) => {
            try {
                this.repo.updateSession(payload.id, payload.tag);
                app.events.broadcast("focusSessionUpdated", { success: true });
            } catch (error) {}
        });

        app.events.on("deleteFocusSession", (payload) => {
            try {
                this.repo.deleteSession(payload.id);
                app.events.broadcast("focusSessionDeleted", { success: true });
            } catch (error) {}
        });

        app.events.on("requestExportHistory", () => {
            try {
                const sessions = this.repo.getAllSessions();
                const header = "tag,focus_seconds,break_seconds,ratio,created_at";
                const rows = sessions.map(s => {
                    const safeTag = s.tag.includes(',') ? `"${s.tag}"` : s.tag;
                    return `${safeTag},${s.focus_seconds},${s.break_seconds},${s.ratio},${s.created_at}`;
                });
                const csvContent = [header, ...rows].join("\n");
                app.events.broadcast("receiveExportData", { csvContent });
            } catch (error) {
                app.events.broadcast("exportHistoryFailed", { error: error.message });
            }
        });

        app.events.on("importFocusHistory", (payload) => {
            try {
                const sessions = payload.data;
                if (!Array.isArray(sessions) || sessions.length === 0) throw new Error("No data");
                this.repo.importSessionsBulk(sessions);
                app.events.broadcast("historyImported", { success: true, count: sessions.length });
            } catch (error) {
                app.events.broadcast("historyImported", { success: false, error: error.message });
            }
        });

        app.events.on("getLifetimeStats", () => {
            try {
                const stats = this.repo.getLifetimeStats();
                const dailyGoalMin = this.settingsRepo.getSetting('dailyGoal');
                const minSeconds = dailyGoalMin ? (parseInt(dailyGoalMin) * 60) : 900; 
                const streaks = this.repo.getStreakStats(minSeconds);

                app.events.broadcast("receiveLifetimeStats", {
                    total_focus: stats.total_focus || 0,
                    total_sessions: stats.total_sessions || 0,
                    total_days: stats.total_days || 0,
                    currentStreak: streaks.currentStreak || 0, 
                    bestStreak: streaks.bestStreak || 0
                });
            } catch (error) {
                app.events.broadcast("receiveLifetimeStats", { total_focus: 0, total_sessions: 0, total_days: 0, currentStreak: 0, bestStreak: 0 });
            }
        });

        app.events.on("getCalendarData", (payload) => {
            try {
                const sessions = this.repo.getSessionsByRange(payload.startDate, payload.endDate);
                app.events.broadcast("receiveCalendarData", sessions);
            } catch (error) {
                app.events.broadcast("receiveCalendarData", []);
            }
        });

        app.events.on("clearFocusHistory", () => {
            try {
                this.repo.clearAllSessions();
                app.events.broadcast("focusHistoryCleared", { success: true });
            } catch (error) {
                app.events.broadcast("focusHistoryCleared", { success: false, error: error.message });
            }
        });

        app.events.on("getTags", () => {
            try {
                app.events.broadcast("receiveTags", this.repo.getAllTags());
            } catch (error) {}
        });

        app.events.on("saveTag", (payload) => {
            try {
                this.repo.addTag(payload.name, payload.color);
                app.events.broadcast("receiveTags", this.repo.getAllTags());
            } catch (error) {
                console.error("❌ Error saving tag:", error);
            }
        });

        app.events.on("updateTag", (payload) => {
            try {
                this.repo.updateTag(payload.id, payload.name, payload.color);
                app.events.broadcast("receiveTags", this.repo.getAllTags());
            } catch (error) {
                console.error("❌ Error updating tag:", error);
            }
        });

        app.events.on("deleteTag", (payload) => {
            try {
                this.repo.deleteTag(payload.id);
                app.events.broadcast("receiveTags", this.repo.getAllTags());
            } catch (error) {
                console.error("❌ Error deleting tag:", error);
            }
        });
    }
}