const EXTENSION_ID = "js.node-neutralino.projectRunner";

export const GameAPI = {
    // --- TASKS ---
    getTasks: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getTasks", null);
    },
    addTask: async (taskData) => {
        // taskData: { content: string, priority: string }
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addTask", taskData);
    },
    toggleTask: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "toggleTask", { id });
    },
    deleteTask: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTask", { id });
    },
    clearCompletedTasks: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "clearCompletedTasks", null);
    },

    /**
    * Request the full list of mercenaries from the DB.
    */
    getMercenaries: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getMercenaries", null);
    },
    /**
     * Send a new mercenary payload to the DB.
     * @param {Object} mercenaryData - { name, role, level }
     */
    addMercenary: async (mercenaryData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addMercenary", mercenaryData);
    }
};