import { FocusAPI } from "../api/FocusAPI.js";

export class DayManager {
    constructor() {
        this.currentDate = new Date();
        this.tagsMap = new Map(); 
        
        // Filter State
        this.hiddenTags = new Set();
        this.currentSessions = []; 

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
            // Safety check: ensure we are on the page
            if (document.getElementById('day-header-date')) {
                this.currentSessions = e.detail || [];
                this.render(this.currentSessions);
            }
        };

        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            this.loadDate(this.currentDate);
        };

        this.init();
    }

    _getDisplayTag(session) {
        if (session.tag === "Standard" || session.tag === "Flexible") {
            return "No Tag";
        }
        return session.tag || "No Tag";
    }

    toggleTag(tagName) {
        if (this.hiddenTags.has(tagName)) {
            this.hiddenTags.delete(tagName);
        } else {
            this.hiddenTags.add(tagName);
        }
        // Re-render using cached data
        this.render(this.currentSessions); 
    }

    init() {
        if (!this.dom.headerDate) return;

        this.dom.btnPrev.addEventListener('click', () => this.changeDate(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeDate(1));
        
        this.dom.inputDate.addEventListener('change', (e) => {
            const parts = e.target.value.split('-'); 
            if (parts.length === 3) {
                this.currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
                this.loadDate(this.currentDate);
            }
        });

        // CHANGED: Listen for specific day data to avoid pollution
        Neutralino.events.off('receiveDayData', this.handleData);
        Neutralino.events.on('receiveDayData', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        FocusAPI.getTags(); 
        this.loadDate(this.currentDate);
    }

    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        // Reset filters when changing days
        this.hiddenTags.clear();
        this.loadDate(this.currentDate);
    }

    loadDate(date) {
        this.updateHeader(date);

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // CHANGED: Request with 'receiveDayData' target event
        FocusAPI.getFocusSessions(this.toSQL(start), this.toSQL(end), 'receiveDayData');
    }

    updateHeader(date) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        this.dom.headerDate.textContent = date.toLocaleDateString('en-US', options);
        
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
        // Stats continue to show TOTALS (ignoring filters) for accuracy
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

        // 1. Aggregate Data (using Display Tags)
        const distribution = {};
        let totalTimeAll = 0;

        sessions.forEach(s => {
            const tag = this._getDisplayTag(s);
            if (!distribution[tag]) distribution[tag] = 0;
            distribution[tag] += s.focus_seconds;
            totalTimeAll += s.focus_seconds;
        });

        const sortedTags = Object.keys(distribution).sort((a, b) => distribution[b] - distribution[a]);

        // 2. Calculate VISIBLE time for the Chart Gradient
        let visibleTotalTime = 0;
        sortedTags.forEach(tag => {
            if (!this.hiddenTags.has(tag)) {
                visibleTotalTime += distribution[tag];
            }
        });

        // 3. Build Visuals
        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        if (totalTimeAll === 0) {
            this.dom.chartCircle.style.background = '#374151'; 
            this.dom.legendContainer.innerHTML = '<div style="color:#9ca3af; text-align:center; padding:10px;">No data recorded</div>';
            return;
        }

        sortedTags.forEach(tag => {
            const seconds = distribution[tag];
            const isHidden = this.hiddenTags.has(tag);
            
            // Generate Legend Item
            const color = this.tagsMap.get(tag) || this._generateColor(tag);
            
            // Visual styles for hidden state
            const opacity = isHidden ? '0.5' : '1';
            const textDec = isHidden ? 'line-through' : 'none';
            const dotColor = isHidden ? '#6b7280' : color; 

            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
            
            // Legend % is based on TOTAL time (to keep context), not just visible
            const pctOfTotal = (seconds / totalTimeAll) * 100;

            legendHTML += `
                <div class="day-legend-row" data-tag="${tag}" style="cursor: pointer; opacity: ${opacity};" title="Toggle visibility">
                    <div class="day-legend-dot" style="background-color: ${dotColor};"></div>
                    <span class="day-legend-name" style="text-decoration: ${textDec};">${tag}</span>
                    <span class="day-legend-time">${durStr}</span>
                    <span class="day-legend-perc">${Math.round(pctOfTotal)}%</span>
                </div>
            `;

            // Add to Chart Gradient ONLY if visible
            if (!isHidden && visibleTotalTime > 0) {
                const pct = (seconds / visibleTotalTime) * 100;
                const endPct = currentPct + pct;
                gradientParts.push(`${color} ${currentPct}% ${endPct}%`);
                currentPct = endPct;
            }
        });

        // Apply
        this.dom.legendContainer.innerHTML = legendHTML;
        
        if (visibleTotalTime > 0) {
            this.dom.chartCircle.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
            this.dom.chartCircle.style.background = '#374151'; // All hidden or empty
        }

        // Add Click Listeners to Legend
        this.dom.legendContainer.querySelectorAll('.day-legend-row').forEach(el => {
            el.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.toggleTag(tag);
            });
        });
    }

    renderTimeline(sessions) {
        if (!this.dom.timelineContainer) return;

        // Clear old blocks
        const oldBlocks = this.dom.timelineContainer.querySelectorAll('.day-session-block');
        oldBlocks.forEach(el => el.remove());

        const MINUTES_IN_DAY = 1440; 

        sessions.forEach(s => {
            const displayTag = this._getDisplayTag(s);

            // Filter Logic
            if (this.hiddenTags.has(displayTag)) return; 

            // Parse End Time (created_at is when session finished)
            const dateStr = s.created_at.replace(' ', 'T'); 
            const endDateObj = new Date(dateStr);
            
            // Calculate Start Time: EndTime - Duration
            const durationSeconds = s.focus_seconds || 0;
            const startDateObj = new Date(endDateObj.getTime() - (durationSeconds * 1000));
            
            const startHour = startDateObj.getHours();
            const startMin = startDateObj.getMinutes();
            const startTotalMins = (startHour * 60) + startMin;

            const durationMins = Math.ceil(durationSeconds / 60);
            
            const leftPct = (startTotalMins / MINUTES_IN_DAY) * 100;
            const widthPct = (durationMins / MINUTES_IN_DAY) * 100;
            // Ensure tiny sessions are at least visible (0.5% width)
            const finalWidth = Math.max(widthPct, 0.5);

            // Create Element
            const block = document.createElement('div');
            block.className = 'day-session-block';
            block.style.left = `${leftPct}%`;
            block.style.width = `${finalWidth}%`;
            
            const color = this.tagsMap.get(displayTag) || '#2563eb';
            block.style.backgroundColor = color;
            block.style.boxShadow = `0 0 0 1px ${color}`;

            // Tooltip
            const timeLabel = startDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            block.title = `${displayTag}: ${timeLabel} (${durationMins}m)`;

            this.dom.timelineContainer.appendChild(block);
        });
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

export function initDayAnalytics() {
    new DayManager();
}