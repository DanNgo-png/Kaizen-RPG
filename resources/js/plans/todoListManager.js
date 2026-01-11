import { GameAPI } from "../api/GameAPI.js";
import { CalendarWidget } from "../components/CalendarWidget.js";

class TodoListManager {
    constructor() {
        this.state = {
            tasks: [],
            lists: [],
            activeListId: 1, // Default to Inbox (ID 1)
            activeListTitle: 'Inbox',
            activeListIcon: 'fa-solid fa-inbox',
            filter: 'all', // 'all', 'pending', 'completed'
            activeTaskId: null, // For the details modal
            originalDescription: ""
        };
        
        this.dom = {};
        this.calendarWidget = null;
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
            btnDeleteList: document.getElementById('btn-delete-list'),
            
            // Containers
            listContainer: document.getElementById('todo-list-container'),
            tabs: document.querySelectorAll('.tab-btn'),
            
            // Modal Elements
            modal: document.getElementById('todo-detail-modal'),
            modalCard: document.getElementById('todo-modal-card'), // Needed for sidecar positioning
            modalTitle: document.getElementById('modal-task-title'),
            modalDesc: document.getElementById('modal-task-desc'),
            btnCloseModal: document.getElementById('btn-close-detail-modal'),
            saveIndicator: document.getElementById('modal-save-indicator'),
            modalPriority: document.getElementById('modal-task-priority'),
            modalListSelect: document.getElementById('modal-task-list'),

            // Sidecar Elements (Date Picker)
            btnDateTrigger: document.getElementById('btn-trigger-date-sidecar'),
            btnDateText: document.getElementById('btn-date-text'),
            sidecar: document.getElementById('sidecar-date-picker'),
            btnCloseSidecar: document.getElementById('btn-close-sidecar')
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

        // Enter Key in Input
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
                this.render(); 
            });
        });
    }

    bindModalEvents() {
        if (!this.dom.modal) return;

        // --- 1. Sidecar Date Picker Initialization ---
        if (!this.calendarWidget) {
            this.calendarWidget = new CalendarWidget({
                onDateSelect: (dateStr) => {
                    // Update Trigger UI
                    if(this.dom.btnDateText) this.dom.btnDateText.textContent = dateStr;
                    this.dom.btnDateTrigger.classList.add('active');
                    
                    // Save to Backend immediately
                    if(this.state.activeTaskId) {
                        // Assumption: GameAPI has this method. If not, add it to GameAPI.js and TaskController.js
                        // GameAPI.updateTaskDueDate(this.state.activeTaskId, dateStr); 
                        console.log(`[Mock Save] Due Date: ${dateStr} for Task ${this.state.activeTaskId}`);
                    }
                    
                    // Optional: Auto-close sidecar on selection
                    // this.closeSidecar();
                },
                onRepeatChange: (rule) => {
                    if(this.state.activeTaskId) {
                        console.log(`[Mock Save] Repeat: ${rule} for Task ${this.state.activeTaskId}`);
                    }
                }
            });
        }

        // --- 2. Sidecar Toggles ---
        if (this.dom.btnDateTrigger) {
            this.dom.btnDateTrigger.addEventListener('click', (e) => {
                e.stopPropagation(); 
                this.toggleSidecar();
            });
        }

        if (this.dom.btnCloseSidecar) {
            this.dom.btnCloseSidecar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSidecar();
            });
        }

        // Close sidecar if clicking main modal body (but not the trigger)
        if (this.dom.modalCard) {
            this.dom.modalCard.addEventListener('click', (e) => {
                if (this.dom.sidecar.classList.contains('visible') && 
                    !e.target.closest('#btn-trigger-date-sidecar')) {
                    this.closeSidecar();
                }
            });
        }

        // --- 3. Standard Modal Actions ---
        
        // Close Modal via Button
        this.dom.btnCloseModal.addEventListener('click', () => {
            this._saveAndClose();
        });
        
        // Close via Outside Click (Overlay)
        this.dom.modal.addEventListener('click', (e) => {
            // Only if clicking the overlay background
            if (e.target === this.dom.modal) {
                this._saveAndClose();
            }
        });

        // Handle Priority Change
        this.dom.modalPriority.addEventListener('change', (e) => {
            if (this.state.activeTaskId) {
                GameAPI.updateTaskPriority(
                    this.state.activeTaskId, 
                    e.target.value, 
                    this.state.activeListId
                );
            }
        });

        // Handle List Move
        this.dom.modalListSelect.addEventListener('change', (e) => {
            if (this.state.activeTaskId) {
                const newListId = parseInt(e.target.value);
                GameAPI.moveTask(
                    this.state.activeTaskId, 
                    newListId, 
                    this.state.activeListId
                );
                this.closeModal();
            }
        });
    }

    // --- Sidecar Positioning Logic ---

    toggleSidecar() {
        if (!this.dom.sidecar) return;
        const isVisible = this.dom.sidecar.classList.contains('visible');
        if (isVisible) {
            this.closeSidecar();
        } else {
            this.openSidecar();
        }
    }

    openSidecar() {
        if (!this.dom.sidecar || !this.dom.modalCard || !this.dom.btnDateTrigger) return;

        // 1. Get Geometry of the Main Modal Card
        const cardRect = this.dom.modalCard.getBoundingClientRect();
        
        // 2. Calculate Position
        
        // Left: Align to the right of the modal card + 15px margin
        const leftPos = cardRect.right + 15;
        
        // Top: Align with the TOP of the Modal Card (Cleaner "Sidebar" look)
        // CHANGED: Use cardRect.top instead of triggerRect.top
        const topPos = cardRect.top;

        // 3. Apply Styles
        this.dom.sidecar.style.top = `${topPos}px`;
        this.dom.sidecar.style.left = `${leftPos}px`;

        // 4. Show & Animate
        this.dom.sidecar.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.dom.sidecar.classList.add('visible');
        });
        
        this.dom.btnDateTrigger.classList.add('active');
    }

    closeSidecar() {
        if (!this.dom.sidecar) return;

        this.dom.sidecar.classList.remove('visible');
        
        // Wait for CSS transition (0.2s) before hiding display
        setTimeout(() => {
            this.dom.sidecar.classList.add('hidden');
        }, 200);

        // Keep button active if a date is set (checking text content as simple state check)
        if (this.dom.btnDateText && this.dom.btnDateText.textContent === "Set Due Date") {
             this.dom.btnDateTrigger.classList.remove('active');
        }
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

        this.renderLists(this.state.lists);
        GameAPI.getTasks(id);
    }

    // --- Task Logic ---

    createTask() {
        const content = this.dom.input.value.trim();
        const priority = this.dom.prioritySelect ? this.dom.prioritySelect.value : 'p4';
        
        if (!content) return;
        
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
            this.dom.listContainer = document.getElementById('todo-list-container');
            if(!this.dom.listContainer) return;
        }

        const filteredTasks = this.filterTasks(this.state.tasks);
        this.updateCounts();
        this.updateClearButtonState();

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

        // If task has a date, maybe show icon (optional visual enhancement)
        const hasDateIcon = task.due_date
            ? `<i class="fa-regular fa-calendar" style="font-size:0.8rem; margin-left:8px; opacity:0.5; color:#60a5fa;"></i>`
            : '';

        item.innerHTML = `
            <div class="task-left">
                <label class="check-container">
                    <input type="checkbox" ${task.completed === 1 ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${this.escapeHtml(task.content)}</span>
                ${hasDescIcon}
                ${hasDateIcon}
            </div>
            <button class="btn-delete" title="Delete Task">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        // Checkbox click
        const checkContainer = item.querySelector('.check-container');
        checkContainer.addEventListener('click', (e) => e.stopPropagation());

        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => GameAPI.toggleTask(task.id, this.state.activeListId));

        // Delete click
        const delBtn = item.querySelector('.btn-delete');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete this task?")) {
                GameAPI.deleteTask(task.id, this.state.activeListId);
            }
        });

        // Item click (Open Details)
        item.addEventListener('click', () => {
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                this.openModal(task);
            }
        });

        return item;
    }

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
        this.state.originalDescription = task.description || "";
        this.dom.modalTitle.textContent = task.content;
        this.dom.modalDesc.value = task.description || "";
        this.dom.modalPriority.value = task.priority || 'p4';

        this.populateListSelect(this.state.activeListId);

        // 1. Reset Sidecar State (Always start hidden)
        if (this.dom.sidecar) {
            this.dom.sidecar.classList.remove('visible');
            this.dom.sidecar.classList.add('hidden');
        }

        // 2. Update Date Trigger Text
        if (task.due_date) {
            this.dom.btnDateText.textContent = task.due_date; // e.g. "2025-12-25"
            this.dom.btnDateTrigger.classList.add('active');
        } else {
            this.dom.btnDateText.textContent = "Set Due Date";
            this.dom.btnDateTrigger.classList.remove('active');
        }

        // 3. Load Data into Calendar Widget
        if (this.calendarWidget) {
            const dueDate = task.due_date || null; 
            const repeatRule = task.repeat_rule || null;
            this.calendarWidget.loadTaskData(dueDate, repeatRule);
        }

        this.dom.saveIndicator.classList.remove('visible');
        this.dom.modal.classList.remove('hidden');
    }

    populateListSelect(currentListId) {
        this.dom.modalListSelect.innerHTML = '';
        
        this.state.lists.forEach(list => {
            const opt = document.createElement('option');
            opt.value = list.id;
            opt.textContent = list.title;
            
            if (list.id === currentListId) {
                opt.selected = true;
            }
            
            this.dom.modalListSelect.appendChild(opt);
        });
    }

    _saveAndClose() {
        // Save description if changed
        if (this.state.activeTaskId) {
            const currentDesc = this.dom.modalDesc.value;
            if (currentDesc !== this.state.originalDescription) {
                GameAPI.updateTaskDescription(
                    this.state.activeTaskId, 
                    currentDesc, 
                    this.state.activeListId
                );
            }
        }
        this.closeModal();
    }

    closeModal() {
        this.dom.modal.classList.add('hidden');
        // Ensure sidecar closes when modal closes
        this.closeSidecar();
        this.state.activeTaskId = null;
        this.state.originalDescription = "";
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