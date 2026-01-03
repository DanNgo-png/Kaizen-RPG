import { EXTENSION_ID } from "./_extension_id.js";

export const FocusAPI = {
    /**
     * Saves a flexible focus session to the database
     * @param {Object} data - { tag, focusSeconds, breakSeconds, ratio }
     */
    saveFocusSession: async (data) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveFocusSession", data);
    },

    /**
     * Request sessions within a specific date range
     * @param {string} startDate - YYYY-MM-DD HH:MM:SS
     * @param {string} endDate - YYYY-MM-DD HH:MM:SS
     */
    getFocusSessions: async (startDate, endDate) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getFocusSessions", { startDate, endDate });
    },

    getLifetimeStats: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getLifetimeStats", null);
    },

    getCalendarData: async (startDate, endDate) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getCalendarData", { startDate, endDate });
    },

    clearFocusHistory: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "clearFocusHistory", null);
    },

    getTags: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getTags", null);
    },

    saveTag: async (name, color) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveTag", { name, color });
    },

    updateTag: async (id, name, color) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "updateTag", { id, name, color });
    },

    deleteTag: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTag", { id });
    }
};