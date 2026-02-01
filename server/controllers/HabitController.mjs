import { HabitRepository } from "../database/SQLite3/repositories/HabitRepository.mjs";

export class HabitController {
    constructor() {
        this.repo = new HabitRepository();
    }

    register(app) {
        // 1. Get Data 
        app.events.on("getHabitsData", (payload) => {
            try {
                const { startDate, endDate, viewMode } = payload;
                
                let habits = (viewMode === 'mastery') ? this.repo.getArchivedHabits() : this.repo.getHabits();
                const logs = this.repo.getLogs(startDate, endDate);
                const stackOrder = this.repo.getStackOrder();
                
                const stackConfig = this.repo.getStackConfig();

                app.events.broadcast("receiveHabitsData", { habits, logs, stackOrder, stackConfig });
            } catch (err) {
                console.error("❌ Habit Error:", err);
            }
        });

        // 2. Save Order
        app.events.on("saveStackOrder", (payload) => {
            try {
                this.repo.saveStackOrder(payload.order);
            } catch (err) {
                console.error("❌ Error saving stack order:", err);
            }
        });

        // 3. CRUD
        app.events.on("createHabit", (payload) => {
            try {
                this.repo.createHabit(payload);
                app.events.broadcast("habitCreated", { success: true });
            } catch (err) {
                app.events.broadcast("habitCreated", { success: false, error: err.message });
            }
        });

        app.events.on("updateHabit", (payload) => {
            try {
                this.repo.updateHabit(payload.id, {
                    title: payload.title,
                    stack: payload.stack,
                    icon: payload.icon
                });
                app.events.broadcast("habitUpdated", { success: true });
            } catch (err) {
                app.events.broadcast("habitUpdated", { success: false, error: err.message });
            }
        });

        app.events.on("toggleHabitArchive", (payload) => {
            this.repo.toggleArchive(payload.id);
            app.events.broadcast("habitArchived", { success: true });
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

        // Save Stack Details
        app.events.on("updateStackDetails", (payload) => {
            try {
                this.repo.saveStackDetails(payload.stackName, payload.icon, payload.color);
                // We don't need a specific broadcast, usually we just refresh data
                app.events.broadcast("stackDetailsUpdated", { success: true });
            } catch (err) {
                console.error("❌ Error updating stack details:", err);
            }
        });
    }
}