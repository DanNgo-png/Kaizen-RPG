import { FocusAPI } from "../api/FocusAPI.js";

export class DayManager {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        this.tagsMap = new Map(); // Store tag colors: { "Coding": "#blue" }

        // Helper: Convert to Local SQL format YYYY-MM-DD HH:MM:SS
        this.toSQL = (d) => {
            const offsetMs = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offsetMs).toISOString().replace('T', ' ').split('.')[0];
        };

        this.dom = {
            headerDate: document.getElementById('day-header-date'),
            btnPrev: document.getElementById('day-btn-prev'),
            btnNext: document.getElementById('day-btn-next'),
            inputDate: document.getElementById('day-date-input'),
            
            // Stats
            valTime: document.getElementById('day-stat-total-time'),
            valCount: document.getElementById('day-stat-total-sessions'),
            
            // Chart
            chartCircle: document.getElementById('day-donut-chart'),
            legendContainer: document.getElementById('day-legend-container'),
            
            // Timeline
            timelineContainer: document.getElementById('day-timeline-tracks')
        };

        // Bind listener for data
        this.handleData = (e) => {
            // Only process if the Day page is actually active
            if (document.getElementById('day-header-date')) {
                this.render(e.detail || []);
            }
        };

        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            // Reload current view to apply colors if data arrived late
            this.loadDate(this.currentDate);
        };

        this.init();
    }

    init() {
        if (!this.dom.headerDate) return;

        // 1. Event Listeners
        this.dom.btnPrev.addEventListener('click', () => this.changeDate(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeDate(1));
        
        this.dom.inputDate.addEventListener('change', (e) => {
            const parts = e.target.value.split('-'); // YYYY-MM-DD
            if (parts.length === 3) {
                // Create date in local time
                this.currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
                this.loadDate(this.currentDate);
            }
        });

        // 2. Bind Data Events
        // Use a unique named function or check specific event dispatching if shared
        // For simplicity, we reuse the generic receiveFocusSessions but guard via DOM check
        Neutralino.events.off('receiveFocusSessions', this.handleData);
        Neutralino.events.on('receiveFocusSessions', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        // 3. Initial Load
        FocusAPI.getTags(); // Fetch colors
        this.loadDate(this.currentDate);
    }

    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        this.loadDate(this.currentDate);
    }

    loadDate(date) {
        this.updateHeader(date);

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        FocusAPI.getFocusSessions(this.toSQL(start), this.toSQL(end));
    }

    updateHeader(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        this.dom.headerDate.textContent = date.toLocaleDateString('en-US', options);
        
        // Update input value (YYYY-MM-DD)
        // Adjust for timezone offset to ensure the input shows the correct local day
        const offset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - (offset*60*1000));
        this.dom.inputDate.value = local.toISOString().split('T')[0];
    }

    render(sessions) {
        this.renderStats(sessions);
        this.renderChart(sessions);
        this.renderTimeline(sessions);
    }

    renderStats(sessions) {
        const totalSeconds = sessions.reduce((sum, s) => sum + s.focus_seconds, 0);
        const count = sessions.length;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        
        let timeStr = `${m}m`;
        if (h > 0) timeStr = `${h}h ${m}m`;

        this.dom.valTime.textContent = timeStr;
        this.dom.valCount.textContent = count;
    }

    renderChart(sessions) {
        if (!this.dom.chartCircle) return;

        // 1. Aggregate Data
        const distribution = {};
        let totalTime = 0;

        sessions.forEach(s => {
            if (!distribution[s.tag]) distribution[s.tag] = 0;
            distribution[s.tag] += s.focus_seconds;
            totalTime += s.focus_seconds;
        });

        // 2. Sort by time descending
        const sortedTags = Object.keys(distribution).sort((a, b) => distribution[b] - distribution[a]);

        // 3. Build Conic Gradient & Legend
        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        if (totalTime === 0) {
            this.dom.chartCircle.style.background = '#374151'; // Gray empty state
            this.dom.legendContainer.innerHTML = '<div style="color:#9ca3af; text-align:center; padding:10px;">No data recorded</div>';
            return;
        }

        sortedTags.forEach(tag => {
            const seconds = distribution[tag];
            const pct = (seconds / totalTime) * 100;
            const endPct = currentPct + pct;
            
            // Get Color
            const color = this.tagsMap.get(tag) || this._generateColor(tag);

            // Add to gradient: "color start% end%"
            gradientParts.push(`${color} ${currentPct}% ${endPct}%`);
            
            // Add to legend
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            legendHTML += `
                <div class="day-legend-row">
                    <div class="day-legend-dot" style="background-color: ${color};"></div>
                    <span class="day-legend-name">${tag}</span>
                    <span class="day-legend-time">${durStr}</span>
                    <span class="day-legend-perc">${Math.round(pct)}%</span>
                </div>
            `;

            currentPct = endPct;
        });

        // Apply CSS
        this.dom.chartCircle.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        this.dom.legendContainer.innerHTML = legendHTML;
    }

    renderTimeline(sessions) {
        if (!this.dom.timelineContainer) return;

        // Remove old blocks (keep axis and ticks)
        const oldBlocks = this.dom.timelineContainer.querySelectorAll('.day-session-block');
        oldBlocks.forEach(el => el.remove());

        // Constants
        const MINUTES_IN_DAY = 1440; // 24 * 60

        sessions.forEach(s => {
            // Parse Start Time
            // Format: "YYYY-MM-DD HH:MM:SS"
            // We assume sessions belong to the currently viewed day (API ensures this)
            const dateStr = s.created_at.replace(' ', 'T'); // ISO compliant
            const dateObj = new Date(dateStr);
            
            const startHour = dateObj.getHours();
            const startMin = dateObj.getMinutes();
            const startTotalMins = (startHour * 60) + startMin;

            // Calculate Dimensions
            const durationMins = Math.ceil(s.focus_seconds / 60);
            
            const leftPct = (startTotalMins / MINUTES_IN_DAY) * 100;
            const widthPct = (durationMins / MINUTES_IN_DAY) * 100;

            // Clamp width (min 0.5% so it's visible)
            const finalWidth = Math.max(widthPct, 0.5);

            // Create Element
            const block = document.createElement('div');
            block.className = 'day-session-block';
            block.style.left = `${leftPct}%`;
            block.style.width = `${finalWidth}%`;
            
            // Color based on tag
            const color = this.tagsMap.get(s.tag) || '#2563eb';
            block.style.backgroundColor = color;
            block.style.boxShadow = `0 0 0 1px ${color}`; // Border effect

            // Tooltip
            const timeLabel = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            block.title = `${s.tag}: ${timeLabel} (${durationMins}m)`;

            this.dom.timelineContainer.appendChild(block);
        });
    }

    _generateColor(str) {
        // Fallback hash color generator for unknown tags
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }
}

// Export initialization function
export function initDayAnalytics() {
    new DayManager();
}