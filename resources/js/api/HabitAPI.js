import { EXTENSION_ID } from "./_extension_id.js";

export const HabitAPI = {
    getHabitsData: async (startDate, endDate) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getHabitsData", { startDate, endDate });
    },

    createHabit: async (title, stack, icon, target) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "createHabit", { title, stack, icon, target });
    },

    toggleDay: async (id, date) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "toggleHabitDay", { id, date });
    },
    
    deleteHabit: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteHabit", { id });
    }
};