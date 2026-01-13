import { HabitAPI } from "../../api/HabitAPI.js";
import { handleHabitContextMenu } from "./createCustomMenu.js";

export class HabitUI {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks; 
        this.currentWeekStart = this._getMonday(new Date());
        
        this.dom = {
            headerTitle: document.querySelector('.habit-header h2'),
            headerSub: document.querySelector('.header-sub')
        };
    }

    // UPDATED: Accept stackOrder
    render(habits, logs, viewMode, stackOrder = []) {
        this.updateHeader();
        this.container.innerHTML = '';
        
        if (habits.length === 0) {
            const emptyMsg = viewMode === 'mastery' 
                ? "No mastered habits yet. Keep pushing!" 
                : "No active habits found. Create one to get started.";
            
            // FIXED: Use Flexbox to ensure Icon and Text are centered and close together
            this.container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280; margin-top: 50px; font-size: 1.1rem; width: 100%;">
                    <span>${emptyMsg}</span>
                </div>`;
            return;
        }

        const stacks = {};
        // ... (Rest of the render function remains the same)
        habits.forEach(h => {
            const stackName = h.stack_name || 'General';
            if (!stacks[stackName]) stacks[stackName] = [];
            stacks[stackName].push(h);
        });

        const weekDates = this._getWeekDates();

        // --- SORTING LOGIC ---
        let stackKeys = Object.keys(stacks);
        
        if (stackOrder && stackOrder.length > 0) {
            stackKeys.sort((a, b) => {
                const idxA = stackOrder.indexOf(a);
                const idxB = stackOrder.indexOf(b);
                
                // If both are in the saved order, sort by index
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                
                // If only A is found, put A first
                if (idxA !== -1) return -1;
                
                // If only B is found, put B first
                if (idxB !== -1) return 1;
                
                // Fallback to alphabetical
                return a.localeCompare(b);
            });
        } else {
            stackKeys.sort(); // Default Alphabetical if no save data
        }

        stackKeys.forEach(stackName => {
            const stackEl = this._createStackElement(stackName, stacks[stackName], weekDates, logs, viewMode);
            this.container.appendChild(stackEl);
        });
    }

    // ... (Rest of class: updateHeader, _createStackElement, _createHabitRow, etc. remain unchanged) ...
    updateHeader() {
        if (!this.dom.headerSub) return;
        const start = this.currentWeekStart;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const opt = { month: 'short', day: 'numeric' };
        const rangeStr = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
        this.dom.headerSub.textContent = `Current Week • ${rangeStr}`;
    }

    _createStackElement(stackName, habits, weekDates, logs, viewMode) {
        const stackDiv = document.createElement('div');
        stackDiv.className = 'habit-stack';
        if (viewMode === 'mastery') stackDiv.classList.add('mastered');

        stackDiv.dataset.stackName = stackName; 

        const headerHtml = `
            <div class="stack-header">
                <div class="stack-title">
                    <i class="fa-solid fa-chevron-down stack-chevron"></i>
                    <span class="stack-title-text">${stackName}</span>
                </div>
                <div class="stack-meta">
                    ${habits.length} ${habits.length === 1 ? 'Habit' : 'Habits'}
                </div>
            </div>
        `;
        
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'stack-body';

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

        gridHeaderHtml += `<div class="header-cell"></div></div>`; 
        bodyDiv.innerHTML = gridHeaderHtml;

        habits.forEach(habit => {
            const row = this._createHabitRow(habit, weekDates, logs, viewMode);
            bodyDiv.appendChild(row);
        });

        stackDiv.innerHTML = headerHtml;
        stackDiv.appendChild(bodyDiv);

        stackDiv.querySelector('.stack-header').addEventListener('click', () => {
            stackDiv.classList.toggle('collapsed');
        });

        return stackDiv;
    }

    _createHabitRow(habit, weekDates, logs, viewMode) {
        const row = document.createElement('div');
        row.className = 'habit-row';

        row.addEventListener('contextmenu', (e) => {
            handleHabitContextMenu(e, habit, this.callbacks);
        });

        const nameCell = document.createElement('div');
        nameCell.className = 'h-cell name-col';
        nameCell.innerHTML = `
            <div class="habit-icon"><i class="${habit.icon}"></i></div>
            <span>${habit.title}</span>
        `;
        row.appendChild(nameCell);

        const currentStreak = this._calculateStreak(habit.id, logs);
        const statCell = document.createElement('div');
        statCell.className = 'h-cell';
        const streakStyle = currentStreak > 0 ? 'opacity:1; color:#fb923c;' : 'opacity:0.3;';
        statCell.innerHTML = `<span class="fire-streak" style="${streakStyle}"><i class="fa-solid fa-fire"></i> ${currentStreak}</span>`;
        row.appendChild(statCell);

        weekDates.forEach(dateStr => {
            const cell = document.createElement('div');
            cell.className = 'h-cell';
            const isDone = logs.some(l => l.habit_id === habit.id && l.log_date === dateStr && l.status === 1);
            
            const btn = document.createElement('button');
            btn.className = `check-btn ${isDone ? 'done' : ''}`;
            if(isDone) btn.innerHTML = '<i class="fa-solid fa-check"></i>';

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.classList.toggle('done');
                const isNowDone = btn.classList.contains('done');
                btn.innerHTML = isNowDone ? '<i class="fa-solid fa-check"></i>' : '';
                HabitAPI.toggleDay(habit.id, dateStr);
            });

            cell.appendChild(btn);
            row.appendChild(cell);
        });

        const actionCell = document.createElement('div');
        actionCell.className = 'h-cell';
        
        const menuBtn = document.createElement('i');
        menuBtn.className = 'fa-solid fa-ellipsis-vertical';
        menuBtn.style.cssText = "opacity:0.5; cursor:pointer; font-size:1rem; padding:5px;";
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleHabitContextMenu(e, habit, this.callbacks);
        });

        actionCell.appendChild(menuBtn);
        row.appendChild(actionCell);

        return row;
    }

    _calculateStreak(habitId, logs) {
        const habitLogs = logs
            .filter(l => l.habit_id === habitId && l.status === 1)
            .map(l => l.log_date)
            .sort((a, b) => new Date(b) - new Date(a));

        if (habitLogs.length === 0) return 0;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (habitLogs[0] !== today && habitLogs[0] !== yesterday) return 0;

        let streak = 1;
        let currentDate = new Date(habitLogs[0]);

        for (let i = 1; i < habitLogs.length; i++) {
            const prevDate = new Date(habitLogs[i]);
            const diffDays = Math.ceil(Math.abs(currentDate - prevDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                streak++;
                currentDate = prevDate;
            } else {
                break;
            }
        }
        return streak;
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
        newDate.setHours(0,0,0,0);
        return newDate;
    }
}