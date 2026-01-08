import { GameAPI } from "../api/GameAPI.js";
import { EXTENSION_ID } from "../api/_extension_id.js";

export class TodayManager {
    constructor() {
        this.now = new Date();
        this.dateKey = this.now.toISOString().split('T')[0];

        this.dom = {
            // ... existing dom elements ...
            weekday: document.getElementById('today-weekday'),
            fullDate: document.getElementById('today-full-date'),
            goalContainer: document.getElementById('daily-goal-container'),
            goalText: document.getElementById('daily-goal-text'),
            poolList: document.getElementById('task-pool-list'),
            poolBadge: document.getElementById('pool-count-badge'),
            timeline: document.getElementById('schedule-timeline'),
            currentTimeLine: document.getElementById('current-time-line'),
            timeNowText: document.getElementById('time-now-text')
        };

        this.init();
    }

    init() {
        if (!this.dom.weekday) return;

        // ... existing date setup ...
        const options = { weekday: 'long' };
        this.dom.weekday.textContent = this.now.toLocaleDateString('en-US', options);
        this.dom.fullDate.textContent = this.now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // ... existing listeners ...
        this.dom.goalContainer.addEventListener('click', () => this.promptDailyGoal());

        // Bind Backend Events
        Neutralino.events.on('receiveTodayData', (e) => this.render(e.detail));
        Neutralino.events.on('refreshTodayView', (e) => {
            if(e.detail.dateKey === this.dateKey) this.fetchData();
        });

        // Setup Drop Zone on Pool List (To receive tasks from timeline)
        this.setupPoolDropZone();

        this.fetchData();
        this.updateCurrentTimeLine();
        setInterval(() => this.updateCurrentTimeLine(), 60000);
    }

    fetchData() {
        Neutralino.extensions.dispatch(EXTENSION_ID, "getTodayData", { dateKey: this.dateKey });
    }

    // ... render, createPoolCard methods remain mostly same ...
    
    render(data) {
        // ... (Update Goal logic) ...
        if (data.dailyGoal && data.dailyGoal.title) {
            this.dom.goalText.textContent = data.dailyGoal.title;
            this.dom.goalContainer.classList.add('active');
        }

        // ... (Render Pool logic) ...
        this.dom.poolList.innerHTML = '';
        this.dom.poolBadge.textContent = `${data.pool.length} Pending`;
        data.pool.forEach(task => {
            const el = this.createPoolCard(task);
            this.dom.poolList.appendChild(el);
        });

        // Render Schedule
        const oldBlocks = this.dom.timeline.querySelectorAll('.event-block');
        oldBlocks.forEach(el => el.remove());

        data.schedule.forEach(task => {
            if (task.start_time) {
                const block = this.createScheduleBlock(task);
                this.dom.timeline.appendChild(block);
            }
        });
    }
    
    createPoolCard(task) {
        // ... (Keep existing implementation) ...
        // Ensure this method returns the element as per previous code
        const el = document.createElement('div');
        // ... class setup ...
        // ... innerHTML ...
        // ... listeners ...
        // (Copy from previous response)
        // ...
        
        let prioClass = task.priority === 'p1' ? 'p1' : (task.priority === 'p2' ? 'p2' : '');
        const stagnantClass = task.ageTag ? 'stagnant' : '';
        el.className = `day-task-card ${prioClass} ${stagnantClass}`;
        
        let tagsHtml = '';
        if (task.ageTag) tagsHtml += `<span class="tag tag-stale"><i class="fa-solid fa-clock-rotate-left"></i> ${task.ageTag}</span>`;

        el.innerHTML = `
            <div class="task-check"><i class="fa-regular fa-square"></i></div>
            <div class="task-content">
                <span class="task-title">${task.content}</span>
                <div class="task-tags">${tagsHtml}</div>
            </div>
            <div class="task-actions">
                <button class="btn-icon-sm btn-schedule"><i class="fa-solid fa-calendar-plus"></i></button>
            </div>
        `;

        el.querySelector('.btn-schedule').addEventListener('click', () => {
            Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTask", { 
                taskId: task.id, 
                dateKey: this.dateKey, 
                startTime: "09:00" 
            });
        });

        return el;
    }

    createScheduleBlock(task) {
        const [h, m] = task.start_time.split(':').map(Number);
        const taskMins = (h * 60) + m;
        const startMins = 9 * 60; // 9 AM
        
        const topPx = (taskMins - startMins) + 20; 
        const heightPx = task.duration || 30; // Default to 30 if null

        const block = document.createElement('div');
        block.className = 'event-block focus-block';
        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;
        
        // --- 1. DRAG LOGIC (Back to Pool) ---
        block.draggable = true;
        
        block.addEventListener('dragstart', (e) => {
            // Attach ID to drag payload
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'schedule-block',
                scheduleId: task.schedule_id
            }));
            e.dataTransfer.effectAllowed = "move";
            block.style.opacity = '0.5';
        });

        block.addEventListener('dragend', () => {
            block.style.opacity = '1';
        });

        // --- 2. RESIZE LOGIC ---
        // Create inner content
        block.innerHTML = `
            <span class="event-title">${task.content}</span>
            <span class="event-time">${task.start_time} (${task.duration}m)</span>
            <div class="resize-handle"></div>
        `;

        const handle = block.querySelector('.resize-handle');
        this.setupResizing(block, handle, task.schedule_id, heightPx);

        return block;
    }

    setupResizing(block, handle, scheduleId, initialHeight) {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop dragstart from firing on parent

            const startY = e.clientY;
            const startHeight = parseInt(document.defaultView.getComputedStyle(block).height, 10);
            
            // Temporary overlay to catch mouse events globally during drag
            const onMouseMove = (moveEvent) => {
                const delta = moveEvent.clientY - startY;
                let newHeight = startHeight + delta;
                
                // Snap to 15 minute increments (15px)
                // Math: Round to nearest 15
                newHeight = Math.round(newHeight / 15) * 15;

                // Minimum height 15px (15 mins)
                if (newHeight < 15) newHeight = 15;

                block.style.height = `${newHeight}px`;
                
                // Update text visually immediately
                const timeSpan = block.querySelector('.event-time');
                if(timeSpan) {
                    const text = timeSpan.innerText.split('(')[0];
                    timeSpan.innerText = `${text}(${newHeight}m)`;
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Calculate final duration (1px = 1min)
                const finalHeight = parseInt(block.style.height, 10);
                
                // Send to backend
                if (finalHeight !== startHeight) {
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

    setupPoolDropZone() {
        const pool = this.dom.poolList;

        pool.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            pool.classList.add('drag-over');
            e.dataTransfer.dropEffect = "move";
        });

        pool.addEventListener('dragleave', () => {
            pool.classList.remove('drag-over');
        });

        pool.addEventListener('drop', (e) => {
            e.preventDefault();
            pool.classList.remove('drag-over');

            const data = e.dataTransfer.getData('application/json');
            if (!data) return;

            try {
                const payload = JSON.parse(data);
                if (payload.type === 'schedule-block') {
                    // UNSCHEDULE
                    Neutralino.extensions.dispatch(EXTENSION_ID, "unscheduleTask", {
                        scheduleId: payload.scheduleId,
                        dateKey: this.dateKey
                    });
                }
            } catch (err) {
                console.error("Drop Parse Error", err);
            }
        });
    }

    // ... existing promptDailyGoal, updateCurrentTimeLine ...
    updateCurrentTimeLine() {
        const now = new Date();
        const mins = (now.getHours() * 60) + now.getMinutes();
        const startMins = 9 * 60;
        const topPx = (mins - startMins) + 20;

        if (topPx > 0 && topPx < 600) {
            this.dom.currentTimeLine.style.display = 'block';
            this.dom.currentTimeLine.style.top = `${topPx}px`;
            this.dom.timeNowText.textContent = now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
        } else {
            this.dom.currentTimeLine.style.display = 'none';
        }
    }
    
    promptDailyGoal() {
        const current = this.dom.goalText.textContent;
        const newGoal = prompt("Main Focus:", current);
        if (newGoal) {
            Neutralino.extensions.dispatch(EXTENSION_ID, "setDailyGoal", { dateKey: this.dateKey, title: newGoal });
            this.dom.goalText.textContent = newGoal; 
        }
    }
}

export function initTodayView() {
    new TodayManager();
}