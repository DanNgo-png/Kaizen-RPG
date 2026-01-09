export const ScheduleLogic = {
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        // Handle cases where timeStr might be "2:30 PM" (if UI passes it back) or "14:30"
        // For simplicity, we assume DB always sends 24h format "HH:MM"
        const [h, m] = timeStr.split(':').map(val => parseInt(val));
        return (h * 60) + m;
    },

    minutesToTime(totalMinutes) {
        // Returns 24-hour format for Logic/DB (e.g., "14:30")
        const clamped = Math.max(0, Math.min(totalMinutes, 1439));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    /**
     * NEW: Converts "14:30" or 14 to "2:30 PM" or "2 PM" for UI Display
     */
    formatTimeDisplay(input) {
        let h, m;

        if (typeof input === 'number') {
            h = input;
            m = 0;
        } else {
            if (!input) return '';
            // If it already has AM/PM, return as is
            if (input.includes('M')) return input;
            [h, m] = input.split(':').map(Number);
        }

        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12; // Convert 0 or 12 to 12
        const mStr = (m !== undefined) ? m.toString().padStart(2, '0') : '00';
        
        return `${h12}:${mStr} ${ampm}`;
    },

    /**
     * NEW: Converts just the hour to "2 PM" format (for grid lines)
     */
    formatHourDisplay(hour) {
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12} ${ampm}`;
    },

    recalculateSchedule(currentSchedule, activeTask) {
        // ... (Logic remains the same as before) ...
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

    pixelsToTime(y, topPadding = 20, startHour = 9) {
        const startMins = startHour * 60;
        const clickedMins = (y - topPadding) + startMins;
        const snappedMins = Math.round(clickedMins / 15) * 15;
        return this.minutesToTime(snappedMins);
    }
};