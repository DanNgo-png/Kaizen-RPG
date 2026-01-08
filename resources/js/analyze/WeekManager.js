import { FocusAPI } from "../api/FocusAPI.js";

export class WeekManager {
    constructor() {
        this.currentDate = new Date();
        this.startOfWeek = this._getMonday(this.currentDate);
        this.endOfWeek = new Date(this.startOfWeek);
        this.endOfWeek.setDate(this.endOfWeek.getDate() + 6);

        this.tagsMap = new Map();
        
        // Filter State
        this.hiddenTags = new Set();
        this.currentSessions = []; 
        
        // Helper: Local SQL format YYYY-MM-DD HH:MM:SS
        this.toSQL = (d) => {
            const offsetMs = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offsetMs).toISOString().replace('T', ' ').split('.')[0];
        };

        this.dom = {
            rangeLabel: document.getElementById('week-header-range'),
            btnPrev: document.getElementById('week-btn-prev'),
            btnNext: document.getElementById('week-btn-next'),
            inputDate: document.getElementById('week-date-input'),
            valTime: document.getElementById('week-stat-total-time'),
            valCount: document.getElementById('week-stat-total-sessions'),
            donutChart: document.getElementById('week-donut-chart'),
            donutLegend: document.getElementById('week-legend-container'),
            barContainer: document.getElementById('week-bars-container')
        };

        this.handleData = (e) => {
            // Safety check: ensure we are on the page
            if (document.getElementById('week-header-range')) {
                this.currentSessions = e.detail || [];
                this.render(this.currentSessions);
            }
        };

        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            this.loadWeek(this.currentDate);
        };

        this.init();
    }

    init() {
        if (!this.dom.rangeLabel) return;

        this.dom.btnPrev.addEventListener('click', () => this.changeWeek(-7));
        this.dom.btnNext.addEventListener('click', () => this.changeWeek(7));
        
        this.dom.inputDate.addEventListener('change', (e) => {
            const parts = e.target.value.split('-'); 
            if (parts.length === 3) {
                this.currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
                this.loadWeek(this.currentDate);
            }
        });

        // CHANGED: Listen for specific week data to avoid pollution
        Neutralino.events.off('receiveWeekData', this.handleData);
        Neutralino.events.on('receiveWeekData', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        FocusAPI.getTags();
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
        this.render(this.currentSessions); 
    }

    changeWeek(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.hiddenTags.clear();
        this.loadWeek(this.currentDate);
    }

    loadWeek(date) {
        this.startOfWeek = this._getMonday(date);
        this.endOfWeek = new Date(this.startOfWeek);
        this.endOfWeek.setDate(this.endOfWeek.getDate() + 6);

        this.updateHeader();

        const start = new Date(this.startOfWeek);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(this.endOfWeek);
        end.setHours(23, 59, 59, 999);

        // CHANGED: Request with 'receiveWeekData' target event
        FocusAPI.getFocusSessions(this.toSQL(start), this.toSQL(end), 'receiveWeekData');
    }

    updateHeader() {
        const opt = { month: 'short', day: 'numeric' };
        const startStr = this.startOfWeek.toLocaleDateString('en-US', opt);
        const endStr = this.endOfWeek.toLocaleDateString('en-US', { ...opt, year: 'numeric' });
        
        this.dom.rangeLabel.textContent = `Week of ${startStr} - ${endStr}`;
        
        const offset = this.startOfWeek.getTimezoneOffset();
        const local = new Date(this.startOfWeek.getTime() - (offset * 60000));
        this.dom.inputDate.value = local.toISOString().split('T')[0];
    }

    render(sessions) {
        this.renderStats(sessions);
        this.renderDonut(sessions);
        this.renderBarChart(sessions);
    }

    renderStats(sessions) {
        const totalSeconds = sessions.reduce((sum, s) => sum + s.focus_seconds, 0);
        this.dom.valTime.textContent = this._formatDuration(totalSeconds);
        this.dom.valCount.textContent = sessions.length;
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
            if (!this.hiddenTags.has(tag)) {
                visibleTotalTime += dist[tag];
            }
        });

        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        if (totalTimeAll === 0) {
            this.dom.donutChart.style.background = '#374151';
            this.dom.donutLegend.innerHTML = '<div style="color:#9ca3af; padding:10px;">No data</div>';
            return;
        }

        sortedTags.forEach(tag => {
            const sec = dist[tag];
            const isHidden = this.hiddenTags.has(tag);
            const opacity = isHidden ? '0.5' : '1';
            const textDec = isHidden ? 'line-through' : 'none';
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
                <div class="week-legend-row" data-tag="${tag}" style="cursor: pointer; opacity: ${opacity};" title="Toggle visibility">
                    <div class="week-legend-dot" style="background-color: ${dotColor};"></div>
                    <span class="week-legend-name" style="text-decoration: ${textDec};">${tag}</span>
                    <span class="week-legend-time">${this._formatDuration(sec)}</span>
                    <span class="week-legend-perc">${Math.round(pctOfTotal)}%</span>
                </div>
            `;
        });

        if (visibleTotalTime > 0) {
            this.dom.donutChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
            this.dom.donutChart.style.background = '#374151';
        }
        
        this.dom.donutLegend.innerHTML = legendHTML;

        this.dom.donutLegend.querySelectorAll('.week-legend-row').forEach(el => {
            el.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.toggleTag(tag);
            });
        });
    }

    renderBarChart(sessions) {
        if (!this.dom.barContainer) return;
        this.dom.barContainer.innerHTML = '';

        // 1. Data Structure: Array of 7 days, each holding total + breakdown
        // breakdown = { "Coding": 3600, "Reading": 1800 }
        const dailyData = Array.from({ length: 7 }, () => ({ total: 0, breakdown: {} }));
        let maxFound = 0;
        
        sessions.forEach(s => {
            const displayTag = this._getDisplayTag(s);
            
            // Filter: Skip if tag is hidden
            if (this.hiddenTags.has(displayTag)) return;

            const d = new Date(s.created_at.replace(' ', 'T'));
            const diffTime = d.getTime() - this.startOfWeek.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
                const dur = s.focus_seconds;
                
                dailyData[diffDays].total += dur;
                
                if (!dailyData[diffDays].breakdown[displayTag]) {
                    dailyData[diffDays].breakdown[displayTag] = 0;
                }
                dailyData[diffDays].breakdown[displayTag] += dur;

                if (dailyData[diffDays].total > maxFound) {
                    maxFound = dailyData[diffDays].total;
                }
            }
        });

        const maxSeconds = Math.max(maxFound, 1); 
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        dailyData.forEach((dayInfo, index) => {
            const dayDate = new Date(this.startOfWeek);
            dayDate.setDate(dayDate.getDate() + index);
            const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const totalSec = dayInfo.total;
            const pctHeight = (totalSec / maxSeconds) * 100;
            const displayHeight = Math.max(pctHeight, 1); 
            const timeLabel = this._formatDuration(totalSec);

            // Calculate Background: Solid or Gradient Stack
            let backgroundStyle = '#374151'; // Default Grey
            
            if (totalSec > 0) {
                const entries = Object.entries(dayInfo.breakdown);
                // Sort breakdown so larger chunks are at the bottom (optional visual preference)
                entries.sort((a, b) => b[1] - a[1]);

                if (entries.length === 1) {
                    // Single tag -> Solid color
                    const tagName = entries[0][0];
                    backgroundStyle = this.tagsMap.get(tagName) || this._generateColor(tagName);
                } else {
                    // Multiple tags -> Linear Gradient Stack
                    let stops = [];
                    let currentPct = 0;
                    
                    entries.forEach(([tagName, duration]) => {
                        const color = this.tagsMap.get(tagName) || this._generateColor(tagName);
                        const segmentPct = (duration / totalSec) * 100;
                        const endPct = currentPct + segmentPct;
                        
                        stops.push(`${color} ${currentPct}% ${endPct}%`);
                        currentPct = endPct;
                    });
                    
                    backgroundStyle = `linear-gradient(to top, ${stops.join(', ')})`;
                }
            }

            const group = document.createElement('div');
            group.className = 'week-bar-group';
            // Use 'background' to support gradients, override previous background-color behavior
            group.innerHTML = `
                <div class="week-bar" style="height: ${displayHeight}%; background: ${backgroundStyle};" title="${timeLabel}">
                    ${totalSec > 0 ? `<span class="week-bar-value">${timeLabel}</span>` : ''}
                </div>
                <div class="week-x-label">
                    <span class="day-name">${dayNames[index]}</span>
                    <span class="day-date">${dateStr}</span>
                </div>
            `;
            this.dom.barContainer.appendChild(group);
        });
    }

    _getMonday(d) {
        const date = new Date(d);
        const day = date.getDay(); 
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0,0,0,0);
        return monday;
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

export function initWeekAnalytics() {
    new WeekManager();
}