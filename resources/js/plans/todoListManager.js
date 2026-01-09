import { GameAPI } from "../api/GameAPI.js";

class TodoListManager {
    constructor() {
        this.state = {
            tasks: [],
            filter: 'all',
            sortBy: 'priority',
            activeTaskId: null // Track which task is currently open
        };
        
        this.dom = {};
    }

    init() {
        // Cache Main DOM
        this.dom = {
            input: document.getElementById('new-task-input'),
            prioritySelect: document.getElementById('priority-input'),
            addBtn: document.getElementById('add-task-btn'),
            clearBtn: document.getElementById('clear-completed-btn'),
            listContainer: document.getElementById('todo-list-container'),
            tabs: document.querySelectorAll('.tab-btn'),
            
            // Modal DOM
            modal: document.getElementById('todo-detail-modal'),
            modalTitle: document.getElementById('modal-task-title'),
            modalDesc: document.getElementById('modal-task-desc'),
            btnCloseModal: document.getElementById('btn-close-detail-modal'),
            btnSaveDesc: document.getElementById('btn-save-description'),
            saveIndicator: document.getElementById('modal-save-indicator')
        };

        if (!this.dom.listContainer) return;

        this.bindGlobalEvents();
        this.bindTabEvents();
        this.bindModalEvents(); // <--- NEW
        
        GameAPI.getTasks();
    }

    bindGlobalEvents() {
        // ... (Existing add/enter/clear logic) ...
        if (this.dom.addBtn) {
            const newBtn = this.dom.addBtn.cloneNode(true);
            this.dom.addBtn.parentNode.replaceChild(newBtn, this.dom.addBtn);
            this.dom.addBtn = newBtn;
            this.dom.addBtn.addEventListener('click', () => this.createTask());
        }

        if (this.dom.input) {
            const newInput = this.dom.input.cloneNode(true);
            this.dom.input.parentNode.replaceChild(newInput, this.dom.input);
            this.dom.input = newInput;
            this.dom.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.createTask();
            });
        }

        if (this.dom.clearBtn) {
            const newBtn = this.dom.clearBtn.cloneNode(true);
            this.dom.clearBtn.parentNode.replaceChild(newBtn, this.dom.clearBtn);
            this.dom.clearBtn = newBtn;
            this.dom.clearBtn.addEventListener('click', () => {
                if (confirm("Remove all completed tasks?")) {
                    GameAPI.clearCompletedTasks();
                }
            });
        }
    }

    // --- NEW: Modal Events ---
    bindModalEvents() {
        if (!this.dom.modal) return;

        // Close Modal
        this.dom.btnCloseModal.addEventListener('click', () => this.closeModal());
        
        // Close on Outside Click
        this.dom.modal.addEventListener('click', (e) => {
            if (e.target === this.dom.modal) this.closeModal();
        });

        // Save Description
        this.dom.btnSaveDesc.addEventListener('click', () => this.saveDescription());
    }

    bindTabEvents() {
        // ... (Existing tab logic) ...
        this.dom.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.dom.tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.state.filter = e.currentTarget.getAttribute('data-filter');
                this.render();
            });
        });
    }

    // ... (createTask logic remains same) ...
    createTask() {
        const content = this.dom.input.value.trim();
        const priority = this.dom.prioritySelect ? this.dom.prioritySelect.value : 'p4';
        if (!content) return;
        GameAPI.addTask({ content, priority });
        this.dom.input.value = '';
        this.dom.input.focus();
    }

    updateTasks(tasks) {
        this.state.tasks = tasks || [];
        this.render();
    }

    render() {
        if (!this.dom.listContainer) {
            this.dom.listContainer = document.getElementById('todo-list-container');
            if(!this.dom.listContainer) return;
        }

        const filteredTasks = this.filterTasks(this.state.tasks);
        this.updateCounts();

        this.dom.listContainer.innerHTML = '';

        if (filteredTasks.length === 0) {
            this.renderEmptyState();
        } else {
            filteredTasks.forEach(task => {
                this.dom.listContainer.appendChild(this.buildTaskElement(task));
            });
        }
    }

    filterTasks(tasks) {
        // ... (Existing logic) ...
        return tasks.filter(task => {
            const isComplete = task.completed === 1;
            if (this.state.filter === 'pending') return !isComplete;
            if (this.state.filter === 'completed') return isComplete;
            return true;
        });
    }

    buildTaskElement(task) {
        const item = document.createElement('div');
        const priorityClass = task.priority || 'p4';
        const completedClass = task.completed === 1 ? 'completed' : '';
        
        item.className = `task-item ${priorityClass} ${completedClass}`;
        item.dataset.id = task.id; 

        // Add visual cue if description exists
        const hasDescIcon = task.description ? `<i class="fa-solid fa-align-left" style="font-size:0.8rem; margin-left:8px; opacity:0.5;"></i>` : '';

        item.innerHTML = `
            <div class="task-left">
                <label class="check-container">
                    <input type="checkbox" ${task.completed === 1 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${this.escapeHtml(task.content)}</span>
                ${hasDescIcon}
            </div>
            <button class="btn-delete" title="Delete Task">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        // 1. Checkbox click
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop bubbling to item click
        });
        checkbox.addEventListener('change', () => GameAPI.toggleTask(task.id));

        // 2. Delete click
        const delBtn = item.querySelector('.btn-delete');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop bubbling to item click
            if (confirm("Delete this task?")) {
                GameAPI.deleteTask(task.id);
            }
        });

        // 3. Item click (Open Overlay) - Prevent opening if selecting text
        item.addEventListener('click', (e) => {
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                this.openModal(task);
            }
        });

        return item;
    }

    // --- Modal Logic ---

    openModal(task) {
        this.state.activeTaskId = task.id;
        this.dom.modalTitle.textContent = task.content;
        this.dom.modalDesc.value = task.description || "";
        this.dom.saveIndicator.classList.remove('visible');
        this.dom.modal.classList.remove('hidden');
    }

    closeModal() {
        this.dom.modal.classList.add('hidden');
        this.state.activeTaskId = null;
    }

    saveDescription() {
        if (this.state.activeTaskId) {
            const newDesc = this.dom.modalDesc.value;
            GameAPI.updateTaskDescription(this.state.activeTaskId, newDesc);
            
            // Show "Saved" indicator
            this.dom.saveIndicator.classList.add('visible');
            setTimeout(() => {
                this.dom.saveIndicator.classList.remove('visible');
                // Optional: Close modal automatically
                // this.closeModal(); 
            }, 1500);
        }
    }

    // ... (Existing helpers: updateCounts, renderEmptyState, escapeHtml) ...
    updateCounts() {
        const total = this.state.tasks.length;
        const completed = this.state.tasks.filter(t => t.completed === 1).length;
        const pending = total - completed;

        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            const filterType = tab.getAttribute('data-filter');
            const badge = tab.querySelector('.count-badge');
            if (badge) {
                if (filterType === 'all') badge.textContent = total;
                if (filterType === 'pending') badge.textContent = pending;
                if (filterType === 'completed') badge.textContent = completed;
            }
        });
    }

    renderEmptyState() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'empty-state';
        
        const msgs = {
            'pending': "No pending tasks! Time to relax? 🌴",
            'completed': "No completed tasks yet. Get to work! 🚀",
            'all': "No tasks found. Add one above."
        };

        msgDiv.textContent = msgs[this.state.filter] || msgs['all'];
        this.dom.listContainer.appendChild(msgDiv);
    }

    escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Singleton Instance
const manager = new TodoListManager();

export function initTodoList() {
    manager.init();
}

export function renderTasks(tasks) {
    manager.updateTasks(tasks);
}