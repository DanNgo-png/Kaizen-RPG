export const ScheduleLogic = {
    // ... (Keep timeToMinutes, minutesToTime, recalculateSchedule) ...

    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60) + m;
    },

    minutesToTime(totalMinutes) {
        const clamped = Math.max(0, Math.min(totalMinutes, 1439));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    recalculateSchedule(currentSchedule, activeTask) {
        // ... (Previous implementation of cascade logic remains valid) ...
        // Re-paste the cascade logic here for completeness if you overwriting, 
        // otherwise just ensure this function signature doesn't change.
        
        let tasks = currentSchedule.filter(t => t.schedule_id !== activeTask.schedule_id);
        const movingTask = { ...activeTask, _isActive: true };
        tasks.push(movingTask);

        tasks.sort((a, b) => {
            const startA = this.timeToMinutes(a.start_time);
            const startB = this.timeToMinutes(b.start_time);
            if (startA === startB) return a._isActive ? -1 : 1; 
            return startA - startB;
        });

        const updates = [];
        let adjustedActiveTime = activeTask.start_time; 

        for (let i = 0; i < tasks.length - 1; i++) {
            const current = tasks[i];
            const next = tasks[i + 1];

            const currentStart = this.timeToMinutes(current.start_time);
            const duration = current.duration || 30; 
            const currentEnd = currentStart + duration;
            const nextStart = this.timeToMinutes(next.start_time);

            if (currentEnd > nextStart) {
                const newStartStr = this.minutesToTime(currentEnd);
                next.start_time = newStartStr;

                if (next._isActive) {
                    adjustedActiveTime = newStartStr;
                } else {
                    updates.push({
                        scheduleId: next.schedule_id,
                        startTime: newStartStr,
                        dateKey: next.date_key
                    });
                }
            }
        }
        return { updates, adjustedActiveTime };
    },

    /**
     * Calculates the next available slot based on schedule.
     * Starts looking from 'startHour' instead of fixed 9:00.
     */
    getNextAvailableTime(scheduleData, startHour = 9) {
        let maxEndTimeMins = startHour * 60; 

        scheduleData.forEach(task => {
            if (!task.start_time) return;
            const startMins = this.timeToMinutes(task.start_time);
            const duration = task.duration || 30;
            if (startMins + duration > maxEndTimeMins) {
                maxEndTimeMins = startMins + duration;
            }
        });
        return this.minutesToTime(maxEndTimeMins);
    },

    formatDuration(minutes) {
        if (!minutes) return '0 min';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        let str = '';
        if (h > 0) str += `${h}h `;
        if (m > 0 || h === 0) str += `${m}m`;
        return str.trim();
    },

    /**
     * UPDATED: Accepts startHour to calculate relative offset
     */
    pixelsToTime(y, topPadding = 20, startHour = 9) {
        const startMins = startHour * 60;
        const clickedMins = (y - topPadding) + startMins;
        const snappedMins = Math.round(clickedMins / 15) * 15;
        return this.minutesToTime(snappedMins);
    }
};