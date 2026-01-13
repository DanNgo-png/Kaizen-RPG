import { HabitRepository } from "../database/SQLite3/repositories/HabitRepository.mjs";

export class HabitController {
    constructor() {
        this.repo = new HabitRepository();
    }

    register(app) {
        app.events.on("getHabitsData", (payload) => {
            try {
                const { startDate, endDate, viewMode } = payload;

                let habits;
                if (viewMode === 'mastery') {
                    // Use new dedicated method
                    habits = this.repo.getArchivedHabits(); 
                } else {
                    habits = this.repo.getHabits(); // Active only
                }

                const logs = this.repo.getLogs(startDate, endDate);

                app.events.broadcast("receiveHabitsData", { habits, logs });
            } catch (err) {
                console.error("❌ Habit Error:", err);
            }
        });

        app.events.on("toggleHabitArchive", (payload) => {
            this.repo.toggleArchive(payload.id);
            app.events.broadcast("habitArchived", { success: true });
        });

        app.events.on("createHabit", (payload) => {
            try {
                this.repo.createHabit(payload);
                app.events.broadcast("habitCreated", { success: true });
            } catch (err) {
                app.events.broadcast("habitCreated", { success: false, error: err.message });
            }
        });

        app.events.on("toggleHabitDay", (payload) => {
            try {
                const newStatus = this.repo.toggleDay(payload.id, payload.date);
                app.events.broadcast("habitToggled", {
                    id: payload.id,
                    date: payload.date,
                    status: newStatus
                });
            } catch (err) {
                console.error("❌ HabitController: Toggle Failed:", err);
            }
        });

        app.events.on("deleteHabit", (payload) => {
            try {
                this.repo.deleteHabit(payload.id);
                app.events.broadcast("habitDeleted", { success: true });
            } catch (err) {
                console.error("❌ HabitController: Delete Failed:", err);
            }
        });
    }
}