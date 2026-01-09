import { EXTENSION_ID } from "../../api/_extension_id.js";
import { ScheduleLogic } from "./ScheduleLogic.js";

export class TimelineManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('schedule-timeline');
        this.currentScheduleData = [];
        
        // Defaults (will be updated by TodayManager)
        this.config = {
            startHour: 9,
            endHour: 17
        };

        this.initDropZone();
    }

    /**
     * Sets config and re-renders grid background.
     */
    updateConfig(startHour, endHour) {
        this.config.startHour = parseInt(startHour) || 9;
        this.config.endHour = parseInt(endHour) || 17;
        
        // If end is before start (e.g. night shift crossing midnight), handle simple case or clamp
        if (this.config.endHour <= this.config.startHour) this.config.endHour = this.config.startHour + 8;

        this._renderGridLines();
        
        // Re-render blocks if we have data
        if (this.currentScheduleData.length > 0) {
            this.render(this.currentScheduleData);
        }
    }

    _renderGridLines() {
        if (!this.container) return;
        
        // Clear existing grid lines but keep blocks? 
        // Simpler to clear all and let render() put blocks back.
        this.container.innerHTML = ''; 

        for (let h = this.config.startHour; h <= this.config.endHour; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.time = `${h}:00`;
            
            // Format Label (e.g., 9 AM, 1 PM)
            const label = h >= 12 ? (h === 12 ? '12 PM' : `${h-12} PM`) : `${h} AM`;
            
            slot.innerHTML = `
                <span class="time-label">${label}</span>
                <div class="slot-line"></div>
            `;
            this.container.appendChild(slot);
        }
    }

    render(scheduleTasks) {
        this.currentScheduleData = scheduleTasks || [];
        if (!this.container) return;

        // Remove old blocks only (preserve grid lines)
        const oldBlocks = this.container.querySelectorAll('.event-block');
        oldBlocks.forEach(el => el.remove());

        // Ensure grid exists
        if (this.container.children.length === 0) {
            this._renderGridLines();
        }

        scheduleTasks.forEach(task => {
            if (task.start_time) {
                this.container.appendChild(this._createBlock(task));
            }
        });
    }

    _createBlock(task) {
        const [h, m] = task.start_time.split(':').map(Number);
        const taskMins = (h * 60) + m;
        const startMins = this.config.startHour * 60; // Use Config
        
        // Calculate Top relative to start hour (60px per hour height)
        // Note: .time-slot height is 60px in CSS
        const topPx = (taskMins - startMins) + 10; // +10 for visual padding/centering
        const heightPx = task.duration || 30;

        const block = document.createElement('div');
        block.className = 'event-block focus-block';
        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;
        block.draggable = true;
        
        // ... (Drag listeners same as before) ...
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'schedule-block',
                scheduleId: task.schedule_id,
                duration: task.duration || 30
            }));
            e.dataTransfer.effectAllowed = "move";
            block.style.opacity = '0.5';
        });
        block.addEventListener('dragend', () => block.style.opacity = '1');

        const durationStr = ScheduleLogic.formatDuration(heightPx);

        block.innerHTML = `
            <span class="event-title">${task.content}</span>
            <span class="event-time">${task.start_time} (${durationStr})</span>
            <div class="resize-handle"></div>
        `;

        const handle = block.querySelector('.resize-handle');
        this._setupResizing(block, handle, task.schedule_id, heightPx);

        return block;
    }

    _setupResizing(block, handle, scheduleId, initialHeight) {
        // ... (Keep existing resizing logic) ...
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            const startY = e.clientY;
            const onMouseMove = (moveEvent) => {
                const delta = moveEvent.clientY - startY;
                let newHeight = initialHeight + delta;
                newHeight = Math.round(newHeight / 15) * 15;
                if (newHeight < 15) newHeight = 15;
                block.style.height = `${newHeight}px`;
                const timeSpan = block.querySelector('.event-time');
                if(timeSpan) {
                    const text = timeSpan.innerText.split('(')[0].trim();
                    timeSpan.innerText = `${text} (${ScheduleLogic.formatDuration(newHeight)})`;
                }
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const finalHeight = parseInt(block.style.height, 10);
                if (finalHeight !== initialHeight) {
                    Neutralino.extensions.dispatch(EXTENSION_ID, "updateScheduleDuration", {
                        scheduleId: scheduleId,
                        duration: finalHeight,
                        dateKey: this.dateKey
                    });
                }
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    initDropZone() {
        if (!this.container) return;

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;

            try {
                const payload = JSON.parse(data);
                const rect = this.container.getBoundingClientRect();
                const y = e.clientY - rect.top + this.container.scrollTop;
                
                // Pass startHour to calculation
                const proposedTimeStr = ScheduleLogic.pixelsToTime(y, 10, this.config.startHour);

                const activeTask = {
                    schedule_id: payload.scheduleId || null,
                    taskId: payload.taskId,
                    start_time: proposedTimeStr,
                    duration: payload.duration || 30,
                    date_key: this.dateKey
                };

                const { updates, adjustedActiveTime } = ScheduleLogic.recalculateSchedule(this.currentScheduleData, activeTask);

                if (payload.type === 'pool-task') {
                    Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTaskWithCascade", {
                        newTask: {
                            taskId: payload.taskId,
                            dateKey: this.dateKey,
                            startTime: adjustedActiveTime
                        },
                        cascadingUpdates: updates
                    });
                } 
                else if (payload.type === 'schedule-block') {
                    updates.push({
                        scheduleId: payload.scheduleId,
                        startTime: adjustedActiveTime,
                        dateKey: this.dateKey
                    });
                    Neutralino.extensions.dispatch(EXTENSION_ID, "batchUpdateSchedule", {
                        updates: updates,
                        dateKey: this.dateKey
                    });
                }

            } catch (err) {
                console.error("Timeline Drop Error", err);
            }
        });
    }
}