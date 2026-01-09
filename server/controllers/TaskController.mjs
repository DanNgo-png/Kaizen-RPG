import { TaskRepository } from "../database/SQLite3/repositories/TaskRepository.mjs";

export class TaskController {
    constructor() {
        this.repo = new TaskRepository();
    }

    /**
     * Registers all task-related events to the Neutralino app instance.
     * @param {NeutralinoApp} app 
     */
    register(app) {
        // Bind methods to 'this' to preserve context or use arrow functions in the callback
        app.events.on("getTasks", () => this.broadcastTasks(app));
        
        app.events.on("addTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.addTask(payload));
            this.broadcastTasks(app);
        });

        app.events.on("toggleTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.toggleTask(payload.id));
            this.broadcastTasks(app);
        });

        app.events.on("deleteTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.removeTask(payload.id));
            this.broadcastTasks(app);
        });

        app.events.on("clearCompletedTasks", () => {
            this.handleSafeDBAction(() => this.repo.clearCompleted());
            this.broadcastTasks(app);
        });

        app.events.on("updateTaskDescription", (payload) => {
            this.handleSafeDBAction(() => this.repo.updateTaskDescription(payload.id, payload.description));
            this.broadcastTasks(app);
        });
    }

    /**
     * Helper to send updated list to frontend
     */
    broadcastTasks(app) {
        try {
            const data = this.repo.getAllTasks();
            app.events.broadcast("receiveTasks", data);
        } catch (error) {
            console.error("❌ Failed to broadcast tasks:", error);
        }
    }

    /**
     * Wrapper for error handling to reduce try/catch boilerplate
     */
    handleSafeDBAction(action) {
        try {
            action();
        } catch (error) {
            console.error("❌ Task DB Error:", error);
        }
    }
}