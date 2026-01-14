import { TaskAPI } from "../api/TaskAPI.js";
import { TaskRenderer } from "./todo-list/TaskRenderer.js";
import { TaskModalManager } from "./todo-list/TaskModalManager.js";

class TodoListManager {
    constructor() {
        this.state = {
            tasks: [],
            lists: [],
            activeListId: 1, 
            activeListTitle: 'Inbox',
            activeListIcon: 'fa-solid fa-inbox',
            filter: 'all'
        };

        this.renderer = null;
        this.modalManager = null;
        this.dom = {};
    }

    init() {
        // 1. Cleanup previous instances (crucial for Single Page App navigation)
        if (this.modalManager) {
            this.modalManager.destroy();
            this.modalManager = null;
        }

        // 2. Cache DOM (NOW safe because page is loaded)
        this.dom = {
            listsNav: document.getElementById('todo-lists-nav'),
            listContainer: document.getElementById('todo-list-container'),
            headerTitle: document.getElementById('active-list-title'),
            input: document.getElementById('new-task-input'),
            prioritySelect: document.getElementById('priority-input'),
            addBtn: document.getElementById('add-task-btn'),
            clearBtn: document.getElementById('clear-completed-btn'),
            btnAddList: document.getElementById('btn-add-list'),
            btnDeleteList: document.getElementById('btn-delete-list'),
            tabs: document.querySelectorAll('.tab-btn')
        };

        if (!this.dom.listContainer) return; // Guard against running on wrong page

        // 3. Initialize Sub-Modules
        this.modalManager = new TaskModalManager();
        this.modalManager.init(); // Bind to new DOM

        this.renderer = new TaskRenderer({
            onTaskClick: (task) => this.modalManager.open(task, this.state.lists, this.state.activeListId),
            onDeleteTask: (id) => TaskAPI.deleteTask(id, this.state.activeListId),
            onToggleTask: (id) => TaskAPI.toggleTask(id, this.state.activeListId),
            onListSwitch: (id, title, icon) => this.switchList(id, title, icon)
        });

        // 4. Bind Events
        this._bindGlobalEvents();
        
        // 5. Data Listeners
        // Remove old listeners to prevent duplicates
        Neutralino.events.off('receiveTodoLists', this._onReceiveListsBound);
        
        // Create bound function for reference
        this._onReceiveListsBound = (e) => this._onReceiveLists(e.detail);
        Neutralino.events.on('receiveTodoLists', this._onReceiveListsBound);

        // 6. Fetch Data
        TaskAPI.getTodoLists();
        TaskAPI.getTasks(this.state.activeListId);
    }

    updateTasks(tasks) {
        this.state.tasks = tasks || [];
        this._updateUI();
    }

    switchList(id, title, icon) {
        this.state.activeListId = id;
        this.state.activeListTitle = title;
        this.state.activeListIcon = icon;

        if (this.dom.headerTitle) {
            this.dom.headerTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
        }

        if (this.dom.btnDeleteList) {
            if (id === 1) this.dom.btnDeleteList.classList.add('hidden');
            else this.dom.btnDeleteList.classList.remove('hidden');
        }

        // Refresh Lists UI highlight
        if (this.renderer) {
            this.renderer.renderLists(this.dom.listsNav, this.state.lists, id);
        }
        
        TaskAPI.getTasks(id);
    }

    _bindGlobalEvents() {
        const addTask = () => {
            const content = this.dom.input.value.trim();
            if (!content) return;
            
            TaskAPI.addTask({ 
                content, 
                priority: this.dom.prioritySelect?.value || 'p4', 
                listId: this.state.activeListId 
            });
            this.dom.input.value = '';
            this.dom.input.focus();
        };

        if (this.dom.addBtn) this.dom.addBtn.onclick = addTask;
        
        if (this.dom.input) {
            this.dom.input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.repeat) addTask();
            };
        }

        if (this.dom.btnAddList) {
            this.dom.btnAddList.onclick = () => {
                const name = prompt("Enter new list name:");
                if (name?.trim()) TaskAPI.addTodoList(name.trim(), "fa-solid fa-list");
            };
        }

        if (this.dom.btnDeleteList) {
            this.dom.btnDeleteList.onclick = () => {
                if (this.state.activeListId === 1) return;
                if (confirm(`Delete list "${this.state.activeListTitle}"?`)) {
                    TaskAPI.deleteTodoList(this.state.activeListId);
                    this.switchList(1, 'Inbox', 'fa-solid fa-inbox');
                }
            };
        }

        if (this.dom.clearBtn) {
            this.dom.clearBtn.onclick = () => {
                if (confirm("Clear completed tasks?")) {
                    TaskAPI.clearCompletedTasks(this.state.activeListId);
                }
            };
        }

        this.dom.tabs.forEach(tab => {
            tab.onclick = () => {
                this.dom.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.state.filter = tab.getAttribute('data-filter');
                this._updateUI();
            };
        });
    }

    _onReceiveLists(lists) {
        this.state.lists = lists || [];
        if (this.renderer) {
            this.renderer.renderLists(this.dom.listsNav, this.state.lists, this.state.activeListId);
        }
    }

    _updateUI() {
        if (!this.renderer) return;

        this.renderer.renderTasks(this.dom.listContainer, this.state.tasks, this.state.filter);
        
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

        if (this.dom.clearBtn) {
            this.dom.clearBtn.disabled = completed === 0;
            this.dom.clearBtn.style.opacity = completed === 0 ? '0.5' : '1';
            this.dom.clearBtn.style.cursor = completed === 0 ? 'not-allowed' : 'pointer';
        }
    }
}

const manager = new TodoListManager();

export function initTodoList() {
    manager.init();
}

export function renderTasks(tasks) {
    manager.updateTasks(tasks);
}