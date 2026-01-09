export const ScheduleLogic = {
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

    /**
     * Calculates cascading updates to resolve overlaps.
     * Returns { updates: [], adjustedActiveTime: string }
     */
    recalculateSchedule(currentSchedule, activeTask) {
        // 1. Remove old version of active task from calculation
        let tasks = currentSchedule.filter(t => t.schedule_id !== activeTask.schedule_id);

        // 2. Add active task with a flag
        // We use the object reference to update properties during the loop
        const movingTask = { ...activeTask, _isActive: true };
        tasks.push(movingTask);

        // 3. Sort by Start Time
        tasks.sort((a, b) => {
            const startA = this.timeToMinutes(a.start_time);
            const startB = this.timeToMinutes(b.start_time);
            
            // If start times match, the Active (Dropped) task pushes the existing one
            // This ensures if you drop ON TOP of a task, you displace it.
            if (startA === startB) {
                return a._isActive ? -1 : 1; 
            }
            return startA - startB;
        });

        // 4. Resolve Overlaps (The Cascade)
        const updates = [];
        let adjustedActiveTime = activeTask.start_time; // Default to requested time

        for (let i = 0; i < tasks.length - 1; i++) {
            const current = tasks[i];
            const next = tasks[i + 1];

            const currentStart = this.timeToMinutes(current.start_time);
            const duration = current.duration || 30; 
            const currentEnd = currentStart + duration;
            const nextStart = this.timeToMinutes(next.start_time);

            // If overlap detected
            if (currentEnd > nextStart) {
                // Shift 'next' task to start exactly when 'current' ends
                const newStartStr = this.minutesToTime(currentEnd);
                next.start_time = newStartStr;

                // If 'next' is the active task, we capture its new forced time
                if (next._isActive) {
                    adjustedActiveTime = newStartStr;
                } 
                // If 'next' is a static task being pushed, add to updates list
                else {
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

    getNextAvailableTime(scheduleData) {
        let maxEndTimeMins = 9 * 60; 
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

    pixelsToTime(y, topPadding = 20) {
        const startMins = 9 * 60;
        const clickedMins = (y - topPadding) + startMins;
        const snappedMins = Math.round(clickedMins / 15) * 15;
        return this.minutesToTime(snappedMins);
    }
};