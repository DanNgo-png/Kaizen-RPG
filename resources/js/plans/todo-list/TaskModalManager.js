import { GameAPI } from "../../api/GameAPI.js";
import { DateSidecarManager } from "./DateSidecarManager.js";

export class TaskModalManager {
    constructor() {
        this.activeTaskId = null;
        this.activeListId = 1;
        this.originalDescription = "";
        
        this.dom = {};
        this.sidecar = null;

        // Note: We don't bind events in constructor anymore
        // We wait for init() which is called when the page actually loads
    }

    init() {
        // 1. Cache DOM (Now that page is loaded)
        this.dom = {
            modal: document.getElementById('todo-detail-modal'),
            modalCard: document.getElementById('todo-modal-card'),
            title: document.getElementById('modal-task-title'),
            desc: document.getElementById('modal-task-desc'),
            priority: document.getElementById('modal-task-priority'),
            listSelect: document.getElementById('modal-task-list'),
            btnClose: document.getElementById('btn-close-detail-modal'),
            saveIndicator: document.getElementById('modal-save-indicator'),
            
            btnDateTrigger: document.getElementById('btn-trigger-date-sidecar'),
            btnDateText: document.getElementById('btn-date-text')
        };

        if (!this.dom.modal) return;

        // 2. Initialize Sidecar
        this.sidecar = new DateSidecarManager({
            onDateSelect: (dateStr) => this._handleDateSelect(dateStr),
            onRepeatChange: (rule) => this._handleRepeatChange(rule)
        });

        // 3. Bind Events
        this._bindEvents();
    }

    _bindEvents() {
        // Close Buttons
        this.dom.btnClose.addEventListener('click', () => this.saveAndClose());
        
        this.dom.modal.addEventListener('click', (e) => {
            if (e.target === this.dom.modal) this.saveAndClose();
        });

        this.dom.modalCard.addEventListener('click', (e) => {
            if (this.sidecar && !e.target.closest('#btn-trigger-date-sidecar')) {
                this.sidecar.close();
            }
        });

        this.dom.btnDateTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.sidecar) this.sidecar.toggle(this.dom.btnDateTrigger);
        });

        this.dom.priority.addEventListener('change', (e) => {
            if (this.activeTaskId) {
                GameAPI.updateTaskPriority(this.activeTaskId, e.target.value, this.activeListId);
                this._showSaveIndicator();
            }
        });

        this.dom.listSelect.addEventListener('change', (e) => {
            if (this.activeTaskId) {
                const newListId = parseInt(e.target.value);
                GameAPI.moveTask(this.activeTaskId, newListId, this.activeListId);
                this.close(); 
            }
        });
    }

    open(task, lists, currentListId) {
        if (!this.dom.modal) return;

        this.activeTaskId = task.id;
        this.activeListId = currentListId;
        this.originalDescription = task.description || "";

        this.dom.title.textContent = task.content;
        this.dom.desc.value = task.description || "";
        this.dom.priority.value = task.priority || 'p4';
        
        this._populateListSelect(lists, currentListId);
        this._updateDateUI(task.due_date);

        if (this.sidecar) {
            this.sidecar.initWidget(task.due_date, task.repeat_rule);
        }

        this.dom.saveIndicator.classList.remove('visible');
        this.dom.modal.classList.remove('hidden');
    }

    saveAndClose() {
        if (this.activeTaskId) {
            const currentDesc = this.dom.desc.value;
            if (currentDesc !== this.originalDescription) {
                GameAPI.updateTaskDescription(this.activeTaskId, currentDesc, this.activeListId);
            }
        }
        this.close();
    }

    close() {
        if (this.dom.modal) this.dom.modal.classList.add('hidden');
        if (this.sidecar) this.sidecar.close();
        this.activeTaskId = null;
    }

    destroy() {
        if (this.sidecar) {
            this.sidecar.destroy();
            this.sidecar = null;
        }
        this.dom = {};
    }

    _handleDateSelect(dateStr) {
        if(this.dom.btnDateText) this.dom.btnDateText.textContent = dateStr;
        this.dom.btnDateTrigger.classList.add('active');
        // Actual save logic if needed via API
        this._showSaveIndicator();
    }

    _handleRepeatChange(rule) {
        console.log(`Saving repeat ${rule}`);
    }

    _populateListSelect(lists, currentId) {
        this.dom.listSelect.innerHTML = '';
        lists.forEach(list => {
            const opt = document.createElement('option');
            opt.value = list.id;
            opt.textContent = list.title;
            if (list.id === currentId) opt.selected = true;
            this.dom.listSelect.appendChild(opt);
        });
    }

    _updateDateUI(dateStr) {
        if (dateStr) {
            this.dom.btnDateText.textContent = dateStr;
            this.dom.btnDateTrigger.classList.add('active');
        } else {
            this.dom.btnDateText.textContent = "Set Due Date";
            this.dom.btnDateTrigger.classList.remove('active');
        }
    }

    _showSaveIndicator() {
        this.dom.saveIndicator.classList.add('visible');
        setTimeout(() => {
            if(this.dom.saveIndicator) this.dom.saveIndicator.classList.remove('visible');
        }, 2000);
    }
}