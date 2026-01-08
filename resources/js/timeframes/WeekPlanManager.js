import { GameAPI } from "../api/GameAPI.js";
import { EXTENSION_ID } from "../api/_extension_id.js";

export class WeekPlanManager {
    constructor() {
        this.currentDate = new Date();
        // Calculate start of week (Monday)
        this.startOfWeek = this.getMonday(this.currentDate);
        this.endOfWeek = new Date(this.startOfWeek);
        this.endOfWeek.setDate(this.endOfWeek.getDate() + 6);

        this.dom = {
            rangeLabel: document.querySelector('.week-date-range'),
            poolList: document.querySelector('.pool-list'),
            poolBadge: document.querySelector('.weekly-pool .count-badge'),
            gridContainer: document.querySelector('.week-grid'),
            stats: {
                completion: document.querySelector('.w-stat-val.text-green'),
                goal: document.querySelector('.w-stat-val.text-blue')
            }
        };

        this.init();
    }

    init() {
        this.updateHeader();
        
        // Listen for Data
        Neutralino.events.off('receiveWeekPlanData', this.onDataReceived);
        Neutralino.events.on('receiveWeekPlanData', (e) => this.render(e.detail));

        // Listen for Refresh triggers (from other views)
        Neutralino.events.on('refreshTodayView', () => this.fetchData());

        // Setup Pool Drop Zone (Backlog)
        this.setupDropZone(document.querySelector('.weekly-pool'), 'pool');

        this.fetchData();
    }

    fetchData() {
        const startStr = this.toSQL(this.startOfWeek);
        const endStr = this.toSQL(this.endOfWeek);
        
        Neutralino.extensions.dispatch(EXTENSION_ID, "getWeekPlanData", { 
            startDate: startStr, 
            endDate: endStr 
        });
    }

    render(data) {
        // 1. Render Backlog
        this.dom.poolList.innerHTML = '';
        this.dom.poolBadge.textContent = data.backlog.length;
        
        data.backlog.forEach(task => {
            const card = this.createCard(task);
            this.dom.poolList.appendChild(card);
        });

        // 2. Render Week Grid
        this.dom.gridContainer.innerHTML = '';
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let totalScheduled = 0;
        let totalCompleted = 0;

        // Iterate 0-6 days
        for (let i = 0; i < 7; i++) {
            const currentDayDate = new Date(this.startOfWeek);
            currentDayDate.setDate(currentDayDate.getDate() + i);
            const dateKey = this.toSQL(currentDayDate);
            const isToday = (dateKey === this.toSQL(new Date()));
            const isWeekend = (i === 5 || i === 6);

            const dayTasks = data.weekSchedule[dateKey] || [];
            totalScheduled += dayTasks.length;
            totalCompleted += dayTasks.filter(t => t.completed).length;

            // Calculate Progress Bar
            const dayCompleted = dayTasks.filter(t => t.completed).length;
            const progress = dayTasks.length > 0 ? (dayCompleted / dayTasks.length) * 100 : 0;

            // Create Column
            const col = document.createElement('div');
            col.className = `day-column ${isToday ? 'is-today' : ''} ${isWeekend ? 'weekend' : ''}`;
            col.dataset.date = dateKey;

            // Header HTML
            const headerHtml = `
                <div class="timeframe-day-header">
                    <span class="day-name">${dayNames[i]}</span>
                    <span class="day-number">${currentDayDate.getDate()}</span>
                    <div class="day-progress">
                        <div class="day-progress-bar" style="width: ${progress}%;"></div>
                    </div>
                </div>
                <div class="day-tasks" id="day-${dateKey}">
                    <!-- Tasks go here -->
                </div>
            `;
            col.innerHTML = headerHtml;

            // Inject Tasks
            const tasksContainer = col.querySelector('.day-tasks');
            dayTasks.forEach(task => {
                const card = this.createCard(task, true); // true = isScheduled
                tasksContainer.appendChild(card);
            });

            // Make it a Drop Zone
            this.setupDropZone(col, 'day', dateKey);

            this.dom.gridContainer.appendChild(col);
        }

        // 3. Update Global Stats
        const globalRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
        if(this.dom.stats.completion) this.dom.stats.completion.textContent = `${globalRate}%`;
        if(this.dom.stats.goal) this.dom.stats.goal.textContent = `${totalScheduled} Tasks`;
    }

    createCard(task, isScheduled = false) {
        const div = document.createElement('div');
        
        let pClass = '';
        if (task.priority === 'p1') pClass = 'p-high';
        else if (task.priority === 'p2') pClass = 'p-med';
        
        div.className = `week-card ${pClass} ${task.completed ? 'completed' : ''}`;
        div.draggable = true;
        div.dataset.taskId = task.id;
        
        // Save Schedule ID if it exists (for unscheduling)
        if (task.schedule_id) div.dataset.scheduleId = task.schedule_id;

        div.innerHTML = `
            <div class="wc-header">
                <span class="wc-title">${task.content}</span>
                <i class="${task.completed ? 'fa-solid fa-square-check' : 'fa-regular fa-square'} wc-check"></i>
            </div>
            <div class="wc-footer">
                <span class="wc-tag">${task.priority.toUpperCase()}</span>
                ${isScheduled ? '<span class="wc-est"><i class="fa-solid fa-calendar"></i></span>' : ''}
            </div>
        `;

        // --- Drag Events ---
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                taskId: task.id,
                scheduleId: task.schedule_id || null,
                origin: isScheduled ? 'day' : 'pool'
            }));
            e.dataTransfer.effectAllowed = "move";
            
            // Delay adding class so the drag ghost image looks normal
            setTimeout(() => div.classList.add('is-dragging'), 0);
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('is-dragging');
        });

        // Click to Toggle (Simple interaction)
        div.querySelector('.wc-check').addEventListener('click', (e) => {
            e.stopPropagation();
            GameAPI.toggleTask(task.id);
            // Optimistic UI toggle
            div.classList.toggle('completed');
            // Refresh data shortly after
            setTimeout(() => this.fetchData(), 200); 
        });

        return div;
    }

    setupDropZone(element, type, dateKey = null) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');

            const raw = e.dataTransfer.getData('text/plain');
            if (!raw) return;

            const data = JSON.parse(raw);
            
            // Logic Router
            if (type === 'day' && dateKey) {
                // Dropped onto a Day
                this.handleScheduleTask(data, dateKey);
            } else if (type === 'pool') {
                // Dropped onto Backlog
                this.handleUnscheduleTask(data);
            }
        });
    }

    handleScheduleTask(data, dateKey) {
        // If already on this day, do nothing (or reorder if implementing sorting)
        // If coming from another day, update entry
        // If coming from pool, create entry
        
        // Optimistic UI: We rely on the refresh, but we could append card immediately
        
        if (data.origin === 'day') {
            // It was already scheduled, update the date
            // Note: We need a backend endpoint to "Move" or just update
            // Currently using 'unschedule' + 'schedule' sequence or 'updateEntry'
            // For simplicity/robustness: Just schedule it (backend upsert handles ID)
            // But wait, if we have scheduleId, let's update.
            // ... Actually TimeframeController.scheduleTask uses INSERT. 
            // Better to Unschedule old then Schedule new, OR make backend smart.
            
            // Let's use the robust approach: 
            if (data.scheduleId) {
                // We actually need a "moveTask" endpoint or just raw update
                // Re-using TimeframeRepo.addToDay which handles inserts. 
                // We should delete the old entry first if moving between days.
                Neutralino.extensions.dispatch(EXTENSION_ID, "unscheduleTask", { 
                    scheduleId: data.scheduleId, 
                    dateKey: "dummy" // dateKey ignored in delete usually
                });
            }
        }

        Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTask", { 
            taskId: data.taskId, 
            dateKey: dateKey,
            startTime: null // Full day task
        });
        
        // Refresh triggers via event listener
    }

    handleUnscheduleTask(data) {
        if (data.origin === 'pool') return; // Already in pool

        if (data.scheduleId) {
            Neutralino.extensions.dispatch(EXTENSION_ID, "unscheduleTask", { 
                scheduleId: data.scheduleId,
                dateKey: "dummy" 
            });
        }
    }

    // --- Helpers ---
    
    getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0,0,0,0);
        return monday;
    }

    toSQL(d) {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }

    updateHeader() {
        const opt = { month: 'short', day: 'numeric' };
        const s = this.startOfWeek.toLocaleDateString('en-US', opt);
        const e = this.endOfWeek.toLocaleDateString('en-US', { ...opt, year: 'numeric' });
        if(this.dom.rangeLabel) this.dom.rangeLabel.textContent = `${s} - ${e}`;
    }
}

// Hook for main.js
export function initWeekPlan() {
    new WeekPlanManager();
}