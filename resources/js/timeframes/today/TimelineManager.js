import { EXTENSION_ID } from "../../api/_extension_id.js";
import { ScheduleLogic } from "./ScheduleLogic.js";

export class TimelineManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('schedule-timeline');
        
        this.initDropZone();
    }

    render(scheduleTasks) {
        if (!this.container) return;

        // Clear existing blocks (but keep time slots/grid lines if they are static)
        // Assuming blocks are appended with class 'event-block'
        const oldBlocks = this.container.querySelectorAll('.event-block');
        oldBlocks.forEach(el => el.remove());

        scheduleTasks.forEach(task => {
            if (task.start_time) {
                const block = this._createBlock(task);
                this.container.appendChild(block);
            }
        });
    }

    _createBlock(task) {
        const [h, m] = task.start_time.split(':').map(Number);
        const taskMins = (h * 60) + m;
        const startMins = 9 * 60; // 9 AM reference
        
        const topPx = (taskMins - startMins) + 20; 
        const heightPx = task.duration || 30;

        const block = document.createElement('div');
        block.className = 'event-block focus-block';
        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;
        
        block.draggable = true;
        
        // Drag for Moving (Visual Logic handled by drop zone)
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'schedule-block',
                scheduleId: task.schedule_id
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
                
                // Snap to 15m (15px)
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
                
                // Handle drop from Pool
                if (payload.type === 'pool-task') {
                    const rect = this.container.getBoundingClientRect();
                    const y = e.clientY - rect.top + this.container.scrollTop;
                    const timeStr = ScheduleLogic.pixelsToTime(y);

                    Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTask", { 
                        taskId: payload.taskId, 
                        dateKey: this.dateKey, 
                        startTime: timeStr
                    });
                }
                // Handle self-drop (Move within timeline - Future Implementation)
            } catch (err) {
                console.error("Timeline Drop Error", err);
            }
        });
    }
}