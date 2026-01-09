import { EXTENSION_ID } from "../../api/_extension_id.js";

export class TodayUIManager {
    constructor(dateKey, now) {
        this.dateKey = dateKey;
        this.now = now;
        
        this.dom = {
            weekday: document.getElementById('today-weekday'),
            fullDate: document.getElementById('today-full-date'),
            goalContainer: document.getElementById('daily-goal-container'),
            goalText: document.getElementById('daily-goal-text')
        };

        this.init();
    }

    init() {
        if (!this.dom.weekday) return;

        const options = { weekday: 'long' };
        this.dom.weekday.textContent = this.now.toLocaleDateString('en-US', options);
        this.dom.fullDate.textContent = this.now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        this.dom.goalContainer.addEventListener('click', () => this._promptDailyGoal());
    }

    updateDailyGoal(goalData) {
        if (goalData && goalData.title) {
            this.dom.goalText.textContent = goalData.title;
            this.dom.goalContainer.classList.add('active');
        } else {
            this.dom.goalText.textContent = "Set a main focus...";
            this.dom.goalContainer.classList.remove('active');
        }
    }

    _promptDailyGoal() {
        const current = this.dom.goalText.textContent === "Set a main focus..." ? "" : this.dom.goalText.textContent;
        const newGoal = prompt("Main Focus:", current);
        if (newGoal) {
            Neutralino.extensions.dispatch(EXTENSION_ID, "setDailyGoal", { dateKey: this.dateKey, title: newGoal });
            this.dom.goalText.textContent = newGoal; 
            this.dom.goalContainer.classList.add('active');
        }
    }
}