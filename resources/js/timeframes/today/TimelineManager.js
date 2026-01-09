import { EXTENSION_ID } from "../../api/_extension_id.js";
import { ScheduleLogic } from "./ScheduleLogic.js";

export class TimelineManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('schedule-timeline');
        this.currentScheduleData = [];
        this.initDropZone();
    }

    render(scheduleTasks) {
        this.currentScheduleData = scheduleTasks || [];
        if (!this.container) return;

        const oldBlocks = this.container.querySelectorAll('.event-block');
        oldBlocks.forEach(el => el.remove());

        scheduleTasks.forEach(task => {
            if (task.start_time) {
                this.container.appendChild(this._createBlock(task));
            }
        });
    }

    _createBlock(task) {
        const [h, m] = task.start_time.split(':').map(Number);
        const taskMins = (h * 60) + m;
        const startMins = 9 * 60; 
        
        const topPx = (taskMins - startMins) + 20; 
        const heightPx = task.duration || 30;

        const block = document.createElement('div');
        block.className = 'event-block focus-block';
        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;
        block.draggable = true;
        
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
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
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
                
                // 1. Calculate proposed time based on mouse position
                const proposedTimeStr = ScheduleLogic.pixelsToTime(y);

                const activeTask = {
                    schedule_id: payload.scheduleId || null,
                    taskId: payload.taskId,
                    start_time: proposedTimeStr,
                    duration: payload.duration || 30,
                    date_key: this.dateKey
                };

                // 2. Run Logic: Returns updates for others AND safe time for active task
                const { updates, adjustedActiveTime } = ScheduleLogic.recalculateSchedule(this.currentScheduleData, activeTask);

                // 3. Dispatch Events
                if (payload.type === 'pool-task') {
                    Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTaskWithCascade", {
                        newTask: {
                            taskId: payload.taskId,
                            dateKey: this.dateKey,
                            startTime: adjustedActiveTime // Use safe time
                        },
                        cascadingUpdates: updates
                    });
                } 
                else if (payload.type === 'schedule-block') {
                    // Include the moved task in the batch update with its safe time
                    updates.push({
                        scheduleId: payload.scheduleId,
                        startTime: adjustedActiveTime, // Use safe time
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