import { EXTENSION_ID } from "../../api/_extension_id.js";
import { DragState } from "./DragState.js"; 

export class TaskPoolManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('task-pool-list');
        this.badge = document.getElementById('pool-count-badge');
        this.scheduleDataCache = [];
        
        // Initialize the global drag state helper
        DragState.init(); 
        
        this.initDropZone();
    }

    render(poolTasks, scheduleData) {
        this.scheduleDataCache = scheduleData || [];
        if (this.badge) this.badge.textContent = `${poolTasks.length} Pending`;
        if (!this.container) return;

        this.container.innerHTML = '';
        poolTasks.forEach(task => {
            this.container.appendChild(this._createCard(task));
        });
    }

    _createCard(task) {
        const el = document.createElement('div');
        // ... (Keep existing class logic for priority/stagnant) ...
        let prioClass = task.priority === 'p1' ? 'p1' : (task.priority === 'p2' ? 'p2' : '');
        el.className = `day-task-card ${prioClass}`;
        el.draggable = true;

        // Build HTML string once so we can copy it for the avatar
        const innerHTML = `
            <div class="task-check"><i class="fa-regular fa-square"></i></div>
            <div class="task-content">
                <span class="task-title">${task.content}</span>
                <div class="task-tags"><span class="tag tag-dev">Task</span></div>
            </div>
        `;
        el.innerHTML = innerHTML;

        // --- NEW DRAG START LOGIC ---
        el.addEventListener('dragstart', (e) => {
            const taskData = {
                type: 'pool-task',
                taskId: task.id,
                title: task.content,
                duration: 30 // Default duration for new items
            };

            // Pass the card's visual HTML to the helper
            DragState.startDrag(e, taskData, el.outerHTML);
            el.classList.add('is-dragging'); // Opacity for the original item
        });

        el.addEventListener('dragend', () => {
            DragState.endDrag();
            el.classList.remove('is-dragging');
        });

        return el;
    }

    initDropZone() {
        // ... (Keep existing UNSCHEDULE logic for dropping back to pool) ...
        if (!this.container) return;

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.container.classList.add('drag-over');
        });

        this.container.addEventListener('dragleave', () => this.container.classList.remove('drag-over'));

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.container.classList.remove('drag-over');
            const dataRaw = e.dataTransfer.getData('application/json');
            if(!dataRaw) return;
            const payload = JSON.parse(dataRaw);

            // Logic: Only handle 'schedule-block' types (removing from timeline)
            if (payload.type === 'schedule-block') {
                Neutralino.extensions.dispatch(EXTENSION_ID, "unscheduleTask", {
                    scheduleId: payload.scheduleId,
                    dateKey: this.dateKey
                });
            }
        });
    }
}