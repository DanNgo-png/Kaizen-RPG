import { HabitRepository } from "../database/SQLite3/repositories/HabitRepository.mjs";

export class HabitController {
    constructor() {
        this.repo = new HabitRepository();
    }

    register(app) {
        // --- GET DATA ---
        app.events.on("getHabitsData", (payload) => {
            try {
                const { startDate, endDate } = payload;
                const habits = this.repo.getHabits();
                const logs = this.repo.getLogs(startDate, endDate);
                
                app.events.broadcast("receiveHabitsData", { habits, logs });
            } catch (err) {
                console.error("❌ HabitController: Error fetching data:", err);
                // Send empty data so UI doesn't hang
                app.events.broadcast("receiveHabitsData", { habits: [], logs: [] });
            }
        });

        // --- CREATE HABIT ---
        app.events.on("createHabit", (payload) => {
            try {
                console.log("📝 Creating Habit:", payload);
                this.repo.createHabit(payload);
                
                app.events.broadcast("habitCreated", { success: true });
            } catch (err) {
                console.error("❌ HabitController: Creation Failed:", err);
                app.events.broadcast("habitCreated", { success: false, error: err.message });
            }
        });

        // --- TOGGLE DAY ---
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
        
        // --- DELETE HABIT ---
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