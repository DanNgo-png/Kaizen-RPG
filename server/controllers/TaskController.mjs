import { TaskRepository } from "../database/SQLite3/repositories/TaskRepository.mjs";

export class TaskController {
    constructor() {
        this.repo = new TaskRepository();
    }

    register(app) {
        // LISTS
        app.events.on("getTodoLists", () => {
            try {
                const data = this.repo.getLists();
                app.events.broadcast("receiveTodoLists", data);
            } catch (e) { console.error(e); }
        });

        app.events.on("addTodoList", (payload) => {
            this.handleSafeDBAction(() => this.repo.addList(payload.title, payload.icon));
            app.events.broadcast("receiveTodoLists", this.repo.getLists());
        });

        app.events.on("deleteTodoList", (payload) => {
            this.handleSafeDBAction(() => this.repo.deleteList(payload.id));
            app.events.broadcast("receiveTodoLists", this.repo.getLists());
        });

        // TASKS
        app.events.on("getTasks", (payload) => this.broadcastTasks(app, payload ? payload.listId : 1));
        
        app.events.on("addTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.addTask(payload));
            this.broadcastTasks(app, payload.listId);
        });

        app.events.on("toggleTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.toggleTask(payload.id));
            this.broadcastTasks(app, payload.listId || 1);
        });

        app.events.on("deleteTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.removeTask(payload.id));
            this.broadcastTasks(app, payload.listId);
        });

        app.events.on("clearCompletedTasks", (payload) => {
            this.handleSafeDBAction(() => this.repo.clearCompleted(payload.listId));
            this.broadcastTasks(app, payload.listId);
        });

        app.events.on("updateTaskDescription", (payload) => {
            this.handleSafeDBAction(() => this.repo.updateTaskDescription(payload.id, payload.description));
            this.broadcastTasks(app, payload.listId);
        });

        // Payload: { id, priority, listId } -> listId needed to refresh current view
        app.events.on("updateTaskPriority", (payload) => {
            this.handleSafeDBAction(() => this.repo.updateTaskPriority(payload.id, payload.priority));
            this.broadcastTasks(app, payload.listId);
        });

        // Payload: { id, newListId, currentListId }
        app.events.on("moveTask", (payload) => {
            this.handleSafeDBAction(() => this.repo.moveTask(payload.id, payload.newListId));
            this.broadcastTasks(app, payload.currentListId);
        });
    }

    /**
     * Send updated list to frontend
     */
    broadcastTasks(app, listId) {
        try {
            // Default to 1 (Inbox) only if listId is strictly missing/undefined
            const targetList = listId || 1;
            const data = this.repo.getTasksByList(targetList);
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