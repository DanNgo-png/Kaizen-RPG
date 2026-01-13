import { HabitAPI } from "../../api/HabitAPI.js";

export class HabitUI {
    constructor(container) {
        this.container = container;
        this.currentWeekStart = this._getMonday(new Date());

        this.dom = {
            headerTitle: document.querySelector('.habit-header h2'), // The icon and "Habit Tracker" text
            headerSub: document.querySelector('.header-sub')         // The date range text
        };
    }

    /**
     * Renders the entire board based on data
     * @param {Array} habits - List of habit definitions
     * @param {Array} logs - List of completion logs
     */
    render(habits, logs) {
        this.updateHeader();
        this.container.innerHTML = '';
        
        // 1. Group by Stack
        const stacks = {};
        habits.forEach(h => {
            if (!stacks[h.stack_name]) stacks[h.stack_name] = [];
            stacks[h.stack_name].push(h);
        });

        // 2. Generate Date Headers (Mon-Sun)
        const weekDates = this._getWeekDates();

        // 3. Render Each Stack
        Object.keys(stacks).forEach(stackName => {
            const stackEl = this._createStackElement(stackName, stacks[stackName], weekDates, logs);
            this.container.appendChild(stackEl);
        });
    }

    updateHeader() {
        if (!this.dom.headerSub) return;

        const start = this.currentWeekStart;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        // Calculate Week Number
        const oneJan = new Date(start.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((start - oneJan) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((start.getDay() + 1 + numberOfDays) / 7);

        // Format: "Week 52 • Dec 22 - Dec 28"
        const opt = { month: 'short', day: 'numeric' };
        const rangeStr = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
        
        this.dom.headerSub.textContent = `Week ${weekNum} • ${rangeStr}`;
    }

    _createStackElement(stackName, habits, weekDates, logs) {
        const stackDiv = document.createElement('div');
        stackDiv.className = 'habit-stack';

        // Header
        const headerHtml = `
            <div class="stack-header">
                <div class="stack-title">
                    <i class="fa-solid fa-chevron-down stack-chevron"></i>
                    ${stackName}
                </div>
            </div>
        `;
        
        // Body Grid
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'stack-body';

        // Grid Headers (Days)
        const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const todayStr = new Date().toISOString().split('T')[0];

        let gridHeaderHtml = `
            <div class="grid-header-row">
                <div class="header-cell align-left">Habit</div>
                <div class="header-cell">Streak</div>
        `;

        weekDates.forEach((date, i) => {
            const isToday = date === todayStr;
            gridHeaderHtml += `<div class="header-cell ${isToday ? 'today' : ''}">${dayHeaders[i]}</div>`;
        });

        gridHeaderHtml += `<div class="header-cell"></div></div>`; // Action col
        bodyDiv.innerHTML = gridHeaderHtml;

        // Render Rows
        habits.forEach(habit => {
            const row = this._createHabitRow(habit, weekDates, logs);
            bodyDiv.appendChild(row);
        });

        stackDiv.innerHTML = headerHtml;
        stackDiv.appendChild(bodyDiv);

        // Bind Accordion
        stackDiv.querySelector('.stack-header').addEventListener('click', () => {
            stackDiv.classList.toggle('collapsed');
        });

        return stackDiv;
    }

    _createHabitRow(habit, weekDates, logs) {
        const row = document.createElement('div');
        row.className = 'habit-row';

        // 1. Name Cell
        const nameCell = document.createElement('div');
        nameCell.className = 'h-cell name-col';
        nameCell.innerHTML = `
            <div class="habit-icon"><i class="${habit.icon}"></i></div>
            <span>${habit.title}</span>
        `;
        row.appendChild(nameCell);

        // 2. Streak/Stats Cell (Placeholder logic)
        const statCell = document.createElement('div');
        statCell.className = 'h-cell';
        statCell.innerHTML = `<span class="fire-streak" style="opacity:0.6"><i class="fa-solid fa-fire"></i> 0</span>`;
        row.appendChild(statCell);

        // 3. Day Checkboxes
        weekDates.forEach(dateStr => {
            const cell = document.createElement('div');
            cell.className = 'h-cell';
            
            const isDone = logs.some(l => l.habit_id === habit.id && l.log_date === dateStr && l.status === 1);
            
            const btn = document.createElement('button');
            btn.className = `check-btn ${isDone ? 'done' : ''}`;
            if(isDone) btn.innerHTML = '<i class="fa-solid fa-check"></i>';

            // Click Handler
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent stack collapse
                // Optimistic UI
                btn.classList.toggle('done');
                btn.innerHTML = btn.classList.contains('done') ? '<i class="fa-solid fa-check"></i>' : '';
                // API Call
                HabitAPI.toggleDay(habit.id, dateStr);
            });

            cell.appendChild(btn);
            row.appendChild(cell);
        });

        // 4. Action Cell (Delete)
        const actionCell = document.createElement('div');
        actionCell.className = 'h-cell';
        const delBtn = document.createElement('i');
        delBtn.className = 'fa-solid fa-trash';
        delBtn.style.cssText = "opacity:0.3; cursor:pointer; font-size:0.8rem;";
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm(`Delete "${habit.title}"?`)) {
                HabitAPI.deleteHabit(habit.id);
            }
        });
        actionCell.appendChild(delBtn);
        row.appendChild(actionCell);

        return row;
    }

    _getWeekDates() {
        const dates = [];
        const current = new Date(this.currentWeekStart); 
        for (let i = 0; i < 7; i++) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }

    _getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        const newDate = new Date(d.setDate(diff));
        newDate.setHours(0,0,0,0); // Ensure time is zeroed out
        return newDate;
    }
}