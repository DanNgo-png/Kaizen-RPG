import NeutralinoApp from "node-neutralino";
import { GameRepository } from "./database/SQLite3/repositories/GameRepository.mjs";
import { TaskRepository } from "./database/SQLite3/repositories/TaskRepository.mjs";

const app = new NeutralinoApp({ url: "/", windowOptions: { enableInspector: true } });
const gameRepo = new GameRepository();
const taskRepo = new TaskRepository();

app.init();

// --- TASKS ---
// Helper to broadcast updated list
const broadcastTasks = () => {
    const data = taskRepo.getAllTasks();
    app.events.broadcast("receiveTasks", data);
};

app.events.on("getTasks", () => {
    broadcastTasks();
});

app.events.on("addTask", (payload) => {
    try {
        taskRepo.addTask(payload); // payload: { content, priority }
        broadcastTasks();
    } catch (error) {
        console.error("DB Error:", error);
    }
});

app.events.on("toggleTask", (payload) => {
    try {
        taskRepo.toggleTask(payload.id);
        broadcastTasks();
    } catch (error) {
        console.error("DB Error:", error);
    }
});

app.events.on("deleteTask", (payload) => {
    try {
        taskRepo.removeTask(payload.id);
        broadcastTasks();
    } catch (error) {
        console.error("DB Error:", error);
    }
});

app.events.on("clearCompletedTasks", () => {
    try {
        taskRepo.clearCompleted();
        broadcastTasks();
    } catch (error) {
        console.error("DB Error:", error);
    }
});

// --- MERCENARIES ---
app.events.on("getMercenaries", () => {
    try {
        const data = gameRepo.getAllMercenaries();
        app.events.broadcast("receiveMercenaries", data);
    } catch (error) {
        console.error("Database Error:", error);
    }
});

app.events.on("addMercenary", (payload) => {
    try {
        const result = gameRepo.addMercenary(payload);
        app.events.broadcast("mercenaryAdded", {
            success: true,
            id: result.lastInsertRowid,
            ...payload
        });
    } catch (error) {
        console.error("Database Error:", error);
    }
});

