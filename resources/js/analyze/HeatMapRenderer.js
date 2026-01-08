export class HeatMapRenderer {
    /**
     * @param {string} containerId 
     * @param {string} tooltipId 
     * @param {Function} [onCellClick] - Callback (dateString) => void
     */
    constructor(containerId, tooltipId, onCellClick) {
        this.container = document.getElementById(containerId);
        this.tooltip = document.getElementById(tooltipId);
        this.onCellClick = onCellClick; // Store callback
        this.tagsMap = new Map();

        // FIX: Move tooltip to body to ensure positioning works correctly relative to document
        if (this.tooltip && this.tooltip.parentNode !== document.body) {
            document.body.appendChild(this.tooltip);
        }
    }

    setTagsMap(tagsArray) {
        tagsArray.forEach(t => this.tagsMap.set(t.name, t.color));
    }

    render(year, sessions) {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.container.className = 'heatmap-container';

        // 1. Process Data
        const dataMap = new Map();
        sessions.forEach(s => {
            const dateStr = s.created_at.split(' ')[0]; // YYYY-MM-DD
            if (!dataMap.has(dateStr)) {
                dataMap.set(dateStr, { totalSeconds: 0, count: 0, breakdown: {} });
            }
            const entry = dataMap.get(dateStr);
            entry.totalSeconds += s.focus_seconds;
            entry.count++;
            
            // Aggregate time by tag
            const tag = s.tag || "No Tag";
            entry.breakdown[tag] = (entry.breakdown[tag] || 0) + s.focus_seconds;
        });

        // 2. Render 12 Month Blocks
        for (let m = 0; m < 12; m++) {
            this._renderMonth(year, m, dataMap);
        }
    }

    _renderMonth(year, monthIndex, dataMap) {
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); 
        const monthName = firstDay.toLocaleString('default', { month: 'short' });

        const block = document.createElement('div');
        block.className = 'month-block';

        const grid = document.createElement('div');
        grid.className = 'month-grid';

        let monthTotalSeconds = 0;

        // Padding Cells (Empty days before 1st of month)
        for(let i=0; i<startDayOfWeek; i++) {
            const empty = document.createElement('div');
            empty.className = 'heat-cell empty';
            grid.appendChild(empty);
        }

        // Render Days
        for(let d=1; d<=daysInMonth; d++) {
            const dateObj = new Date(year, monthIndex, d);
            const offset = dateObj.getTimezoneOffset() * 60000;
            // Key format: YYYY-MM-DD
            const localKey = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];

            const data = dataMap.get(localKey);
            const seconds = data ? data.totalSeconds : 0;
            monthTotalSeconds += seconds;

            const el = document.createElement('div');
            el.className = 'heat-cell';

            // Determine Intensity Level
            const mins = Math.floor(seconds / 60);
            if (mins === 0) el.classList.add('l0');
            else if (mins < 30) el.classList.add('l1');
            else if (mins < 120) el.classList.add('l2');
            else if (mins < 240) el.classList.add('l3');
            else el.classList.add('l4');

            // Store Data for Tooltip
            const fullDateStr = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            el.dataset.date = fullDateStr;
            el.dataset.seconds = seconds; 
            el.dataset.count = data ? data.count : 0;
            if(data && data.breakdown) {
                el.dataset.breakdown = JSON.stringify(data.breakdown);
            }

            // Bind Events
            el.addEventListener('mouseenter', (e) => this._showTooltip(e, el));
            el.addEventListener('mouseleave', () => this._hideTooltip());

            // Click Interaction
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this._hideTooltip();
                if (this.onCellClick) {
                    this.onCellClick(localKey); // Pass "YYYY-MM-DD"
                }
            });

            grid.appendChild(el);
        }

        // Month Label Footer
        const meta = document.createElement('div');
        meta.className = 'month-meta';
        const hours = Math.floor(monthTotalSeconds / 3600);
        meta.innerHTML = `
            <span class="month-name">${monthName}</span>
            <span class="month-total">${hours}h</span>
        `;

        block.appendChild(grid);
        block.appendChild(meta);
        this.container.appendChild(block);
    }

    _showTooltip(e, element) {
        if (!this.tooltip) return;

        const dateStr = element.dataset.date;
        const totalSeconds = parseInt(element.dataset.seconds) || 0;
        const count = parseInt(element.dataset.count) || 0;
        
        // 1. Format Time: "4h 30m" (or 0h 0m)
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const timeStr = `${h}h ${m}m`;

        // 2. Format Count: Singular/Plural
        const sessionStr = `${count} ${count === 1 ? 'session' : 'sessions'}`;

        // 3. Process Tag Breakdown
        let breakdown = {};
        try {
            breakdown = element.dataset.breakdown ? JSON.parse(element.dataset.breakdown) : {};
        } catch(e) { console.error("JSON Parse Error", e); }

        let tagsHtml = '';
        
        // Sort tags by duration (highest first)
        const entries = Object.entries(breakdown).sort((a,b) => b[1] - a[1]);

        if (entries.length > 0 && totalSeconds > 0) {
            tagsHtml += '<div class="ht-tags">'; // Start container
            
            entries.forEach(([tagName, seconds]) => {
                const color = this.tagsMap.get(tagName) || '#9ca3af';
                
                // Tag Time
                const tH = Math.floor(seconds / 3600);
                const tM = Math.floor((seconds % 3600) / 60);
                const durStr = tH > 0 ? `${tH}h ${tM}m` : `${tM}m`;
                
                // Tag Percentage
                const pct = Math.round((seconds / totalSeconds) * 100);

                tagsHtml += `
                    <div class="ht-tag-row">
                        <div class="ht-row-left">
                            <span class="ht-tag-dot" style="background:${color}"></span> 
                            <span class="ht-tag-name">${tagName}</span>
                        </div>
                        <div class="ht-row-right">
                            <span class="ht-val-time">${durStr}</span>
                            <span class="ht-val-pct">${pct}%</span>
                        </div>
                    </div>
                `;
            });
            
            tagsHtml += '</div>'; // End container
        }

        // 4. Construct Final HTML
        this.tooltip.innerHTML = `
            <div class="ht-header">
                <span class="ht-date">${dateStr}</span>
            </div>
            <div class="ht-summary">
                <span class="ht-total-time">${timeStr}</span>
                <span class="ht-session-count">${sessionStr}</span>
            </div>
            ${tagsHtml}
        `;

        this.tooltip.classList.remove('hidden');
        this._positionTooltip(element);
    }

    _positionTooltip(targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        // FIX: Account for Scroll Position since tooltip is now in Body
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Position above the cell
        let top = rect.top + scrollTop - tooltipRect.height - 10;
        let left = rect.left + scrollLeft + (rect.width / 2) - (tooltipRect.width / 2);

        // Boundary Checks (Viewport relative checks using rect)
        const viewportWidth = window.innerWidth;
        
        // If going off left edge
        if (rect.left + (rect.width/2) - (tooltipRect.width/2) < 10) {
            left = 10 + scrollLeft;
        }
        
        // If going off right edge
        if (rect.left + (rect.width/2) + (tooltipRect.width/2) > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10 + scrollLeft;
        }
        
        // If going off top edge (flip to bottom)
        if (rect.top - tooltipRect.height - 10 < 10) {
            top = rect.bottom + scrollTop + 10;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    _hideTooltip() {
        if(this.tooltip) this.tooltip.classList.add('hidden');
    }
}