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
    }
};