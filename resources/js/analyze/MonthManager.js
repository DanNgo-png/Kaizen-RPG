import { FocusAPI } from "../api/FocusAPI.js";

export class MonthManager {
    constructor() {
        this.currentDate = new Date();
        // Set to first day of month to avoid overflow issues (e.g. going from Mar 31 to Feb)
        this.currentDate.setDate(1);

        this.tagsMap = new Map();
        
        // Filter State
        this.hiddenTags = new Set();
        this.currentSessions = [];

        // Helper: Local SQL format
        this.toSQL = (d) => {
            const offsetMs = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offsetMs).toISOString().replace('T', ' ').split('.')[0];
        };

        this.dom = {
            title: document.getElementById('month-header-title'),
            btnPrev: document.getElementById('month-btn-prev'),
            btnNext: document.getElementById('month-btn-next'),
            inputDate: document.getElementById('month-date-input'),
            
            // Stats
            valTime: document.getElementById('month-val-time'),
            valSessions: document.getElementById('month-val-sessions'),
            valDays: document.getElementById('month-val-days'),
            valAvg: document.getElementById('month-val-avg'),

            // Charts
            barContainer: document.getElementById('month-bars-container'),
            donutChart: document.getElementById('month-donut-chart'),
            legendContainer: document.getElementById('month-legend-container')
        };

        // Listeners References
        this.handleData = (e) => {
            // Safety check: ensure we are on the page
            if (document.getElementById('month-header-title')) {
                this.currentSessions = e.detail || [];
                this.render(this.currentSessions);
            }
        };

        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            this.loadMonth(this.currentDate);
        };

        this.init();
    }

    init() {
        if (!this.dom.title) return;

        this.dom.btnPrev.addEventListener('click', () => this.changeMonth(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeMonth(1));

        this.dom.inputDate.addEventListener('change', (e) => {
            // Input value format: "YYYY-MM"
            const [year, month] = e.target.value.split('-');
            if (year && month) {
                this.currentDate = new Date(year, month - 1, 1);
                this.hiddenTags.clear();
                this.loadMonth(this.currentDate);
            }
        });

        // CHANGED: Listen for specific month data to avoid pollution
        Neutralino.events.off('receiveMonthData', this.handleData);
        Neutralino.events.on('receiveMonthData', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        FocusAPI.getTags();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.hiddenTags.clear();
        this.loadMonth(this.currentDate);
    }

    loadMonth(date) {
        this.updateHeader();

        const year = date.getFullYear();
        const month = date.getMonth();

        // Start: First day of month at 00:00:00
        const start = new Date(year, month, 1);
        start.setHours(0, 0, 0, 0);

        // End: Last day of month at 23:59:59
        const end = new Date(year, month + 1, 0);
        end.setHours(23, 59, 59, 999);

        // CHANGED: Request with 'receiveMonthData' target event
        FocusAPI.getFocusSessions(this.toSQL(start), this.toSQL(end), 'receiveMonthData');
    }

    updateHeader() {
        const monthName = this.currentDate.toLocaleString('default', { month: 'long' });
        const year = this.currentDate.getFullYear();
        this.dom.title.textContent = `${monthName} ${year}`;

        // Format for input value: YYYY-MM
        const yyyy = year;
        const mm = (this.currentDate.getMonth() + 1).toString().padStart(2, '0');
        this.dom.inputDate.value = `${yyyy}-${mm}`;
    }

    render(sessions) {
        this.renderStats(sessions);
        this.renderBarChart(sessions);
        this.renderDonut(sessions);
    }

    _getDisplayTag(session) {
        if (session.tag === "Standard" || session.tag === "Flexible") return "No Tag";
        return session.tag || "No Tag";
    }

    toggleTag(tagName) {
        if (this.hiddenTags.has(tagName)) {
            this.hiddenTags.delete(tagName);
        } else {
            this.hiddenTags.add(tagName);
        }
        this.render(this.currentSessions);
    }

    renderStats(sessions) {
        let totalSeconds = 0;
        const activeDaySet = new Set();

        sessions.forEach(s => {
            totalSeconds += s.focus_seconds;
            // Extract YYYY-MM-DD
            const dayStr = s.created_at.split(' ')[0];
            activeDaySet.add(dayStr);
        });

        const activeDays = activeDaySet.size;
        const daysInMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();
        
        // Avg per ACTIVE day
        const avgSeconds = activeDays > 0 ? totalSeconds / activeDays : 0;

        this.dom.valTime.textContent = this._formatDuration(totalSeconds);
        this.dom.valSessions.textContent = sessions.length;
        this.dom.valDays.textContent = `${activeDays} / ${daysInMonth}`;
        this.dom.valAvg.textContent = this._formatDuration(avgSeconds);
    }

    renderBarChart(sessions) {
        if (!this.dom.barContainer) return;
        this.dom.barContainer.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // 1. Prepare Data Buckets: Array of objects { total, breakdown }
        // Index matches day number (0 unused)
        const dailyData = new Array(daysInMonth + 1).fill(null).map(() => ({ total: 0, breakdown: {} }));
        let maxVal = 0;

        sessions.forEach(s => {
            const displayTag = this._getDisplayTag(s);
            if (this.hiddenTags.has(displayTag)) return;

            const d = new Date(s.created_at.replace(' ', 'T'));
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                const dur = s.focus_seconds;

                // Accumulate total
                dailyData[day].total += dur;

                // Accumulate breakdown
                if (!dailyData[day].breakdown[displayTag]) {
                    dailyData[day].breakdown[displayTag] = 0;
                }
                dailyData[day].breakdown[displayTag] += dur;

                if (dailyData[day].total > maxVal) maxVal = dailyData[day].total;
            }
        });

        if (maxVal === 0) maxVal = 1;

        // 3. Render Bars
        for (let i = 1; i <= daysInMonth; i++) {
            const dayData = dailyData[i];
            const val = dayData.total;
            const pct = (val / maxVal) * 100;
            const timeStr = this._formatDuration(val);

            // Determine Background Style (Solid or Gradient)
            let backgroundStyle = '#374151'; // Default gray if 0

            if (val > 0) {
                const entries = Object.entries(dayData.breakdown);
                
                // Single Tag -> Solid Color
                if (entries.length === 1) {
                    const tagName = entries[0][0];
                    backgroundStyle = this.tagsMap.get(tagName) || this._generateColor(tagName);
                } 
                // Multiple Tags -> Linear Gradient Stack
                else {
                    // Sort by duration so largest chunks are consistent (optional)
                    entries.sort((a, b) => b[1] - a[1]);

                    let stops = [];
                    let currentPct = 0;
                    
                    entries.forEach(([tagName, duration]) => {
                        const color = this.tagsMap.get(tagName) || this._generateColor(tagName);
                        const segmentPct = (duration / val) * 100;
                        const endPct = currentPct + segmentPct;
                        
                        stops.push(`${color} ${currentPct}% ${endPct}%`);
                        currentPct = endPct;
                    });
                    
                    backgroundStyle = `linear-gradient(to top, ${stops.join(', ')})`;
                }
            }

            const group = document.createElement('div');
            group.className = 'am-bar-group'; // Matches new CSS class
            
            // We use 'background' to support gradients
            // We use 'data-bar-label' instead of 'data-tooltip' to fix global conflict
            const barHTML = `
                <div class="am-bar" 
                     style="height: ${val > 0 ? Math.max(pct, 2) : 0}%; background: ${backgroundStyle};" 
                     data-bar-label="Day ${i}: ${timeStr}">
                </div>
                <div class="am-x-label">${i}</div>
            `;
            
            group.innerHTML = barHTML;
            this.dom.barContainer.appendChild(group);
        }
    }

    renderDonut(sessions) {
        if (!this.dom.donutChart) return;

        const dist = {};
        let totalTimeAll = 0;

        sessions.forEach(s => {
            const tag = this._getDisplayTag(s);
            dist[tag] = (dist[tag] || 0) + s.focus_seconds;
            totalTimeAll += s.focus_seconds;
        });

        const sortedTags = Object.keys(dist).sort((a, b) => dist[b] - dist[a]);

        let visibleTotalTime = 0;
        sortedTags.forEach(tag => {
            if (!this.hiddenTags.has(tag)) visibleTotalTime += dist[tag];
        });

        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        if (totalTimeAll === 0) {
            this.dom.donutChart.style.background = '#374151';
            this.dom.legendContainer.innerHTML = '<div style="color:#9ca3af; padding:10px; text-align:center;">No data</div>';
            return;
        }

        sortedTags.forEach(tag => {
            const sec = dist[tag];
            const isHidden = this.hiddenTags.has(tag);
            const opacity = isHidden ? '0.5' : '1';
            const pctOfTotal = (sec / totalTimeAll) * 100;
            const color = this.tagsMap.get(tag) || this._generateColor(tag);
            const dotColor = isHidden ? '#6b7280' : color;

            if (!isHidden && visibleTotalTime > 0) {
                const pct = (sec / visibleTotalTime) * 100;
                const endPct = currentPct + pct;
                gradientParts.push(`${color} ${currentPct}% ${endPct}%`);
                currentPct = endPct;
            }

            legendHTML += `
                <div class="am-legend-item" data-tag="${tag}" style="opacity: ${opacity};">
                    <div class="am-legend-dot" style="background-color: ${dotColor};"></div>
                    <span class="am-legend-name">${tag}</span>
                    <span class="am-legend-val">${Math.round(pctOfTotal)}%</span>
                </div>
            `;
        });

        if (visibleTotalTime > 0) {
            this.dom.donutChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
            this.dom.donutChart.style.background = '#374151';
        }

        this.dom.legendContainer.innerHTML = legendHTML;

        // Bind clicks
        this.dom.legendContainer.querySelectorAll('.am-legend-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.toggleTag(tag);
            });
        });
    }

    _formatDuration(seconds) {
        if (seconds === 0) return "0m";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
}

    _generateColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }
}

export function initMonthAnalytics() {
    new MonthManager();
}