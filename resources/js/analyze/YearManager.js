import { FocusAPI } from "../api/FocusAPI.js";
import { SettingsAPI } from "../api/SettingsAPI.js";
import { HeatMapRenderer } from "./HeatMapRenderer.js";
import { loadPage } from "../router.js";
import { initReviewSessions } from "../focus/review/ReviewManager.js";
import { initDayAnalytics } from "./DayManager.js";

export class YearManager {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.tagsMap = new Map(); // Store colors
        this.clickAction = 'review'; // Default
        this.pendingDate = null; // Date clicked

        // Helper: RGB Color Generator
        this._genColor = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + "00000".substring(0, 6 - c.length) + c;
        };

        this.dom = {
            yearDisplay: document.getElementById('year-display'),
            btnPrev: document.getElementById('year-btn-prev'),
            btnNext: document.getElementById('year-btn-next'),
            
            // KPIs
            time: document.getElementById('y-stat-time'),
            sessions: document.getElementById('y-stat-sessions'),
            days: document.getElementById('y-stat-days'),
            avg: document.getElementById('y-stat-avg'),
            bestDay: document.getElementById('y-stat-best-day'),
            bestWeek: document.getElementById('y-stat-best-week'),
            bestMonth: document.getElementById('y-stat-best-month'),
            streak: document.getElementById('y-stat-streak'),

            // Chart
            donut: document.getElementById('year-donut-chart'),
            legend: document.getElementById('year-legend-container'),

            // Modal
            modal: document.getElementById('year-nav-modal'),
            btnReview: document.getElementById('btn-nav-review'),
            btnAnalyze: document.getElementById('btn-nav-analyze'),
            btnCancel: document.getElementById('btn-nav-cancel')
        };

        // Initialize HeatMap with Click Callback
        this.heatMap = new HeatMapRenderer('heatmap-grid', 'heatmap-tooltip', (dateStr) => this.handleCellClick(dateStr));

        // Bind Data Handler
        this.handleData = (e) => this.processData(e.detail || []);
        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            this.heatMap.setTagsMap(tags);
            this.loadData(); // Reload visualization once tags are known
        };

        this.init();
    }

    init() {
        if (!this.dom.yearDisplay) return;

        this.dom.btnPrev.addEventListener('click', () => this.changeYear(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeYear(1));

        // --- Settings Logic ---
        SettingsAPI.getSetting('heatmapClickAction');
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'heatmapClickAction') {
                this.clickAction = e.detail.value || 'review';
            }
        });

        // --- Data Events ---
        Neutralino.events.off('receiveYearlyData', this.handleData);
        Neutralino.events.on('receiveYearlyData', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        FocusAPI.getTags(); // Fetch tags first, which triggers loadData

        // --- Modal Events ---
        if (this.dom.modal) {
            this.dom.btnCancel.onclick = () => this.dom.modal.classList.add('hidden');
            
            this.dom.btnReview.onclick = async () => {
                this.dom.modal.classList.add('hidden');
                await this.navigate('review', this.pendingDate);
            };

            this.dom.btnAnalyze.onclick = async () => {
                this.dom.modal.classList.add('hidden');
                await this.navigate('analyze_day', this.pendingDate);
            };
        }
    }

    handleCellClick(dateStr) {
        if (this.clickAction === 'none') return;

        this.pendingDate = dateStr;

        if (this.clickAction === 'ask') {
            if (this.dom.modal) this.dom.modal.classList.remove('hidden');
        } else {
            this.navigate(this.clickAction, dateStr);
        }
    }

    async navigate(action, dateStr) {
        // Set LocalStorage for target page to pick up
        localStorage.setItem('kaizen_jump_date', dateStr);

        if (action === 'review') {
            await loadPage('./pages/focus/review-sessions.html');
            initReviewSessions();
        } else if (action === 'analyze_day') {
            await loadPage('./pages/analyze/day.html');
            initDayAnalytics();
        }
    }

    changeYear(delta) {
        this.currentYear += delta;
        this.loadData();
    }

    loadData() {
        this.dom.yearDisplay.textContent = this.currentYear;

        const start = `${this.currentYear}-01-01 00:00:00`;
        const end = `${this.currentYear}-12-31 23:59:59`;

        FocusAPI.getFocusSessions(start, end, 'receiveYearlyData');
    }

    processData(sessions) {
        // --- 1. Aggregation ---
        let totalSec = 0;
        const daysSet = new Set();
        
        const dayBuckets = {};   // YYYY-MM-DD -> totalSec
        const weekBuckets = {};  // WeekNum -> totalSec
        const monthBuckets = {}; // MonthNum -> totalSec
        const tagBuckets = {};   // TagName -> totalSec

        sessions.forEach(s => {
            totalSec += s.focus_seconds;
            const dateStr = s.created_at.split(' ')[0]; // YYYY-MM-DD
            const d = new Date(s.created_at.replace(' ','T'));
            
            daysSet.add(dateStr);

            // Day Bucket
            dayBuckets[dateStr] = (dayBuckets[dateStr] || 0) + s.focus_seconds;

            // Month Bucket
            const m = d.getMonth();
            monthBuckets[m] = (monthBuckets[m] || 0) + s.focus_seconds;

            // Week Bucket (Simplified)
            const oneJan = new Date(d.getFullYear(), 0, 1);
            const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
            const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
            weekBuckets[weekNum] = (weekBuckets[weekNum] || 0) + s.focus_seconds;

            // Tag Bucket
            const tag = s.tag || "No Tag";
            tagBuckets[tag] = (tagBuckets[tag] || 0) + s.focus_seconds;
        });

        // --- 2. Calculate Stats ---
        const totalDays = daysSet.size;
        const avgSec = totalDays > 0 ? totalSec / totalDays : 0;

        // Best Day
        let maxDayVal = 0;
        Object.values(dayBuckets).forEach(v => { if(v > maxDayVal) maxDayVal = v; });

        // Best Week
        let maxWeekVal = 0;
        Object.values(weekBuckets).forEach(v => { if(v > maxWeekVal) maxWeekVal = v; });

        // Best Month
        let maxMonthVal = 0;
        Object.values(monthBuckets).forEach(v => { if(v > maxMonthVal) maxMonthVal = v; });

        // Best Streak (Consecutive days in daysSet)
        const sortedDays = Array.from(daysSet).sort();
        let bestStreak = 0;
        let currentStreak = 0;
        let prevTime = 0;

        sortedDays.forEach(dateStr => {
            const time = new Date(dateStr).getTime();
            if (prevTime === 0) {
                currentStreak = 1;
            } else {
                const diffDays = (time - prevTime) / (1000 * 3600 * 24);
                if (Math.round(diffDays) === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            }
            if (currentStreak > bestStreak) bestStreak = currentStreak;
            prevTime = time;
        });

        // --- 3. Render Text Stats ---
        this.dom.time.textContent = this._fmtTime(totalSec);
        this.dom.sessions.textContent = sessions.length;
        this.dom.days.textContent = totalDays;
        this.dom.avg.textContent = this._fmtTime(avgSec, false); // "30m"
        this.dom.bestDay.textContent = this._fmtTime(maxDayVal, false);
        this.dom.bestWeek.textContent = this._fmtTime(maxWeekVal);
        this.dom.bestMonth.textContent = this._fmtTime(maxMonthVal);
        this.dom.streak.textContent = `${bestStreak} days`;

        // --- 4. Render Donut Chart ---
        this._renderDonut(tagBuckets, totalSec);

        // --- 5. Render Heatmap ---
        this.heatMap.render(this.currentYear, sessions);
    }

    _renderDonut(tagBuckets, totalSec) {
        if (!this.dom.donut) return;
        
        if (totalSec === 0) {
            this.dom.donut.style.background = '#374151';
            this.dom.legend.innerHTML = '<div style="text-align:center; color:#888; padding:10px;">No data</div>';
            return;
        }

        const sorted = Object.entries(tagBuckets).sort((a,b) => b[1] - a[1]);
        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        sorted.forEach(([tag, sec]) => {
            const pct = (sec / totalSec) * 100;
            const endPct = currentPct + pct;
            const color = this.tagsMap.get(tag) || this._genColor(tag);
            
            gradientParts.push(`${color} ${currentPct}% ${endPct}%`);
            currentPct = endPct;

            // Only show top 5 in legend to save space
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-dot" style="background:${color}"></div>
                    <span class="legend-name">${tag}</span>
                    <span class="legend-val">${this._fmtTime(sec, false)}</span>
                    <span class="legend-perc">${Math.round(pct)}%</span>
                </div>
            `;
        });

        this.dom.donut.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        this.dom.legend.innerHTML = legendHTML;
    }

    _fmtTime(sec, full = true) {
        if(sec === 0) return full ? "0h 0m" : "0m";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }
}

export function initYearAnalytics() {
    new YearManager();
}