import { FocusAPI } from "../api/FocusAPI.js";

export class CalendarManager {
    constructor() {
        this.currentDate = new Date(); // Tracks the currently viewed month
        this.today = new Date(); // Fixed point for "Today" highlight
        
        // Cache DOM elements
        this.dom = {
            grid: document.getElementById('calendar-grid'),
            title: document.getElementById('cal-month-title'),
            btnPrev: document.getElementById('cal-prev-btn'),
            btnNext: document.getElementById('cal-next-btn'),
            statDays: document.getElementById('cal-stat-days'),
            statAvg: document.getElementById('cal-stat-avg'),
            statTotal: document.getElementById('cal-stat-total')
        };

        this.init();
    }

    init() {
        // Guard Clause: Ensure essential elements exist
        if (!this.dom.grid || !this.dom.btnPrev || !this.dom.btnNext) {
            console.warn("CalendarManager: Missing DOM elements (grid or buttons).");
            return;
        }

        // Listeners
        this.dom.btnPrev.addEventListener('click', () => this.changeMonth(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeMonth(1));

        // Listen for data from FocusHandler
        document.addEventListener('kaizen:calendar-update', (e) => {
            this.updateData(e.detail);
        });
        
        // Initial Load
        this.renderStructure();
        this.fetchData();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderStructure();
        this.fetchData();
    }

    /**
     * Renders the grid structure (empty slots + day numbers) without data.
     */
    renderStructure() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update Title
        if (this.dom.title) {
            const monthName = this.currentDate.toLocaleString('default', { month: 'long' });
            this.dom.title.textContent = `${monthName} ${year}`;
        }

        // Math for grid
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Clear existing days (Keep headers!)
        // Use querySelectorAll to find ONLY .day-cell elements to remove
        const existingCells = this.dom.grid.querySelectorAll('.day-cell');
        existingCells.forEach(el => el.remove());

        // 1. Render Empty Slots (Padding)
        for (let i = 0; i < firstDayIndex; i++) {
            const div = document.createElement('div');
            div.className = 'day-cell empty';
            this.dom.grid.appendChild(div);
        }

        // 2. Render Days
        for (let day = 1; day <= daysInMonth; day++) {
            const div = document.createElement('div');
            div.className = 'day-cell';
            div.textContent = day;
            div.dataset.day = day; // To target it later with data

            // Check if Today
            if (day === this.today.getDate() && 
                month === this.today.getMonth() && 
                year === this.today.getFullYear()) {
                div.classList.add('today');
            }

            this.dom.grid.appendChild(div);
        }
    }

    /**
     * Fetch data from DB for the current view.
     */
    fetchData() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Start of Month
        const start = new Date(year, month, 1);
        start.setHours(0,0,0,0);

        // End of Month
        const end = new Date(year, month + 1, 0);
        end.setHours(23,59,59,999);

        // Format to UTC String for SQLite
        const toSQL = (d) => d.toISOString().replace('T', ' ').split('.')[0];

        FocusAPI.getCalendarData(toSQL(start), toSQL(end));
    }

    /**
     * Receive data from Handler and update UI.
     * @param {Array} sessions 
     */
    updateData(sessions) {
        if (!this.dom.grid) return;

        // 1. Reset visual state (remove 'focused' class)
        const cells = this.dom.grid.querySelectorAll('.day-cell:not(.empty)');
        cells.forEach(c => {
            c.classList.remove('level-1', 'level-2', 'level-3', 'level-4');
            c.title = ""; 
        });

        // 2. Aggregate Data by Day
        const dayStats = {}; // { 1: totalSeconds, 5: totalSeconds }
        let monthTotalSeconds = 0;
        let activeDaysCount = 0;

        sessions.forEach(session => {
            const utcString = session.created_at.replace(' ', 'T') + 'Z';
            const d = new Date(utcString); 
            
            const dayNum = d.getDate();
            if (!dayStats[dayNum]) {
                dayStats[dayNum] = 0;
                activeDaysCount++;
            }
            dayStats[dayNum] += (session.focus_seconds || 0);
            monthTotalSeconds += (session.focus_seconds || 0);
        });

        // 3. Update Grid
        Object.keys(dayStats).forEach(dayNum => {
            // Find the cell
            const cell = this.dom.grid.querySelector(`.day-cell[data-day="${dayNum}"]`);
            if (cell) {
                const totalSeconds = dayStats[dayNum];
                const mins = Math.floor(totalSeconds / 60);

                // Determine Intensity Class
                // Level 1: > 0 mins
                // Level 2: > 60 mins (1 hour)
                // Level 3: > 120 mins (2 hours)
                // Level 4: > 240 mins (4 hours)
                let intensityClass = 'level-1';
                if (mins >= 240) intensityClass = 'level-4';
                else if (mins >= 120) intensityClass = 'level-3';
                else if (mins >= 60) intensityClass = 'level-2';

                cell.classList.add(intensityClass);
                
                // Tooltip
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                cell.title = `${timeStr} focused`;
            }
        });

        // 4. Update Footer Stats
        const totalMins = Math.floor(monthTotalSeconds / 60);
        const avgMins = activeDaysCount > 0 ? Math.floor(totalMins / activeDaysCount) : 0;
        const totalDaysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();

        if (this.dom.statDays) this.dom.statDays.textContent = `${activeDaysCount} of ${totalDaysInMonth}`;
        if (this.dom.statAvg) this.dom.statAvg.textContent = `${avgMins}m`;
        if (this.dom.statTotal) this.dom.statTotal.textContent = `${this._formatTime(monthTotalSeconds)}`;
    }

    _formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }
}