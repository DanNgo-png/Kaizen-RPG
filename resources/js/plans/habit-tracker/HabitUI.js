import { HabitAPI } from "../../api/HabitAPI.js";
import { handleHabitContextMenu } from "./createCustomMenu.js";

export class HabitUI {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks; // Contains: onEdit, onAddStack, onEditStack
        this.currentWeekStart = this._getMonday(new Date());
        
        this.dom = {
            headerTitle: document.querySelector('.habit-header h2'),
            headerSub: document.querySelector('.header-sub')
        };
    }

    /**
     * Main Render Function
     * Now accepts stackConfig to render specific colors and icons.
     */
    render(habits, logs, viewMode, stackOrder = [], stackConfig = {}) {
        this.updateHeader();
        this.container.innerHTML = '';
        
        if (habits.length === 0) {
            const emptyMsg = viewMode === 'mastery' 
                ? "No mastered habits yet. Keep pushing!" 
                : "No active habits found. Create one to get started.";
            
            this.container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280; margin-top: 50px; font-size: 1.1rem; width: 100%;">
                    <span>${emptyMsg}</span>
                </div>`;
            return;
        }

        // Group habits by stack
        const stacks = {};
        habits.forEach(h => {
            const stackName = h.stack_name || 'General';
            if (!stacks[stackName]) stacks[stackName] = [];
            stacks[stackName].push(h);
        });

        const weekDates = this._getWeekDates();

        // Sort Stacks based on saved order
        let stackKeys = Object.keys(stacks);
        if (stackOrder && stackOrder.length > 0) {
            stackKeys.sort((a, b) => {
                const idxA = stackOrder.indexOf(a);
                const idxB = stackOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });
        } else {
            stackKeys.sort();
        }

        // Create DOM elements for each stack
        stackKeys.forEach(stackName => {
            // Get config for this stack (color/icon) or default
            const config = stackConfig[stackName] || { color: null, icon: null };
            
            const stackEl = this._createStackElement(stackName, stacks[stackName], weekDates, logs, viewMode, config);
            this.container.appendChild(stackEl);
        });
    }

    _createStackElement(stackName, habits, weekDates, logs, viewMode, config) {
        const stackDiv = document.createElement('div');
        stackDiv.className = 'habit-stack';
        if (viewMode === 'mastery') stackDiv.classList.add('mastered');
        
        // Data attribute for drag logic
        stackDiv.dataset.stackName = stackName; 

        // --- 1. Dynamic Styling (Color & Icon) ---
        const borderColor = config.color || '#374151'; // Default gray border
        stackDiv.style.borderLeft = `4px solid ${borderColor}`;

        // Header Gradient Background (Subtle tint)
        const headerStyle = config.color 
            ? `background: linear-gradient(90deg, ${config.color}15 0%, rgba(255,255,255,0.02) 100%);` 
            : '';

        // Icon Style
        const iconStyle = config.color ? `color: ${config.color}; margin-right: 10px;` : 'margin-right: 10px;';
        
        // If config.icon exists, render it. 
        const stackIconHtml = config.icon 
            ? `<i class="${config.icon}" style="${iconStyle}"></i>` 
            : ''; 

        // --- 2. Build Header HTML ---
        const headerHtml = `
            <div class="stack-header" style="${headerStyle}">
                <div class="stack-title">
                    <i class="fa-solid fa-chevron-down stack-chevron"></i>
                    ${stackIconHtml}
                    <span class="stack-title-text">${stackName}</span>
                </div>
                <div class="stack-controls">
                    <div class="stack-meta">
                        ${habits.length} ${habits.length === 1 ? 'Habit' : 'Habits'}
                    </div>
                    <!-- SETTINGS BUTTON (Gear Icon) -->
                    <button class="btn-stack-settings" title="Customize Stack">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                </div>
            </div>
        `;
        
        // --- 3. Build Body (Grid) ---
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'stack-body';

        // Grid Column Headers
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
        gridHeaderHtml += `<div class="header-cell"></div></div>`; // Action column placeholder
        
        bodyDiv.innerHTML = gridHeaderHtml;

        // Render Habit Rows
        habits.forEach(habit => {
            const row = this._createHabitRow(habit, weekDates, logs, viewMode);
            bodyDiv.appendChild(row);
        });

        stackDiv.innerHTML = headerHtml;
        stackDiv.appendChild(bodyDiv);

        // --- 4. Event Listeners ---
        
        // Toggle Collapse
        const headerEl = stackDiv.querySelector('.stack-header');
        headerEl.addEventListener('click', (e) => {
            // Don't collapse if clicking the settings button
            if (e.target.closest('.btn-stack-settings')) return;
            stackDiv.classList.toggle('collapsed');
        });

        // Settings Button Click (Triggers the Modal)
        const settingsBtn = stackDiv.querySelector('.btn-stack-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop collapse
                if (this.callbacks.onEditStack) {
                    this.callbacks.onEditStack(stackName);
                }
            });
        }

        return stackDiv;
    }

    _createHabitRow(habit, weekDates, logs, viewMode) {
        const row = document.createElement('div');
        row.className = 'habit-row';

        // Context Menu
        row.addEventListener('contextmenu', (e) => {
            handleHabitContextMenu(e, habit, this.callbacks);
        });

        // Name Column
        const nameCell = document.createElement('div');
        nameCell.className = 'h-cell name-col';
        nameCell.innerHTML = `
            <div class="habit-icon"><i class="${habit.icon}"></i></div>
            <span>${habit.title}</span>
        `;
        row.appendChild(nameCell);

        // Streak Column
        const currentStreak = this._calculateStreak(habit.id, logs);
        const statCell = document.createElement('div');
        statCell.className = 'h-cell';
        const streakStyle = currentStreak > 0 ? 'opacity:1; color:#fb923c;' : 'opacity:0.3;';
        statCell.innerHTML = `<span class="fire-streak" style="${streakStyle}"><i class="fa-solid fa-fire"></i> ${currentStreak}</span>`;
        row.appendChild(statCell);

        // Days Columns
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

        // Action Menu Column
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

    updateHeader() {
        if (!this.dom.headerSub) return;
        const start = this.currentWeekStart;
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const opt = { month: 'short', day: 'numeric' };
        const rangeStr = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
        this.dom.headerSub.textContent = `Current Week • ${rangeStr}`;
    }
}