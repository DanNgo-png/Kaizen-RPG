import { GameAPI } from "../api/GameAPI.js";

class TodoListManager {
    constructor() {
        this.state = {
            tasks: [],
            lists: [],
            activeListId: 1, // Default to Inbox (ID 1)
            activeListTitle: 'Inbox',
            activeListIcon: 'fa-solid fa-inbox',
            filter: 'all', // 'all', 'pending', 'completed'
            activeTaskId: null // For the details modal
        };
        
        this.dom = {};
    }

    init() {
        // --- 1. Cache DOM Elements ---
        this.dom = {
            // Sidebar Elements
            listsNav: document.getElementById('todo-lists-nav'),
            btnAddList: document.getElementById('btn-add-list'),
            
            // Header Elements
            headerTitle: document.getElementById('active-list-title'),
            
            // Task Input & Controls
            input: document.getElementById('new-task-input'),
            prioritySelect: document.getElementById('priority-input'),
            addBtn: document.getElementById('add-task-btn'),
            clearBtn: document.getElementById('clear-completed-btn'),
            btnDeleteList: document.getElementById('btn-delete-list'), // New button in tabs area
            
            // Containers
            listContainer: document.getElementById('todo-list-container'),
            tabs: document.querySelectorAll('.tab-btn'),
            
            // Modal Elements
            modal: document.getElementById('todo-detail-modal'),
            modalTitle: document.getElementById('modal-task-title'),
            modalDesc: document.getElementById('modal-task-desc'),
            btnCloseModal: document.getElementById('btn-close-detail-modal'),
            btnSaveDesc: document.getElementById('btn-save-description'),
            saveIndicator: document.getElementById('modal-save-indicator')
        };

        if (!this.dom.listContainer) return;

        // --- 2. Bind Events ---
        this.bindGlobalEvents();
        this.bindListEvents();
        this.bindTabEvents();
        this.bindModalEvents();
        
        // --- 3. Listen for Data ---
        Neutralino.events.off('receiveTodoLists', this._onReceiveLists);
        Neutralino.events.on('receiveTodoLists', (e) => this.renderLists(e.detail));

        // Note: TaskHandler calls renderTasks() externally, but we can also listen directly if needed.
        // The renderTasks function exported at the bottom handles the data injection into this manager.

        // --- 4. Initial Load ---
        GameAPI.getTodoLists();
        GameAPI.getTasks(this.state.activeListId);
    }

    // --- Event Binding ---

    bindGlobalEvents() {
        // Add Task Button
        if (this.dom.addBtn) {
            const newBtn = this.dom.addBtn.cloneNode(true);
            this.dom.addBtn.parentNode.replaceChild(newBtn, this.dom.addBtn);
            this.dom.addBtn = newBtn;
            this.dom.addBtn.addEventListener('click', () => this.createTask());
        }

        // Enter Key in Input (FIX: Duplicate Task Issue)
        // Changed from 'keypress' to 'keydown' with check for !e.repeat
        if (this.dom.input) {
            const newInput = this.dom.input.cloneNode(true);
            this.dom.input.parentNode.replaceChild(newInput, this.dom.input);
            this.dom.input = newInput;
            this.dom.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.repeat) this.createTask();
            });
        }

        // Clear Completed Tasks
        if (this.dom.clearBtn) {
            const newBtn = this.dom.clearBtn.cloneNode(true);
            this.dom.clearBtn.parentNode.replaceChild(newBtn, this.dom.clearBtn);
            this.dom.clearBtn = newBtn;
            this.dom.clearBtn.addEventListener('click', () => {
                // Double check state before action
                const hasCompleted = this.state.tasks.some(t => t.completed === 1);
                if (!hasCompleted) return;

                if (confirm(`Remove all completed tasks from "${this.state.activeListTitle}"?`)) {
                    GameAPI.clearCompletedTasks(this.state.activeListId);
                }
            });
        }
    }

    bindListEvents() {
        // Add New List
        if (this.dom.btnAddList) {
            this.dom.btnAddList.addEventListener('click', () => {
                const name = prompt("Enter new list name:");
                if (name && name.trim() !== "") {
                    GameAPI.addTodoList(name.trim(), "fa-solid fa-list");
                }
            });
        }

        // Delete Current List
        if (this.dom.btnDeleteList) {
            this.dom.btnDeleteList.addEventListener('click', () => {
                if (this.state.activeListId === 1) return; // Protect Inbox

                if (confirm(`Delete list "${this.state.activeListTitle}" and all its tasks? This cannot be undone.`)) {
                    GameAPI.deleteTodoList(this.state.activeListId);
                    // Revert to Inbox immediately
                    this.switchList(1, 'Inbox', 'fa-solid fa-inbox'); 
                }
            });
        }
    }

    bindTabEvents() {
        this.dom.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.dom.tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.state.filter = e.currentTarget.getAttribute('data-filter');
                this.render(); // Re-render current tasks with new filter
            });
        });
    }

    bindModalEvents() {
        if (!this.dom.modal) return;

        // Close Modal via Button
        this.dom.btnCloseModal.addEventListener('click', () => this.closeModal());
        
        // Close via Outside Click
        this.dom.modal.addEventListener('click', (e) => {
            if (e.target === this.dom.modal) this.closeModal();
        });

        // Save Description
        this.dom.btnSaveDesc.addEventListener('click', () => this.saveDescription());
    }

    // --- List Logic ---

    renderLists(lists) {
        this.state.lists = lists || [];
        if (!this.dom.listsNav) return;

        this.dom.listsNav.innerHTML = '';

        this.state.lists.forEach(list => {
            const btn = document.createElement('button');
            const isActive = list.id === this.state.activeListId;
            btn.className = `list-item-btn ${isActive ? 'active' : ''}`;
            btn.innerHTML = `<i class="${list.icon}"></i> ${list.title}`;
            
            btn.addEventListener('click', () => {
                this.switchList(list.id, list.title, list.icon);
            });

            this.dom.listsNav.appendChild(btn);
        });
    }

    switchList(id, title, icon) {
        // 1. Update State
        this.state.activeListId = id;
        this.state.activeListTitle = title;
        this.state.activeListIcon = icon;

        // 2. Update Header UI
        if (this.dom.headerTitle) {
            this.dom.headerTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
        }

        // 3. Toggle Delete Button (Hidden for Inbox ID 1)
        if (this.dom.btnDeleteList) {
            if (id === 1) this.dom.btnDeleteList.classList.add('hidden');
            else this.dom.btnDeleteList.classList.remove('hidden');
        }

        // 4. Update Sidebar Highlights
        this.renderLists(this.state.lists);

        // 5. Fetch Tasks for this List
        GameAPI.getTasks(id);
    }

    // --- Task Logic ---

    createTask() {
        const content = this.dom.input.value.trim();
        const priority = this.dom.prioritySelect ? this.dom.prioritySelect.value : 'p4';
        
        if (!content) return;
        
        // Pass activeListId to API
        GameAPI.addTask({ 
            content, 
            priority, 
            listId: this.state.activeListId 
        });
        
        this.dom.input.value = '';
        this.dom.input.focus();
    }

    updateTasks(tasks) {
        this.state.tasks = tasks || [];
        this.render();
    }

    render() {
        if (!this.dom.listContainer) {
            // Re-cache if missing (safety for page navigation)
            this.dom.listContainer = document.getElementById('todo-list-container');
            if(!this.dom.listContainer) return;
        }

        const filteredTasks = this.filterTasks(this.state.tasks);
        this.updateCounts();
        this.updateClearButtonState(); // FIX: Update button status

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
        return tasks.filter(task => {
            const isComplete = task.completed === 1;
            if (this.state.filter === 'pending') return !isComplete;
            if (this.state.filter === 'completed') return isComplete;
            return true; // 'all'
        });
    }

    buildTaskElement(task) {
        const item = document.createElement('div');
        const priorityClass = task.priority || 'p4';
        const completedClass = task.completed === 1 ? 'completed' : '';
        
        item.className = `task-item ${priorityClass} ${completedClass}`;
        item.dataset.id = task.id; 

        const hasDescIcon = task.description 
            ? `<i class="fa-solid fa-align-left" style="font-size:0.8rem; margin-left:8px; opacity:0.5;"></i>` 
            : '';

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
        // FIX: Prevent row click (Modal) when clicking the label container
        const checkContainer = item.querySelector('.check-container');
        checkContainer.addEventListener('click', (e) => e.stopPropagation());

        const checkbox = item.querySelector('input[type="checkbox"]');
        // Pass listId to toggleTask to refresh correct list
        checkbox.addEventListener('change', () => GameAPI.toggleTask(task.id, this.state.activeListId));

        // 2. Delete click
        const delBtn = item.querySelector('.btn-delete');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete this task?")) {
                GameAPI.deleteTask(task.id, this.state.activeListId);
            }
        });

        // 3. Item click (Open Details)
        item.addEventListener('click', () => {
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                this.openModal(task);
            }
        });

        return item;
    }

    // --- Helper: Clear Button Logic (FIX) ---
    updateClearButtonState() {
        if (!this.dom.clearBtn) return;
        
        const hasCompleted = this.state.tasks.some(t => t.completed === 1);
        
        this.dom.clearBtn.disabled = !hasCompleted;
        this.dom.clearBtn.style.opacity = hasCompleted ? '1' : '0.5';
        this.dom.clearBtn.style.cursor = hasCompleted ? 'pointer' : 'not-allowed';
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
            // Pass listId for refresh
            GameAPI.updateTaskDescription(this.state.activeTaskId, newDesc, this.state.activeListId);
            
            // Visual feedback
            this.dom.saveIndicator.classList.add('visible');
            setTimeout(() => {
                this.dom.saveIndicator.classList.remove('visible');
            }, 1500);
        }
    }

    // --- Utilities ---

    updateCounts() {
        const total = this.state.tasks.length;
        const completed = this.state.tasks.filter(t => t.completed === 1).length;
        const pending = total - completed;

        this.dom.tabs.forEach(tab => {
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