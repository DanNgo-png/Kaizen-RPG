export class CalendarWidget {
    constructor({ onDateSelect, onRepeatChange }) {
        this.onDateSelect = onDateSelect;
        this.onRepeatChange = onRepeatChange;
        
        this.today = new Date();
        this.viewDate = new Date(); // The month currently visible
        this.selectedDate = null;   // The actual due date
        this.repeatRule = null;
        this._handleDocumentClick = this._handleDocumentClick.bind(this);

        this.dom = {
            input: document.getElementById('task-due-date-input'),
            btnRepeat: document.getElementById('btn-toggle-repeat'),
            repeatMenu: document.getElementById('repeat-options-overlay'),
            
            // Calendar Elements
            monthLabel: document.getElementById('cal-month-year'),
            prevBtn: document.getElementById('cal-prev'),
            nextBtn: document.getElementById('cal-next'),
            grid: document.getElementById('cal-days-grid'),
            
            // Shortcuts
            shortcuts: document.querySelectorAll('.chip-btn'),
            
            // Dynamic Repeat Labels
            optWeekly: document.getElementById('opt-weekly'),
            optMonthly: document.getElementById('opt-monthly'),
            optYearly: document.getElementById('opt-yearly'),
            btnClearRepeat: document.getElementById('btn-clear-repeat')
        };

        this.init();
    }

    init() {
        if (!this.dom.input) return; // Guard if modal not loaded yet

        this.renderCalendar();

        // 1. Navigation
        this.dom.prevBtn.addEventListener('click', () => this.changeMonth(-1));
        this.dom.nextBtn.addEventListener('click', () => this.changeMonth(1));

        // 2. Input Logic (Basic parsing)
        this.dom.input.addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                this.selectDate(date);
            }
        });

        // 3. Shortcuts
        this.dom.shortcuts.forEach(btn => {
            btn.addEventListener('click', () => this.handleShortcut(btn.dataset.action));
        });

        // 4. Repeat Menu Toggle
        if (this.dom.btnRepeat) {
            this.dom.btnRepeat.addEventListener('click', (e) => {
                e.stopPropagation();
                if(this.dom.repeatMenu) {
                    this.dom.repeatMenu.classList.toggle('hidden');
                    this.updateRepeatLabels();
                }
            });
        }

        // Close repeat menu on outside click
        document.addEventListener('click', this._handleDocumentClick);

        // 5. Repeat Options
        if (this.dom.repeatMenu) {
            this.dom.repeatMenu.querySelectorAll('.repeat-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    this.setRepeat(opt.dataset.val);
                    this.dom.repeatMenu.classList.add('hidden');
                });
            });
        }

        if (this.dom.btnClearRepeat) {
            this.dom.btnClearRepeat.addEventListener('click', () => {
                this.setRepeat(null);
                this.dom.repeatMenu.classList.add('hidden');
            });
        }
    }

    // Extracted handler for clean removal
    _handleDocumentClick(e) {
        if (this.dom.repeatMenu && !this.dom.repeatMenu.classList.contains('hidden') && 
            !this.dom.repeatMenu.contains(e.target) && 
            this.dom.btnRepeat &&
            e.target !== this.dom.btnRepeat &&
            !this.dom.btnRepeat.contains(e.target)) {
            this.dom.repeatMenu.classList.add('hidden');
        }
    }

    loadTaskData(dueDate, repeatRule) {
        // Reset View based on task data
        // Handle SQLite date string "YYYY-MM-DD" or Date object
        if (dueDate) {
            // Fix timezone offset issue by treating YYYY-MM-DD as local
            if (typeof dueDate === 'string' && dueDate.includes('-')) {
                const [y, m, d] = dueDate.split('-').map(Number);
                this.selectedDate = new Date(y, m - 1, d);
            } else {
                this.selectedDate = new Date(dueDate);
            }
        } else {
            this.selectedDate = null;
        }

        this.viewDate = this.selectedDate ? new Date(this.selectedDate) : new Date();
        this.repeatRule = repeatRule;

        this.updateInputDisplay();
        this.renderCalendar();
        this.updateRepeatButtonState();
    }

    // --- Core Logic ---

    changeMonth(delta) {
        this.viewDate.setMonth(this.viewDate.getMonth() + delta);
        this.renderCalendar();
    }

    selectDate(date) {
        this.selectedDate = new Date(date);
        // Ensure view jumps to selected date
        this.viewDate = new Date(date);
        
        this.updateInputDisplay();
        this.renderCalendar();
        
        // Emit format: YYYY-MM-DD (Local)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const sqlDate = `${year}-${month}-${day}`;

        if (this.onDateSelect) this.onDateSelect(sqlDate);
    }

    setRepeat(rule) {
        this.repeatRule = rule;
        this.updateRepeatButtonState();
        if (this.onRepeatChange) this.onRepeatChange(rule);
    }

    handleShortcut(action) {
        const d = new Date();
        d.setHours(0,0,0,0);

        switch(action) {
            case 'today':
                break; // d is already today
            case 'tomorrow':
                d.setDate(d.getDate() + 1);
                break;
            case 'weekend':
                const day = d.getDay();
                // If today is Sunday (0), next Sat is +6
                // If today is Saturday (6), next Sat is +7 (next weekend) or +0 (today)? Usually next.
                // Let's aim for the upcoming Saturday.
                const dist = 6 - day + (day === 6 ? 7 : 0); 
                d.setDate(d.getDate() + dist);
                break;
            case 'next-week':
                const day2 = d.getDay();
                // Distance to next Monday. 
                // If today is Monday (1), +7. If Sunday (0), +1.
                const dist2 = (1 + 7 - day2) % 7; 
                const finalDist = dist2 === 0 ? 7 : dist2;
                d.setDate(d.getDate() + finalDist);
                break;
        }
        this.selectDate(d);
    }

    // Cleanup method
    destroy() {
        document.removeEventListener('click', this._handleDocumentClick);
        this.dom = {}; 
    }

    // --- Rendering ---

    renderCalendar() {
        if (!this.dom.grid) return;

        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        
        // Header
        const monthName = this.viewDate.toLocaleString('default', { month: 'long' });
        if(this.dom.monthLabel) this.dom.monthLabel.textContent = `${monthName} ${year}`;

        // ... existing grid math ...
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        this.dom.grid.innerHTML = '';

        // ... existing loop ...
        for (let i = 0; i < firstDayIndex; i++) {
            const el = document.createElement('div');
            el.className = 'cal-day empty';
            this.dom.grid.appendChild(el);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const el = document.createElement('div');
            el.className = 'cal-day';
            el.textContent = i;

            if (i === this.today.getDate() && month === this.today.getMonth() && year === this.today.getFullYear()) {
                el.classList.add('today');
            }

            if (this.selectedDate && 
                i === this.selectedDate.getDate() && 
                month === this.selectedDate.getMonth() && 
                year === this.selectedDate.getFullYear()) {
                el.classList.add('selected');
            }

            el.addEventListener('click', () => {
                const newDate = new Date(year, month, i);
                this.selectDate(newDate);
            });

            this.dom.grid.appendChild(el);
        }
    }

    updateInputDisplay() {
        if (!this.selectedDate) {
            this.dom.input.value = "";
            return;
        }
        
        // Smart formatting
        const now = new Date();
        now.setHours(0,0,0,0);
        
        // Clone selected to avoid mutation and reset time
        const sel = new Date(this.selectedDate);
        sel.setHours(0,0,0,0);
        
        const diffTime = sel - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 0) this.dom.input.value = "Today";
        else if (diffDays === 1) this.dom.input.value = "Tomorrow";
        else if (diffDays === -1) this.dom.input.value = "Yesterday";
        else {
            this.dom.input.value = this.selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric' 
            });
        }
    }

    updateRepeatLabels() {
        const baseDate = this.selectedDate || this.today;
        const weekday = baseDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dayNum = baseDate.getDate();
        const month = baseDate.toLocaleDateString('en-US', { month: 'long' });

        if(this.dom.optWeekly) this.dom.optWeekly.textContent = `Every Week on ${weekday}`;
        if(this.dom.optMonthly) this.dom.optMonthly.textContent = `Every Month on the ${this._getOrdinal(dayNum)}`;
        if(this.dom.optYearly) this.dom.optYearly.textContent = `Every Year on ${month} ${dayNum}`;
        
        // Highlight active
        if (this.dom.repeatMenu) {
            this.dom.repeatMenu.querySelectorAll('.repeat-option').forEach(el => el.classList.remove('active'));
            if (this.repeatRule) {
                const activeEl = this.dom.repeatMenu.querySelector(`[data-val="${this.repeatRule}"]`);
                if(activeEl) activeEl.classList.add('active');
                this.dom.btnClearRepeat.classList.remove('hidden');
            } else {
                this.dom.btnClearRepeat.classList.add('hidden');
            }
        }
    }

    updateRepeatButtonState() {
        if (this.repeatRule) {
            this.dom.btnRepeat.classList.add('active');
        } else {
            this.dom.btnRepeat.classList.remove('active');
        }
    }

    _getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
}