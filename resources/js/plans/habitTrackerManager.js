import { HabitAPI } from "../api/HabitAPI.js";
import { HabitUI } from "./habit-tracker/HabitUI.js";

export class HabitTrackerManager {
    constructor() {
        this.state = {
            habits: [],
            logs: [],
            filter: 'all'
        };

        // Cache DOM elements
        this.dom = {
            board: document.querySelector('.habit-board'),
            btnAdd: document.getElementById('btn-add-new-habit'),
            
            // Filter Buttons
            btnAll: document.querySelector('.view-btn[title="Show All"]'),
            btnFocus: document.querySelector('.view-btn[title*="Focus"]'),
            btnMastery: document.querySelector('.view-btn[title*="Mastery"]'),
            
            // Modal Elements
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

        console.log("✅ Habit Tracker Initialized");

        // 1. Listen for Data
        Neutralino.events.on('receiveHabitsData', (e) => {
            console.log("📥 Received Habits Data:", e.detail);
            this.state.habits = e.detail.habits || [];
            this.state.logs = e.detail.logs || [];
            this.render();
        });

        // 2. Auto-refresh events
        const refresh = () => this.fetchData();
        Neutralino.events.on('habitCreated', (e) => {
            if(e.detail.success) {
                console.log("✨ Habit Created Successfully");
                refresh();
            } else {
                console.error("❌ Failed to create habit:", e.detail.error);
                alert("Failed to create habit. Check console.");
            }
        });
        Neutralino.events.on('habitDeleted', refresh);
        
        // 3. Button Events
        if(this.dom.btnAdd) this.dom.btnAdd.addEventListener('click', () => this.openModal());
        
        if (this.dom.form.btnCancel) {
            this.dom.form.btnCancel.addEventListener('click', () => this.closeModal());
        }

        if (this.dom.form.btnSave) {
            this.dom.form.btnSave.addEventListener('click', () => {
                console.log("🖱️ Save Button Clicked");
                this.saveHabit();
            });
        }

        // 4. View Filters
        if (this.dom.btnAll) this.dom.btnAll.addEventListener('click', () => this.setFilter('all', this.dom.btnAll));
        if (this.dom.btnFocus) this.dom.btnFocus.addEventListener('click', () => this.setFilter('focus', this.dom.btnFocus));
        if (this.dom.btnMastery) this.dom.btnMastery.addEventListener('click', () => this.setFilter('mastery', this.dom.btnMastery));

        // Initial Fetch
        this.fetchData();
    }

    fetchData() {
        const dates = this.ui._getWeekDates();
        HabitAPI.getHabitsData(dates[0], dates[6]);
    }

    setFilter(mode, btnElement) {
        this.state.filter = mode;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        this.render();
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
        
        // Note: 'Mastery' logic handled via 'archived' flag in DB usually, 
        // but currently getHabits returns only active ones. 
        // Future feature: add toggle to get archived habits.

        this.ui.render(filteredHabits, this.state.logs);
    }

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

        if (!title) {
            alert("Please enter a habit name.");
            this.dom.form.title.focus();
            return;
        }

        console.log(`📤 Sending Create Request: ${title} in ${stack}`);
        HabitAPI.createHabit(title, stack, icon, 7);
        this.closeModal();
    }
}

export function initHabitTracker() {
    new HabitTrackerManager();
}