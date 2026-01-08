import { FocusAPI } from "../api/FocusAPI.js";

export class CustomAnalyticsManager {
    constructor() {
        this.currentSessions = [];
        this.tagsMap = new Map();
        this.hiddenTags = new Set();

        // Default Range: Last 30 Days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);

        this.range = {
            start: start,
            end: end
        };

        // Cache DOM
        this.dom = {
            inputStart: document.getElementById('custom-date-start'),
            inputEnd: document.getElementById('custom-date-end'),
            btnApply: document.getElementById('btn-apply-custom'),
            
            // KPIs
            kpiTime: document.getElementById('custom-kpi-time'),
            kpiAvg: document.getElementById('custom-kpi-avg'),
            kpiSessions: document.getElementById('custom-kpi-sessions'),
            kpiRatio: document.getElementById('custom-kpi-ratio'),
            kpiDays: document.getElementById('custom-kpi-days'),
            kpiConsistency: document.getElementById('custom-kpi-consistency'),

            // Charts
            trendBars: document.getElementById('custom-trend-bars'),
            yAxis: document.getElementById('custom-y-axis'),
            donutChart: document.getElementById('custom-donut-chart'),
            legend: document.getElementById('custom-legend')
        };

        // Helper: Local SQL String
        this.toSQL = (d) => {
            const offsetMs = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offsetMs).toISOString().replace('T', ' ').split('.')[0];
        };

        // Bind Handlers
        this.handleData = (e) => {
            if (document.getElementById('custom-kpi-time')) {
                this.currentSessions = e.detail || [];
                this.render();
            }
        };

        this.handleTags = (e) => {
            const tags = e.detail || [];
            tags.forEach(t => this.tagsMap.set(t.name, t.color));
            this.fetchData(); 
        };

        this.init();
    }

    init() {
        if (!this.dom.btnApply) return;

        this.dom.inputStart.value = this.range.start.toISOString().split('T')[0];
        this.dom.inputEnd.value = this.range.end.toISOString().split('T')[0];

        this.dom.btnApply.addEventListener('click', () => {
            const sVal = this.dom.inputStart.value;
            const eVal = this.dom.inputEnd.value;
            
            if (sVal && eVal) {
                this.range.start = new Date(sVal);
                this.range.end = new Date(eVal);
                this.range.end.setHours(23, 59, 59, 999);
                this.hiddenTags.clear();
                this.fetchData();
            }
        });

        Neutralino.events.off('receiveCustomData', this.handleData);
        Neutralino.events.on('receiveCustomData', this.handleData);

        Neutralino.events.off('receiveTags', this.handleTags);
        Neutralino.events.on('receiveTags', this.handleTags);

        FocusAPI.getTags();
    }

    fetchData() {
        const s = new Date(this.range.start);
        s.setHours(0,0,0,0);

        const e = new Date(this.range.end);
        e.setHours(23,59,59,999);

        FocusAPI.getFocusSessions(this.toSQL(s), this.toSQL(e), 'receiveCustomData');
    }

    _getDisplayTag(session) {
        if (session.tag === "Standard" || session.tag === "Flexible") return "No Tag";
        return session.tag || "No Tag";
    }

    toggleTag(tagName) {
        if (this.hiddenTags.has(tagName)) this.hiddenTags.delete(tagName);
        else this.hiddenTags.add(tagName);
        this.render();
    }

    render() {
        const filteredSessions = this.currentSessions.filter(s => {
            const tag = this._getDisplayTag(s);
            return !this.hiddenTags.has(tag);
        });

        this.renderStats(filteredSessions);
        this.renderTrend(filteredSessions);
        this.renderDonut(this.currentSessions); 
    }

    renderStats(sessions) {
        const totalSeconds = sessions.reduce((acc, s) => acc + s.focus_seconds, 0);
        const diffTime = Math.abs(this.range.end - this.range.start);
        const totalDaysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const activeDaysSet = new Set(sessions.map(s => s.created_at.split(' ')[0]));
        const activeDays = activeDaysSet.size;
        const dailyAvgSeconds = totalDaysInRange > 0 ? totalSeconds / totalDaysInRange : 0;
        const consistency = Math.round((activeDays / totalDaysInRange) * 100);

        this.dom.kpiTime.textContent = this._fmtTime(totalSeconds);
        this.dom.kpiAvg.textContent = `Avg ${this._fmtTime(dailyAvgSeconds, false)} / day`;
        this.dom.kpiSessions.textContent = sessions.length;
        this.dom.kpiRatio.textContent = (sessions.length / totalDaysInRange).toFixed(1) + " / day";
        this.dom.kpiDays.textContent = `${activeDays} / ${totalDaysInRange}`;
        this.dom.kpiConsistency.textContent = `${consistency}% consistency`;
    }

    renderTrend(sessions) {
        this.dom.trendBars.innerHTML = '';
        
        // 1. Bucket Data by Day AND Tag
        // Structure: { 'YYYY-MM-DD': { total: 0, breakdown: { 'TagA': 100, 'TagB': 200 } } }
        const dailyData = {}; 
        let maxVal = 0;

        sessions.forEach(s => {
            const dateStr = s.created_at.split(' ')[0];
            const tag = this._getDisplayTag(s);
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { total: 0, breakdown: {} };
            }
            
            dailyData[dateStr].total += s.focus_seconds;
            dailyData[dateStr].breakdown[tag] = (dailyData[dateStr].breakdown[tag] || 0) + s.focus_seconds;

            if (dailyData[dateStr].total > maxVal) maxVal = dailyData[dateStr].total;
        });

        if (maxVal === 0) maxVal = 3600; // Default scale if empty

        // Update Y-Axis
        if (this.dom.yAxis) {
            const maxH = Math.floor(maxVal / 3600);
            const midH = Math.floor(maxH / 2);
            this.dom.yAxis.innerHTML = `
                <span>${maxH > 0 ? maxH + 'h' : '60m'}</span>
                <span>${midH > 0 ? midH + 'h' : '30m'}</span>
                <span>0</span>
            `;
        }

        // 2. Iterate through Date Range
        const iterDate = new Date(this.range.start);
        iterDate.setHours(0,0,0,0);
        const endDate = new Date(this.range.end);
        endDate.setHours(0,0,0,0);

        while (iterDate <= endDate) {
            const year = iterDate.getFullYear();
            const month = String(iterDate.getMonth() + 1).padStart(2, '0');
            const day = String(iterDate.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            const dayEntry = dailyData[dateKey] || { total: 0, breakdown: {} };
            const totalSec = dayEntry.total;
            const pct = (totalSec / maxVal) * 100;
            const timeLabel = this._fmtTime(totalSec, false);

            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${Math.max(pct, 0.5)}%`;
            bar.style.width = '100%';
            bar.setAttribute('data-val', timeLabel);
            bar.title = `${dateKey}: ${timeLabel}`;

            if (totalSec > 0) {
                // Build Gradient Stack
                // Sort tags by duration so largest blocks are at the bottom
                const tags = Object.entries(dayEntry.breakdown).sort((a,b) => b[1] - a[1]);
                
                if (tags.length === 1) {
                    const tagName = tags[0][0];
                    const color = this.tagsMap.get(tagName) || this._genColor(tagName);
                    bar.style.background = color;
                } else {
                    let stops = [];
                    let currentStackPct = 0;
                    
                    tags.forEach(([tagName, duration]) => {
                        const color = this.tagsMap.get(tagName) || this._genColor(tagName);
                        const segPct = (duration / totalSec) * 100;
                        const endPct = currentStackPct + segPct;
                        
                        // "to top" gradient stack
                        stops.push(`${color} ${currentStackPct}% ${endPct}%`);
                        currentStackPct = endPct;
                    });
                    
                    bar.style.background = `linear-gradient(to top, ${stops.join(', ')})`;
                }
            } else {
                bar.style.background = 'rgba(255,255,255,0.05)';
            }

            this.dom.trendBars.appendChild(bar);
            iterDate.setDate(iterDate.getDate() + 1);
        }
    }

    renderDonut(allSessions) {
        const dist = {};
        let totalAll = 0;

        allSessions.forEach(s => {
            const tag = this._getDisplayTag(s);
            dist[tag] = (dist[tag] || 0) + s.focus_seconds;
            totalAll += s.focus_seconds;
        });

        let visibleTotal = 0;
        Object.keys(dist).forEach(t => {
            if (!this.hiddenTags.has(t)) visibleTotal += dist[t];
        });

        const sortedTags = Object.keys(dist).sort((a,b) => dist[b] - dist[a]);
        
        let gradientParts = [];
        let currentPct = 0;
        let legendHTML = '';

        if (totalAll === 0) {
            this.dom.donutChart.style.background = '#374151';
            this.dom.legend.innerHTML = '<div style="padding:10px; color:#888; text-align:center">No data in range</div>';
            return;
        }

        sortedTags.forEach(tag => {
            const sec = dist[tag];
            const isHidden = this.hiddenTags.has(tag);
            const opacity = isHidden ? '0.5' : '1';
            const color = this.tagsMap.get(tag) || this._genColor(tag);
            const dotColor = isHidden ? '#6b7280' : color;
            const textDec = isHidden ? 'line-through' : 'none';
            const pctOfTotal = (sec / totalAll) * 100;
            
            legendHTML += `
                <div class="analyze-custom-legend-item" data-tag="${tag}" style="cursor:pointer; opacity:${opacity}">
                    <div class="dot" style="background:${dotColor}"></div>
                    <span style="text-decoration:${textDec}">${tag}</span>
                    <span class="l-val">${Math.round(pctOfTotal)}%</span>
                </div>
            `;

            if (!isHidden && visibleTotal > 0) {
                const segPct = (sec / visibleTotal) * 100;
                const endPct = currentPct + segPct;
                gradientParts.push(`${color} ${currentPct}% ${endPct}%`);
                currentPct = endPct;
            }
        });

        this.dom.legend.innerHTML = legendHTML;
        
        if (visibleTotal > 0) {
            this.dom.donutChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        } else {
            this.dom.donutChart.style.background = '#374151';
        }

        this.dom.legend.querySelectorAll('.analyze-custom-legend-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.toggleTag(tag);
            });
        });
    }

    _fmtTime(sec, full=true) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (full) {
            if (h>0) return `${h}h ${m}m`;
            return `${m}m`;
        }
        if (h>0) return `${h}h`;
        return `${m}m`;
    }

    _genColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }
}

export function initCustomAnalytics() {
    new CustomAnalyticsManager();
}