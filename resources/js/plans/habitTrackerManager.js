import { HabitAPI } from "../api/HabitAPI.js";
import { HabitUI } from "./habit-tracker/HabitUI.js";

export class HabitTrackerManager {
    constructor() {
        this.state = {
            habits: [],
            logs: [],
            filter: 'all' // 'all', 'focus', 'mastery'
        };

        this.dom = {
            board: document.querySelector('.habit-board'),
            btnAdd: document.getElementById('btn-add-new-habit'),
            btnAll: document.querySelector('.view-btn[title="Show All"]'),
            btnFocus: document.querySelector('.view-btn[title*="Focus"]'),
            btnMastery: document.querySelector('.view-btn[title*="Mastery"]'),
            modal: document.getElementById('modal-new-habit'),
            form: {
                title: document.getElementById('input-habit-title'),
                stack: document.getElementById('input-habit-stack'),
                icon: document.getElementById('input-habit-icon'),
                btnSave: document.getElementById('btn-save-habit'),
                btnCancel: document.getElementById('btn-cancel-habit')
            }
        };
        
        this.ui = new HabitUI(this.dom.board);
        this.init();
    }

    init() {
        if (!this.dom.board) return;

        // 1. Data Events
        Neutralino.events.on('receiveHabitsData', (e) => {
            this.state.habits = e.detail.habits || [];
            this.state.logs = e.detail.logs || [];
            this.render();
        });

        const refresh = () => this.fetchData();
        Neutralino.events.on('habitCreated', refresh);
        Neutralino.events.on('habitDeleted', refresh);
        Neutralino.events.on('habitArchived', refresh); // Listen for archive
        
        // ... (Keep button events) ...
        if(this.dom.btnAdd) this.dom.btnAdd.addEventListener('click', () => this.openModal());
        if (this.dom.form.btnCancel) this.dom.form.btnCancel.addEventListener('click', () => this.closeModal());
        if (this.dom.form.btnSave) this.dom.form.btnSave.addEventListener('click', () => this.saveHabit());

        // 3. Filter Buttons
        if (this.dom.btnAll) this.dom.btnAll.addEventListener('click', () => this.setFilter('all', this.dom.btnAll));
        if (this.dom.btnFocus) this.dom.btnFocus.addEventListener('click', () => this.setFilter('focus', this.dom.btnFocus));
        if (this.dom.btnMastery) this.dom.btnMastery.addEventListener('click', () => this.setFilter('mastery', this.dom.btnMastery));

        this.fetchData();
    }

    fetchData() {
        const dates = this.ui._getWeekDates();
        // Pass the current filter/view mode to backend
        HabitAPI.getHabitsData(dates[0], dates[6], this.state.filter);
    }

    setFilter(mode, btnElement) {
        this.state.filter = mode;
        
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');

        // Fetch new data (because Mastery needs different DB query)
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

        // Pass filter to render so it can style 'mastery' view
        this.ui.render(filteredHabits, this.state.logs, this.state.filter);
    }

    // ... (Keep openModal, closeModal, saveHabit) ...
    openModal() {
        if (this.dom.modal) {
            this.dom.modal.classList.remove('hidden');
            this.dom.form.title.value = '';
            this.dom.form.title.focus();
        }
    }

    closeModal() {
        if (this.dom.modal) this.dom.modal.classList.add('hidden');
    }

    saveHabit() {
        const title = this.dom.form.title.value.trim();
        const stack = this.dom.form.stack.value || 'General';
        const icon = this.dom.form.icon.value || 'fa-solid fa-check'; 

        if (title) {
            HabitAPI.createHabit(title, stack, icon, 7);
            this.closeModal();
        }
    }
}

export function initHabitTracker() {
    new HabitTrackerManager();
}