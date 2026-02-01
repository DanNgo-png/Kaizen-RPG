import { HabitAPI } from "../api/HabitAPI.js";
import { HabitUI } from "./habit-tracker/HabitUI.js";
import { StackDragLogic } from "./habit-tracker/dragLogic.js";
import { notifier } from "../_global-managers/NotificationManager.js"; 

const COMMON_ICONS = [
    "fa-solid fa-check", "fa-solid fa-book", "fa-solid fa-person-running", 
    "fa-solid fa-dumbbell", "fa-solid fa-apple-whole", "fa-solid fa-utensils", "fa-solid fa-bed",
    "fa-solid fa-glass-water", "fa-solid fa-tooth", "fa-solid fa-sun",
    "fa-solid fa-moon", "fa-solid fa-laptop-code", "fa-solid fa-pen-nib",
    "fa-solid fa-briefcase", "fa-solid fa-graduation-cap", "fa-solid fa-brain",
    "fa-solid fa-heart-pulse", "fa-solid fa-code", "fa-solid fa-person-hiking",
    "fa-solid fa-money-bill", "fa-solid fa-piggy-bank", "fa-solid fa-house",
    "fa-solid fa-broom", "fa-solid fa-paw", "fa-solid fa-music"
];

const DEFAULT_STACKS = ["Morning Routine", "Evening Routine", "Health", "Skills", "Work"];

class HabitTrackerManager {
    constructor() {
        this.state = {
            habits: [],
            logs: [],
            stackOrder: [], 
            filter: 'all'
        };

        this.editingId = null;
        this.dom = {};
        this.ui = null;

        // Bind handlers to maintain reference consistency for add/removeEventListener
        this._onReceiveData = this._onReceiveData.bind(this);
        this._refresh = this._refresh.bind(this);
        this._onArchived = this._onArchived.bind(this);
    }

    init() {
        // Cache DOM elements
        this.dom = {
            board: document.querySelector('.habit-board'),
            btnAdd: document.getElementById('btn-add-new-habit'),
            btnAll: document.querySelector('.view-btn[title="Show All"]'),
            btnFocus: document.querySelector('.view-btn[title*="Focus"]'),
            btnMastery: document.querySelector('.view-btn[title*="Mastered"]'),
            
            modal: document.getElementById('modal-new-habit'),
            modalTitle: document.getElementById('modal-title'),
            form: {
                title: document.getElementById('input-habit-title'),
                stack: document.getElementById('input-habit-stack'),
                stackDropdown: document.getElementById('stack-custom-dropdown'), 
                iconInput: document.getElementById('input-habit-icon'),
                iconGrid: document.getElementById('habit-icon-grid'),
                btnSave: document.getElementById('btn-save-habit'),
                btnCancel: document.getElementById('btn-cancel-habit')
            }
        };

        if (!this.dom.board) return;

        // Initialize UI
        this.ui = new HabitUI(this.dom.board, {
            onEdit: (habit) => this.openModal(habit),
            onAddStack: (stackName) => this.openModal(null, stackName)
        });

        // --- EVENT LISTENER CLEANUP & REGISTRATION ---
        // Crucial: Remove existing listeners to prevent duplicates
        Neutralino.events.off('receiveHabitsData', this._onReceiveData);
        Neutralino.events.off('habitCreated', this._refresh);
        Neutralino.events.off('habitUpdated', this._refresh); 
        Neutralino.events.off('habitDeleted', this._refresh);
        Neutralino.events.off('habitArchived', this._onArchived);

        // Register listeners
        Neutralino.events.on('receiveHabitsData', this._onReceiveData);
        Neutralino.events.on('habitCreated', this._refresh);
        Neutralino.events.on('habitUpdated', this._refresh); 
        Neutralino.events.on('habitDeleted', this._refresh);
        Neutralino.events.on('habitArchived', this._onArchived);
        
        // DOM Listeners (using onclick to overwrite previous bindings on these elements)
        if(this.dom.btnAdd) this.dom.btnAdd.onclick = () => this.openModal();
        if (this.dom.form.btnCancel) this.dom.form.btnCancel.onclick = () => this.closeModal();
        if (this.dom.form.btnSave) this.dom.form.btnSave.onclick = () => this.saveHabit();

        this._setupStackDropdown();

        if (this.dom.modal) {
            this.dom.modal.onclick = (e) => {
                if (e.target === this.dom.modal) {
                    this.closeModal();
                }
            };
        }

        if (this.dom.btnAll) this.dom.btnAll.onclick = () => this.setFilter('all', this.dom.btnAll);
        if (this.dom.btnFocus) this.dom.btnFocus.onclick = () => this.setFilter('focus', this.dom.btnFocus);
        if (this.dom.btnMastery) this.dom.btnMastery.onclick = () => this.setFilter('mastery', this.dom.btnMastery);

        this._renderIconGrid();
        this.fetchData();
    }

    _onReceiveData(e) {
        this.state.habits = e.detail.habits || [];
        this.state.logs = e.detail.logs || [];
        this.state.stackOrder = e.detail.stackOrder || []; 
        this.render();
    }

    _refresh() {
        this.fetchData();
    }

    _onArchived() {
        this._refresh();
        const msg = (this.state.filter !== 'mastery') 
            ? "Habit Mastered! Moved to Mastery list." 
            : "Habit Restored! Moved to Active list.";
        notifier.show("Habit Updated", msg, "fa-solid fa-box-open");
    }

    _setupStackDropdown() {
        const input = this.dom.form.stack;
        const dropdown = this.dom.form.stackDropdown;
        if (!input || !dropdown) return;
        
        input.onfocus = () => this._renderStackOptions(input.value);
        input.oninput = () => this._renderStackOptions(input.value);
        
        // Clean up old document listener if exists
        if (this._boundDocClick) document.removeEventListener('click', this._boundDocClick);
        
        this._boundDocClick = (e) => {
            if (this.dom.form.stack && this.dom.form.stackDropdown) {
               if (!this.dom.form.stack.contains(e.target) && !this.dom.form.stackDropdown.contains(e.target)) {
                   this.dom.form.stackDropdown.classList.add('hidden');
               }
            }
        };
        document.addEventListener('click', this._boundDocClick);
    }

    _renderStackOptions(filterText = '') {
        const dropdown = this.dom.form.stackDropdown;
        dropdown.innerHTML = '';
        const existingStacks = this.state.habits.map(h => h.stack_name);
        const allStacks = new Set([...DEFAULT_STACKS, ...existingStacks]);
        const filtered = [...allStacks].filter(name => name.toLowerCase().includes(filterText.toLowerCase())).sort();

        if (filtered.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }

        filtered.forEach(stackName => {
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            div.textContent = stackName;
            div.onclick = () => {
                this.dom.form.stack.value = stackName;
                dropdown.classList.add('hidden');
            };
            dropdown.appendChild(div);
        });
        dropdown.classList.remove('hidden');
    }

    fetchData() {
        if (!this.ui) return;
        const dates = this.ui._getWeekDates();
        HabitAPI.getHabitsData(dates[0], dates[6], this.state.filter);
    }

    setFilter(mode, btnElement) {
        this.state.filter = mode;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        this.fetchData(); 
    }

    render() {
        if (!this.ui) return;
        let filteredHabits = this.state.habits;

        if (this.state.filter === 'focus') {
            const today = new Date().toISOString().split('T')[0];
            filteredHabits = filteredHabits.filter(h => {
                const isDoneToday = this.state.logs.some(l => l.habit_id === h.id && l.log_date === today && l.status === 1);
                return !isDoneToday;
            });
        }
        
        this.ui.render(filteredHabits, this.state.logs, this.state.filter, this.state.stackOrder);
        
        StackDragLogic.init(this.dom.board, (newOrder) => {
            this.state.stackOrder = newOrder; 
            HabitAPI.saveStackOrder(newOrder); 
        });
    }

    _renderIconGrid() {
        if (!this.dom.form.iconGrid) return;
        this.dom.form.iconGrid.innerHTML = '';
        COMMON_ICONS.forEach(iconClass => {
            const el = document.createElement('div');
            el.className = 'icon-option';
            el.innerHTML = `<i class="${iconClass}"></i>`;
            el.dataset.value = iconClass;
            el.onclick = () => this._selectIcon(iconClass);
            this.dom.form.iconGrid.appendChild(el);
        });
    }

    _selectIcon(iconClass) {
        this.dom.form.iconInput.value = iconClass;
        const options = this.dom.form.iconGrid.querySelectorAll('.icon-option');
        options.forEach(opt => {
            if (opt.dataset.value === iconClass) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    openModal(habitToEdit = null, defaultStack = '') {
        if (this.dom.modal) {
            this.dom.modal.classList.remove('hidden');
            if(this.dom.form.stackDropdown) this.dom.form.stackDropdown.classList.add('hidden');

            if (habitToEdit) {
                this.editingId = habitToEdit.id;
                this.dom.modalTitle.textContent = "Edit Habit";
                this.dom.form.btnSave.textContent = "Update";
                this.dom.form.title.value = habitToEdit.title;
                this.dom.form.stack.value = habitToEdit.stack_name;
                this._selectIcon(habitToEdit.icon);
            } else {
                this.editingId = null;
                this.dom.modalTitle.textContent = "New Habit";
                this.dom.form.btnSave.textContent = "Create";
                this.dom.form.title.value = '';
                this.dom.form.stack.value = defaultStack || '';
                this._selectIcon('fa-solid fa-check'); 
            }
            this.dom.form.title.focus();
        }
    }

    closeModal() {
        if (this.dom.modal) this.dom.modal.classList.add('hidden');
        if (this.dom.form.stackDropdown) this.dom.form.stackDropdown.classList.add('hidden');
    }

    saveHabit() {
        const title = this.dom.form.title.value.trim();
        const stack = this.dom.form.stack.value || 'General';
        const icon = this.dom.form.iconInput.value || 'fa-solid fa-check'; 

        if (title) {
            if (this.editingId) {
                HabitAPI.updateHabit(this.editingId, title, stack, icon);
            } else {
                HabitAPI.createHabit(title, stack, icon, 7);
            }
            this.closeModal();
        }
    }
}

// Singleton Instance
const manager = new HabitTrackerManager();

export function initHabitTracker() {
    manager.init();
}