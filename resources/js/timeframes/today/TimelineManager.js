import { EXTENSION_ID } from "../../api/_extension_id.js";
import { ScheduleLogic } from "./ScheduleLogic.js";
import { DragState } from "./DragState.js";

export class TimelineManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('schedule-timeline');
        
        // Cache the ghost element
        this.ghostEl = document.getElementById('timeline-ghost-block');
        this.ghostLabel = document.getElementById('ghost-time-label');

        this.currentScheduleData = [];
        this.config = { startHour: 9, endHour: 17 };

        this.initDropZone();
    }

    updateConfig(start, end) {
        this.config.startHour = parseInt(start) || 9;
        this.config.endHour = parseInt(end) || 17;
        this._renderGridLines();
        if (this.currentScheduleData.length > 0) this.render(this.currentScheduleData);
    }

    _renderGridLines() {
        if (!this.container) return;
        // Keep the ghost element safe before clearing!
        const ghost = this.container.querySelector('.ghost-snap-indicator');
        this.container.innerHTML = ''; 
        if(ghost) this.container.appendChild(ghost); // Re-attach ghost

        // Render grid lines with 12h format
        for (let h = this.config.startHour; h <= this.config.endHour; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            // UPDATE: Use formatHourDisplay
            const label = ScheduleLogic.formatHourDisplay(h);
            slot.innerHTML = `<span class="time-label">${label}</span><div class="slot-line"></div>`;
            this.container.appendChild(slot);
        }
    }

    render(scheduleTasks) {
        this.currentScheduleData = scheduleTasks || [];
        if (!this.container) return;

        // Remove old blocks but KEEP GHOST
        const oldBlocks = this.container.querySelectorAll('.event-block');
        oldBlocks.forEach(el => el.remove());

        if (this.container.querySelectorAll('.time-slot').length === 0) this._renderGridLines();

        scheduleTasks.forEach(task => {
            if (task.start_time) {
                this.container.appendChild(this._createBlock(task));
            }
        });
    }

    _createBlock(task) {
        const [h, m] = task.start_time.split(':').map(Number);
        const startMins = this.config.startHour * 60;
        const taskMins = (h * 60) + m;
        
        const topPx = (taskMins - startMins) + 10; // +10 matches the padding in timeline-container
        const heightPx = task.duration || 30;

        const block = document.createElement('div');

        let classList = 'event-block focus-block';
        if (heightPx < 50) { 
            classList += ' compact';
        }
        block.className = classList;

        block.style.top = `${topPx}px`;

        const visualHeight = Math.max(heightPx - 2, 15); // -2 for borders
        block.style.height = `${visualHeight}px`;

        block.draggable = true;

        // --- DRAG START ---
        block.addEventListener('dragstart', (e) => {
            const taskData = {
                type: 'schedule-block',
                scheduleId: task.schedule_id,
                taskId: task.task_id, 
                duration: task.duration || 30,
                title: task.content
            };
            
            // 1. Clone the element to manipulate it for the visual avatar
            const clone = block.cloneNode(true);
            
            // 2. Strip layout-specific styles that cause the offset issue
            clone.style.position = 'static'; 
            clone.style.top = '0px';         
            clone.style.left = '0px';       
            clone.style.width = '100%';      
            clone.style.margin = '0';
            
            // 3. Start drag with cleaned HTML
            DragState.startDrag(e, taskData, clone.outerHTML);
            
            // 4. Visual feedback on original element
            setTimeout(() => block.style.opacity = '0.2', 0);
        });

        block.addEventListener('dragend', () => {
            DragState.endDrag();
            block.style.opacity = '1';
            if (this.ghostEl) this.ghostEl.classList.add('hidden');
        });

        const durationStr = ScheduleLogic.formatDuration(heightPx);
        // UPDATE: Use formatTimeDisplay for the UI
        const displayTime = ScheduleLogic.formatTimeDisplay(task.start_time);

        block.innerHTML = `
            <span class="event-title">${task.content}</span>
            <span class="event-time">${displayTime} (${durationStr})</span>
            <div class="resize-handle"></div>
        `;
        
        const handle = block.querySelector('.resize-handle');
        this._setupResizing(block, handle, task.schedule_id, heightPx); 

        return block;
    }

    _setupResizing(block, handle, scheduleId, initialHeight) {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault(); 

            const startY = e.clientY;
            const startHeight = block.offsetHeight;

            block.classList.add('is-resizing'); 
            block.setAttribute('draggable', 'false');

            const onMouseMove = (moveEvent) => {
                const deltaY = moveEvent.clientY - startY;
                let newHeight = startHeight + deltaY;

                const snapSize = 15;
                newHeight = Math.round(newHeight / snapSize) * snapSize;
                newHeight = Math.max(snapSize, newHeight);

                block.style.height = `${newHeight}px`;
                
                // Live update duration text (Visual only)
                const timeSpan = block.querySelector('.event-time');
                if(timeSpan) {
                    const durStr = ScheduleLogic.formatDuration(newHeight);
                    // Keep the time (which is now e.g. "2:30 PM"), update duration
                    const timePart = timeSpan.textContent.split('(')[0].trim();
                    timeSpan.textContent = `${timePart} (${durStr})`;
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                block.classList.remove('is-resizing');
                block.setAttribute('draggable', 'true');

                const finalDuration = parseInt(block.style.height) || 30;

                if (finalDuration !== initialHeight) {
                    Neutralino.extensions.dispatch(EXTENSION_ID, "updateScheduleDuration", {
                        scheduleId: scheduleId,
                        duration: finalDuration,
                        dateKey: this.dateKey
                    });
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- DROP ZONE LOGIC ---
    initDropZone() {
        if (!this.container) return;

        // 1. DRAG OVER
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            const dragState = DragState.current;
            if (!dragState) return;

            const rect = this.container.getBoundingClientRect();
            const scrollTop = this.container.scrollTop;
            const relativeY = e.clientY - rect.top + scrollTop - 10;

            const snappedY = Math.round(relativeY / 15) * 15;
            
            const startMins = this.config.startHour * 60;
            const currentMins = startMins + snappedY;
            const duration = dragState.duration || 30;
            
            if (currentMins < startMins) return;

            this.ghostEl.classList.remove('hidden');
            this.ghostEl.style.top = `${snappedY + 10}px`; 
            this.ghostEl.style.height = `${duration}px`;
            
            // UPDATE: Use 12h format for Ghost Label
            const start24 = ScheduleLogic.minutesToTime(currentMins);
            const end24 = ScheduleLogic.minutesToTime(currentMins + duration);
            
            const startStr = ScheduleLogic.formatTimeDisplay(start24);
            const endStr = ScheduleLogic.formatTimeDisplay(end24);

            this.ghostLabel.textContent = `${startStr} - ${endStr}`;
        });

        // 2. DRAG LEAVE
        this.container.addEventListener('dragleave', (e) => {
            if (e.relatedTarget && !this.container.contains(e.relatedTarget)) {
                this.ghostEl.classList.add('hidden');
            }
        });

        // 3. DROP
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.ghostEl.classList.add('hidden');
            
            const payload = DragState.current;
            if (!payload) return;

            const rect = this.container.getBoundingClientRect();
            const scrollTop = this.container.scrollTop;
            const relativeY = e.clientY - rect.top + scrollTop - 10;
            const snappedY = Math.round(relativeY / 15) * 15;
            
            const startMins = (this.config.startHour * 60) + snappedY;
            // DB still needs 24h format
            const timeStr = ScheduleLogic.minutesToTime(startMins);

            const activeTask = {
                schedule_id: payload.scheduleId || null,
                taskId: payload.taskId,
                start_time: timeStr,
                duration: payload.duration,
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
        });
    }
}