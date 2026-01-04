/**
 * Responsible for reading configuration values and modes from the settings sidebar.
 */
export const TimerConfig = {
    /**
     * Helper to safely parse input values.
     */
    getValue(elementId, defaultValue) {
        const input = document.getElementById(elementId);
        return input ? (parseFloat(input.value) || defaultValue) : defaultValue;
    },

    /**
     * Checks if the "Stopwatch" tab is currently active in the sidebar.
     * @returns {boolean}
     */
    isStopwatchMode() {
        const btnStopwatch = document.getElementById('btn-mode-stopwatch');
        return btnStopwatch ? btnStopwatch.classList.contains('active') : false;
    },

    /**
     * Returns the selected sub-mode for Stopwatch: 'focus' or 'break'.
     * Defaults to 'focus' if the Break button isn't active.
     * @returns {string} 'focus' | 'break'
     */
    getStopwatchSubMode() {
        const btnBreak = document.querySelector('.sw-btn.sw-break');
        return (btnBreak && btnBreak.classList.contains('active')) ? 'break' : 'focus';
    },

    getFocusDuration() {
        return this.getValue('focus-val', 25);
    },

    getBreakDuration() {
        return this.getValue('break-val', 5);
    }
};