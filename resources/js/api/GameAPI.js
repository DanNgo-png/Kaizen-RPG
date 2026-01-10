import { EXTENSION_ID } from "./_extension_id.js";

export const GameAPI = {
    // --- LISTS ---
    getTodoLists: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getTodoLists", null);
    },
    addTodoList: async (title, icon) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addTodoList", { title, icon });
    },
    deleteTodoList: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTodoList", { id });
    },

    // --- TASKS ---
    getTasks: async (listId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getTasks", { listId });
    },
    addTask: async (taskData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addTask", taskData); // taskData: { content, priority, listId }
    },
    toggleTask: async (id, listId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "toggleTask", { id, listId });
    },
    
    deleteTask: async (id, listId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTask", { id, listId });
    },
    
    clearCompletedTasks: async (listId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "clearCompletedTasks", { listId });
    },

    updateTaskDescription: async (id, description, listId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "updateTaskDescription", { id, description, listId });
    },

    // --- MERCENARIES ---
    getMercenaries: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getMercenaries", null);
    },
    addMercenary: async (mercenaryData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addMercenary", mercenaryData);
    }
};