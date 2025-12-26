/**
 * Reads configuration values from the settings sidebar.
 */
export const TimerConfig = {
    /**
     * Helper to safely parse input values.
     * @param {string} elementId 
     * @param {number} defaultValue 
     * @returns {number}
     */
    getValue(elementId, defaultValue) {
        const input = document.getElementById(elementId);
        return input ? (parseInt(input.value) || defaultValue) : defaultValue;
    },

    getFocusDuration() {
        return this.getValue('focus-val', 25);
    },

    getBreakDuration() {
        return this.getValue('break-val', 5);
    }
};