import { HabitAPI } from "../../api/HabitAPI.js";
import { handleHabitContextMenu } from "./createCustomMenu.js"; 

export class HabitUI {
    constructor(container, onEditCallback) { 
        this.container = container;
        this.onEditCallback = onEditCallback; 
        this.currentWeekStart = this._getMonday(new Date());
        
        this.dom = {
            headerTitle: document.querySelector('.habit-header h2'),
            headerSub: document.querySelector('.header-sub')
        };
    }

    render(habits, logs, viewMode) {
        this.updateHeader();
        this.container.innerHTML = '';
        
        if (habits.length === 0) {
            const emptyMsg = viewMode === 'mastery' 
                ? "No mastered habits yet. Keep pushing!" 
                : "No active habits found. Create one to get started.";
                
            this.container.innerHTML = `
                <div style="text-align:center; color:#6b7280; margin-top:50px; font-size:0.9rem;">
                    <i class="fa-solid fa-wind" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    ${emptyMsg}
                </div>`;
            return;
        }

        const stacks = {};
        habits.forEach(h => {
            const stackName = h.stack_name || 'General';
            if (!stacks[stackName]) stacks[stackName] = [];
            stacks[stackName].push(h);
        });

        const weekDates = this._getWeekDates();

        Object.keys(stacks).forEach(stackName => {
            const stackEl = this._createStackElement(stackName, stacks[stackName], weekDates, logs, viewMode);
            this.container.appendChild(stackEl);
        });
    }

    updateHeader() {
        if (!this.dom.headerSub) return;
        const start = this.currentWeekStart;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const oneJan = new Date(start.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((start - oneJan) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((start.getDay() + 1 + numberOfDays) / 7);
        const opt = { month: 'short', day: 'numeric' };
        const rangeStr = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
        this.dom.headerSub.textContent = `Week ${weekNum} • ${rangeStr}`;
    }

    _createStackElement(stackName, habits, weekDates, logs, viewMode) {
        const stackDiv = document.createElement('div');
        stackDiv.className = 'habit-stack';
        if (viewMode === 'mastery') stackDiv.classList.add('mastered');

        const headerHtml = `
            <div class="stack-header">
                <div class="stack-title">
                    <i class="fa-solid fa-chevron-down stack-chevron"></i>
                    ${stackName}
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

        // --- NEW: Add Context Menu Listener ---
        row.addEventListener('contextmenu', (e) => {
            handleHabitContextMenu(e, habit, this.onEditCallback);
        });

        // Col 1: Name & Icon
        const nameCell = document.createElement('div');
        nameCell.className = 'h-cell name-col';
        nameCell.innerHTML = `
            <div class="habit-icon"><i class="${habit.icon}"></i></div>
            <span>${habit.title}</span>
        `;
        row.appendChild(nameCell);

        // Col 2: Streak
        const currentStreak = this._calculateStreak(habit.id, logs);
        const statCell = document.createElement('div');
        statCell.className = 'h-cell';
        const streakStyle = currentStreak > 0 ? 'opacity:1; color:#fb923c;' : 'opacity:0.3;';
        statCell.innerHTML = `<span class="fire-streak" style="${streakStyle}">
            <i class="fa-solid fa-fire"></i> ${currentStreak}
        </span>`;
        row.appendChild(statCell);

        // Col 3-9: Days
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

        // Col 10: Actions (Keep these as visual backup)
        const actionCell = document.createElement('div');
        actionCell.className = 'h-cell';
        
        const settingsBtn = document.createElement('i');
        settingsBtn.className = 'fa-solid fa-ellipsis-vertical';
        settingsBtn.style.cssText = "opacity:0.5; cursor:pointer; font-size:1rem; padding:5px;";
        
        // Left click on ellipsis also opens context menu
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleHabitContextMenu(e, habit, this.onEditCallback);
        });

        actionCell.appendChild(settingsBtn);
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
        const yesterdayDate = new Date(Date.now() - 86400000);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        const lastLog = habitLogs[0];
        if (lastLog !== today && lastLog !== yesterday) return 0; 

        let streak = 1;
        let currentDate = new Date(lastLog); 

        for (let i = 1; i < habitLogs.length; i++) {
            const prevDate = new Date(habitLogs[i]);
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

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