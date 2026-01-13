import { EXTENSION_ID } from "./_extension_id.js";

export const HabitAPI = {
    getHabitsData: async (startDate, endDate, viewMode = 'all') => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getHabitsData", { startDate, endDate, viewMode });
    },

    createHabit: async (title, stack, icon, target) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "createHabit", { title, stack, icon, target });
    },

    updateHabit: async (id, title, stack, icon) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "updateHabit", { id, title, stack, icon });
    },

    toggleDay: async (id, date) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "toggleHabitDay", { id, date });
    },

    toggleArchive: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "toggleHabitArchive", { id });
    },
    
    deleteHabit: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteHabit", { id });
    }
};