export const ScheduleLogic = {
    /**
     * Calculates the next available slot based on existing schedule.
     * Defaults to 09:00 if empty.
     * @param {Array} scheduleData - Array of task objects with start_time and duration
     * @returns {string} HH:MM formatted time
     */
    getNextAvailableTime(scheduleData) {
        let maxEndTimeMins = 9 * 60; // Default start: 9:00 AM

        scheduleData.forEach(task => {
            if (!task.start_time) return;
            const [h, m] = task.start_time.split(':').map(Number);
            const startMins = (h * 60) + m;
            const duration = task.duration || 30;
            const endMins = startMins + duration;

            if (endMins > maxEndTimeMins) {
                maxEndTimeMins = endMins;
            }
        });

        // Convert back to HH:MM
        const h = Math.floor(maxEndTimeMins / 60);
        const m = maxEndTimeMins % 60;
        // Clamp to 23:59 max
        if (h >= 24) return "23:45";
        
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    /**
     * Formats minutes into human readable string.
     */
    formatDuration(minutes) {
        if (!minutes) return '0 min';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        let str = '';
        if (h > 0) str += `${h} hr `;
        if (m > 0 || h === 0) str += `${m} min`;
        return str.trim();
    },

    /**
     * Converts Y pixel position to HH:MM string based on timeline offset.
     * @param {number} y - Mouse Y position relative to container
     * @param {number} topPadding - Padding offset (usually 20px)
     * @returns {string} HH:MM
     */
    pixelsToTime(y, topPadding = 20) {
        const startMins = 9 * 60; // 9:00 AM
        const clickedMins = (y - topPadding) + startMins;
        const snappedMins = Math.round(clickedMins / 15) * 15;

        const h = Math.floor(snappedMins / 60);
        const m = snappedMins % 60;
        
        const safeH = Math.max(0, Math.min(23, h));
        return `${safeH.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    }
};