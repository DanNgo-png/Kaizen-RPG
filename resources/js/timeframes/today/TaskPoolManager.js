import { EXTENSION_ID } from "../../api/_extension_id.js";
import { ScheduleLogic } from "./ScheduleLogic.js";

export class TaskPoolManager {
    constructor(dateKey) {
        this.dateKey = dateKey;
        this.container = document.getElementById('task-pool-list');
        this.badge = document.getElementById('pool-count-badge');
        this.scheduleDataCache = []; // Needed for "Smart Schedule" button
        
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
        
        let prioClass = task.priority === 'p1' ? 'p1' : (task.priority === 'p2' ? 'p2' : '');
        const stagnantClass = task.ageTag ? 'stagnant' : '';
        el.className = `day-task-card ${prioClass} ${stagnantClass}`;
        
        el.draggable = true;
        el.style.cursor = "grab";

        let tagsHtml = '';
        if (task.ageTag) tagsHtml += `<span class="tag tag-stale"><i class="fa-solid fa-clock-rotate-left"></i> ${task.ageTag}</span>`;

        el.innerHTML = `
            <div class="task-check"><i class="fa-regular fa-square"></i></div>
            <div class="task-content">
                <span class="task-title">${task.content}</span>
                <div class="task-tags">${tagsHtml}</div>
            </div>
            <div class="task-actions">
                <button class="btn-icon-sm btn-schedule" title="Add to next slot"><i class="fa-solid fa-calendar-plus"></i></button>
            </div>
        `;

        // 1. CLICK TO SCHEDULE (Smart Stack)
        el.querySelector('.btn-schedule').addEventListener('click', () => {
            const nextTime = ScheduleLogic.getNextAvailableTime(this.scheduleDataCache);
            Neutralino.extensions.dispatch(EXTENSION_ID, "scheduleTask", { 
                taskId: task.id, 
                dateKey: this.dateKey, 
                startTime: nextTime 
            });
        });

        // 2. DRAG START (Pool -> Timeline)
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'pool-task',
                taskId: task.id
            }));
            e.dataTransfer.effectAllowed = "copy";
            el.style.opacity = '0.5';
        });

        el.addEventListener('dragend', () => {
            el.style.opacity = '1';
        });

        return el;
    }

    // Handle dropping a scheduled task back into the pool (Unschedule)
    initDropZone() {
        if (!this.container) return;

        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.container.classList.add('drag-over');
            e.dataTransfer.dropEffect = "move";
        });

        this.container.addEventListener('dragleave', () => {
            this.container.classList.remove('drag-over');
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.container.classList.remove('drag-over');

            const data = e.dataTransfer.getData('application/json');
            if (!data) return;

            try {
                const payload = JSON.parse(data);
                if (payload.type === 'schedule-block') {
                    // UNSCHEDULE ACTION
                    Neutralino.extensions.dispatch(EXTENSION_ID, "unscheduleTask", {
                        scheduleId: payload.scheduleId,
                        dateKey: this.dateKey
                    });
                }
            } catch (err) {
                console.error("Pool Drop Error", err);
            }
        });
    }
}