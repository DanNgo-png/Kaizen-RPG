import { HabitAPI } from "../api/HabitAPI.js";
import { HabitUI } from "./habit-tracker/HabitUI.js";
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

export class HabitTrackerManager {
    constructor() {
        this.state = {
            habits: [],
            logs: [],
            filter: 'all' // 'all', 'focus', 'mastery'
        };

        this.editingId = null; // Track if we are editing

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
                iconInput: document.getElementById('input-habit-icon'),
                iconGrid: document.getElementById('habit-icon-grid'),
                btnSave: document.getElementById('btn-save-habit'),
                btnCancel: document.getElementById('btn-cancel-habit')
            }
        };
        
        // Pass callbacks for actions
        this.ui = new HabitUI(this.dom.board, {
            onEdit: (habit) => this.openModal(habit),
            onAddStack: (stackName) => this.openModal(null, stackName)
        });

        this.init();
    }

    init() {
        if (!this.dom.board) return;

        Neutralino.events.on('receiveHabitsData', (e) => {
            this.state.habits = e.detail.habits || [];
            this.state.logs = e.detail.logs || [];
            this.render();
        });

        const refresh = () => this.fetchData();
        
        Neutralino.events.on('habitCreated', refresh);
        Neutralino.events.on('habitUpdated', refresh); 
        Neutralino.events.on('habitDeleted', refresh);
        
        Neutralino.events.on('habitArchived', () => {
            refresh();
            const msg = (this.state.filter !== 'mastery') 
                ? "Habit Mastered! Moved to Mastery list." 
                : "Habit Restored! Moved to Active list.";
            notifier.show("Habit Updated", msg, "fa-solid fa-box-open");
        });
        
        if(this.dom.btnAdd) this.dom.btnAdd.addEventListener('click', () => this.openModal());
        if (this.dom.form.btnCancel) this.dom.form.btnCancel.addEventListener('click', () => this.closeModal());
        if (this.dom.form.btnSave) this.dom.form.btnSave.addEventListener('click', () => this.saveHabit());

        if (this.dom.btnAll) this.dom.btnAll.addEventListener('click', () => this.setFilter('all', this.dom.btnAll));
        if (this.dom.btnFocus) this.dom.btnFocus.addEventListener('click', () => this.setFilter('focus', this.dom.btnFocus));
        if (this.dom.btnMastery) this.dom.btnMastery.addEventListener('click', () => this.setFilter('mastery', this.dom.btnMastery));

        this._renderIconGrid();
        this.fetchData();
    }

    fetchData() {
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
        let filteredHabits = this.state.habits;

        if (this.state.filter === 'focus') {
            const today = new Date().toISOString().split('T')[0];
            filteredHabits = filteredHabits.filter(h => {
                const isDoneToday = this.state.logs.some(l => l.habit_id === h.id && l.log_date === today && l.status === 1);
                return !isDoneToday;
            });
        }
        this.ui.render(filteredHabits, this.state.logs, this.state.filter);
    }

    _renderIconGrid() {
        if (!this.dom.form.iconGrid) return;
        this.dom.form.iconGrid.innerHTML = '';

        COMMON_ICONS.forEach(iconClass => {
            const el = document.createElement('div');
            el.className = 'icon-option';
            el.innerHTML = `<i class="${iconClass}"></i>`;
            el.dataset.value = iconClass;
            el.addEventListener('click', () => this._selectIcon(iconClass));
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

    // UPDATE: Accepts defaultStack
    openModal(habitToEdit = null, defaultStack = '') {
        if (this.dom.modal) {
            this.dom.modal.classList.remove('hidden');
            
            if (habitToEdit) {
                // EDIT MODE
                this.editingId = habitToEdit.id;
                this.dom.modalTitle.textContent = "Edit Habit";
                this.dom.form.btnSave.textContent = "Update";
                
                this.dom.form.title.value = habitToEdit.title;
                this.dom.form.stack.value = habitToEdit.stack_name;
                this._selectIcon(habitToEdit.icon);
            } else {
                // CREATE MODE
                this.editingId = null;
                this.dom.modalTitle.textContent = "New Habit";
                this.dom.form.btnSave.textContent = "Create";
                
                this.dom.form.title.value = '';
                this.dom.form.stack.value = defaultStack || ''; // Pre-fill stack
                this._selectIcon('fa-solid fa-check'); // Default
            }
            this.dom.form.title.focus();
        }
    }

    closeModal() {
        if (this.dom.modal) this.dom.modal.classList.add('hidden');
    }

    saveHabit() {
        const title = this.dom.form.title.value.trim();
        const stack = this.dom.form.stack.value || 'General';
        const icon = this.dom.form.iconInput.value || 'fa-solid fa-check'; 

        if (title) {
            if (this.editingId) {
                // UPDATE
                HabitAPI.updateHabit(this.editingId, title, stack, icon);
            } else {
                // CREATE
                HabitAPI.createHabit(title, stack, icon, 7);
            }
            this.closeModal();
        }
    }
}

export function initHabitTracker() {
    new HabitTrackerManager();
}