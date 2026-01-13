import { HabitAPI } from "../../api/HabitAPI.js";

export class HabitUI {
    constructor(container) {
        this.container = container;
        // Calculate Monday of the current week based on local time
        this.currentWeekStart = this._getMonday(new Date());
        
        // Cache DOM elements for the header stats/dates
        this.dom = {
            headerTitle: document.querySelector('.habit-header h2'),
            headerSub: document.querySelector('.header-sub')
        };
    }

    /**
     * Main render function
     * @param {Array} habits - List of habit objects
     * @param {Array} logs - List of completion logs for the current week range
     * @param {String} viewMode - 'all', 'focus', or 'mastery'
     */
    render(habits, logs, viewMode) {
        this.updateHeader();
        this.container.innerHTML = '';
        
        // Handle empty state
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

        // 1. Group habits by Stack Name
        const stacks = {};
        habits.forEach(h => {
            const stackName = h.stack_name || 'General';
            if (!stacks[stackName]) stacks[stackName] = [];
            stacks[stackName].push(h);
        });

        // 2. Generate date strings for the grid columns (Mon-Sun)
        const weekDates = this._getWeekDates();

        // 3. Render each Stack
        Object.keys(stacks).forEach(stackName => {
            const stackEl = this._createStackElement(stackName, stacks[stackName], weekDates, logs, viewMode);
            this.container.appendChild(stackEl);
        });
    }

    /**
     * Updates the header text (e.g. "Week 52 • Dec 22 - Dec 28")
     */
    updateHeader() {
        if (!this.dom.headerSub) return;

        const start = this.currentWeekStart;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        // Calculate Week Number (ISO standard approximation)
        const oneJan = new Date(start.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((start - oneJan) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((start.getDay() + 1 + numberOfDays) / 7);

        const opt = { month: 'short', day: 'numeric' };
        const rangeStr = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
        
        this.dom.headerSub.textContent = `Week ${weekNum} • ${rangeStr}`;
    }

    /**
     * Creates the Accordion Group (Stack)
     */
    _createStackElement(stackName, habits, weekDates, logs, viewMode) {
        const stackDiv = document.createElement('div');
        stackDiv.className = 'habit-stack';
        
        // Apply special styling for Mastery view
        if (viewMode === 'mastery') {
            stackDiv.classList.add('mastered');
        }

        // Header
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
        
        // Body (Grid)
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'stack-body';

        // 1. Grid Headers (M, T, W, T, F, S, S)
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

        gridHeaderHtml += `<div class="header-cell"></div></div>`; // Action column
        bodyDiv.innerHTML = gridHeaderHtml;

        // 2. Render Individual Habit Rows
        habits.forEach(habit => {
            const row = this._createHabitRow(habit, weekDates, logs, viewMode);
            bodyDiv.appendChild(row);
        });

        stackDiv.innerHTML = headerHtml;
        stackDiv.appendChild(bodyDiv);

        // Bind Accordion Click
        stackDiv.querySelector('.stack-header').addEventListener('click', () => {
            stackDiv.classList.toggle('collapsed');
        });

        return stackDiv;
    }

    /**
     * Creates a single habit row
     */
    _createHabitRow(habit, weekDates, logs, viewMode) {
        const row = document.createElement('div');
        row.className = 'habit-row';

        // Col 1: Name & Icon
        const nameCell = document.createElement('div');
        nameCell.className = 'h-cell name-col';
        nameCell.innerHTML = `
            <div class="habit-icon"><i class="${habit.icon}"></i></div>
            <span>${habit.title}</span>
        `;
        row.appendChild(nameCell);

        // Col 2: Streak Calculation
        const currentStreak = this._calculateStreak(habit.id, logs);
        
        const statCell = document.createElement('div');
        statCell.className = 'h-cell';
        // Hide streak if 0, or dim it
        const streakStyle = currentStreak > 0 ? 'opacity:1; color:#fb923c;' : 'opacity:0.3;';
        statCell.innerHTML = `<span class="fire-streak" style="${streakStyle}">
            <i class="fa-solid fa-fire"></i> ${currentStreak}
        </span>`;
        row.appendChild(statCell);

        // Col 3-9: Day Checkboxes
        weekDates.forEach(dateStr => {
            const cell = document.createElement('div');
            cell.className = 'h-cell';
            
            // Check if log exists for this habit+date
            const isDone = logs.some(l => l.habit_id === habit.id && l.log_date === dateStr && l.status === 1);
            
            const btn = document.createElement('button');
            btn.className = `check-btn ${isDone ? 'done' : ''}`;
            if(isDone) btn.innerHTML = '<i class="fa-solid fa-check"></i>';

            // Checkbox Click Event
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent stack collapsing
                
                // Optimistic UI Update
                btn.classList.toggle('done');
                const isNowDone = btn.classList.contains('done');
                btn.innerHTML = isNowDone ? '<i class="fa-solid fa-check"></i>' : '';
                
                // Trigger API
                HabitAPI.toggleDay(habit.id, dateStr);
            });

            cell.appendChild(btn);
            row.appendChild(cell);
        });

        // Col 10: Actions (Archive/Restore + Delete)
        const actionCell = document.createElement('div');
        actionCell.className = 'h-cell';
        
        // Configure Archive Button based on View Mode
        const isMastery = viewMode === 'mastery';
        const archiveIcon = isMastery ? 'fa-solid fa-box-open' : 'fa-solid fa-trophy';
        const archiveTitle = isMastery ? 'Restore Habit' : 'Archive (Master) Habit';
        const archiveColor = isMastery ? '#60a5fa' : '#fbbf24'; // Blue for restore, Gold for master

        const archiveBtn = document.createElement('i');
        archiveBtn.className = archiveIcon;
        archiveBtn.title = archiveTitle;
        archiveBtn.style.cssText = `opacity:0.6; cursor:pointer; font-size:0.9rem; margin-right:12px; color:${archiveColor};`;
        
        archiveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const msg = isMastery ? `Restore "${habit.title}" to active list?` : `Archive "${habit.title}" as Mastered?`;
            if(confirm(msg)) {
                HabitAPI.toggleArchive(habit.id);
            }
        });

        const delBtn = document.createElement('i');
        delBtn.className = 'fa-solid fa-trash';
        delBtn.title = "Delete Permanently";
        delBtn.style.cssText = "opacity:0.3; cursor:pointer; font-size:0.8rem; color:#ef4444;";
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm(`Delete "${habit.title}" permanently? This cannot be undone.`)) {
                HabitAPI.deleteHabit(habit.id);
            }
        });

        actionCell.appendChild(archiveBtn);
        actionCell.appendChild(delBtn);
        row.appendChild(actionCell);

        return row;
    }

    /**
     * Calculates streak by checking contiguous days backwards from Today/Yesterday.
     */
    _calculateStreak(habitId, logs) {
        // 1. Get all logs for this habit where status is Done
        const habitLogs = logs
            .filter(l => l.habit_id === habitId && l.status === 1)
            .map(l => l.log_date)
            // Sort Descending (Newest first)
            .sort((a, b) => new Date(b) - new Date(a));

        if (habitLogs.length === 0) return 0;

        // 2. Define "Current" context
        // Streak is valid if the most recent log is Today OR Yesterday.
        // If the last log was 2 days ago, the streak is broken (0).
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date(Date.now() - 86400000);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        // Check head of list
        const lastLog = habitLogs[0];
        if (lastLog !== today && lastLog !== yesterday) {
            return 0; 
        }

        // 3. Count backwards
        let streak = 1;
        let currentDate = new Date(lastLog); // Start counting from the valid head

        for (let i = 1; i < habitLogs.length; i++) {
            const prevDate = new Date(habitLogs[i]);
            
            // Calc difference in days
            const diffTime = Math.abs(currentDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays === 1) {
                // It's consecutive
                streak++;
                currentDate = prevDate;
            } else {
                // Gap found
                break;
            }
        }
        return streak;
    }

    /**
     * Returns array of 7 date strings (YYYY-MM-DD) for the current week
     */
    _getWeekDates() {
        const dates = [];
        const current = new Date(this.currentWeekStart);
        for (let i = 0; i < 7; i++) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }

    /**
     * Gets the Monday of the week for a given date
     */
    _getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const newDate = new Date(d.setDate(diff));
        newDate.setHours(0,0,0,0);
        return newDate;
    }
}