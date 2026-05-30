import {
    BAREBONES_UI,
    CHRONICLE_EVENT_META
} from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

const DAYS_PER_PAGE = 15;

export class WorldLogOverlay {
    constructor({ documentRef = document, onRequestHistory } = {}) {
        this.documentRef = documentRef;
        this.onRequestHistory = onRequestHistory;
        
        this.history = [];
        this.filteredHistory = [];
        this.visibleDaysCount = DAYS_PER_PAGE;
        this.collapsedDays = new Set();
        this.activeFilter = "all";
        this.searchQuery = "";

        this.root = this._createOverlay();
        this.listEl = this.root.querySelector("#world-log-list");
        this.searchEl = this.root.querySelector("#world-log-search");
        
        this._bindUIEvents();
    }

    show() {
        this.root.classList.remove("hidden");
        this.listEl.innerHTML = loadingStateHtml("Unrolling the world scrolls...");
        
        // Reset state
        this.visibleDaysCount = DAYS_PER_PAGE;
        this.collapsedDays.clear();
        this.shouldAutoCollapse = true;
        this.activeFilter = "all";
        this.searchQuery = "";
        if (this.searchEl) this.searchEl.value = "";
        
        this._updateFilterTabActive();
        
        // Trigger data request
        this.onRequestHistory?.();
    }

    renderHistory(history = []) {
        this.history = history;
        
        // Auto-collapse older days on first loading history
        if (this.shouldAutoCollapse) {
            this.shouldAutoCollapse = false;
            
            // Get unique days in history
            const uniqueDays = Array.from(new Set(history.map((log) => Number(log.day) || 1))).sort((a, b) => b - a);
            
            this.collapsedDays.clear();
            // Collapse all days except the most recent (first) one
            for (let i = 1; i < uniqueDays.length; i++) {
                this.collapsedDays.add(uniqueDays[i]);
            }
        }
        
        this.applyFilterAndRender();
    }

    applyFilterAndRender() {
        // Apply filters
        this.filteredHistory = this.history.filter((log) => {
            // Category filter
            if (this.activeFilter !== "all" && log.event_type !== this.activeFilter) {
                return false;
            }
            
            // Search text filter
            if (this.searchQuery) {
                const text = String(log.event_text || "").toLowerCase();
                const nodeName = String(log.node_name || "").toLowerCase();
                const query = this.searchQuery.toLowerCase();
                return text.includes(query) || nodeName.includes(query);
            }
            
            return true;
        });

        this.renderList();
    }

    renderList() {
        this.listEl.innerHTML = "";

        if (!this.filteredHistory.length) {
            this.listEl.innerHTML = emptyStateHtml("No records found in the chronicles for this search or filter.");
            // Render empty stats dashboard anyway
            const statsContainer = this.root.querySelector("#world-log-stats");
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="bb-log-stat-card">
                        <div class="bb-log-stat-icon days"><i class="fa-solid fa-calendar-days"></i></div>
                        <div class="bb-log-stat-details">
                            <span class="bb-log-stat-value">0</span>
                            <span class="bb-log-stat-label">Days Logged</span>
                        </div>
                    </div>
                    <div class="bb-log-stat-card">
                        <div class="bb-log-stat-icon events"><i class="fa-solid fa-bolt"></i></div>
                        <div class="bb-log-stat-details">
                            <span class="bb-log-stat-value">0</span>
                            <span class="bb-log-stat-label">Total Events</span>
                        </div>
                    </div>
                    <div class="bb-log-stat-card">
                        <div class="bb-log-stat-icon deeds"><i class="fa-solid fa-user-shield"></i></div>
                        <div class="bb-log-stat-details">
                            <span class="bb-log-stat-value">0 <span style="font-size:0.75rem; font-weight:600; color:#64748b;">/ 0</span></span>
                            <span class="bb-log-stat-label">Deeds / World</span>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Group logs by Day
        const logsByDay = {};
        this.filteredHistory.forEach((log) => {
            const day = Number(log.day) || 1;
            if (!logsByDay[day]) logsByDay[day] = [];
            logsByDay[day].push(log);
        });

        // Get sorted list of unique days in descending order
        const uniqueDays = Object.keys(logsByDay)
            .map(Number)
            .sort((a, b) => b - a);

        // Dynamic Top Stats Dashboard Calculation and Injection
        const totalDays = uniqueDays.length;
        const totalEvents = this.filteredHistory.length;
        const deedsCount = this.filteredHistory.filter(log => log.event_type === "player").length;
        const worldCount = this.filteredHistory.filter(log => log.event_type === "world").length;

        const statsContainer = this.root.querySelector("#world-log-stats");
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="bb-log-stat-card">
                    <div class="bb-log-stat-icon days">
                        <i class="fa-solid fa-calendar-days"></i>
                    </div>
                    <div class="bb-log-stat-details">
                        <span class="bb-log-stat-value">${totalDays}</span>
                        <span class="bb-log-stat-label">Days Logged</span>
                    </div>
                </div>
                <div class="bb-log-stat-card">
                    <div class="bb-log-stat-icon events">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div class="bb-log-stat-details">
                        <span class="bb-log-stat-value">${totalEvents}</span>
                        <span class="bb-log-stat-label">Total Events</span>
                    </div>
                </div>
                <div class="bb-log-stat-card">
                    <div class="bb-log-stat-icon deeds">
                        <i class="fa-solid fa-user-shield"></i>
                    </div>
                    <div class="bb-log-stat-details">
                        <span class="bb-log-stat-value">${deedsCount} <span style="font-size:0.75rem; font-weight:600; color:#64748b;">/ ${worldCount}</span></span>
                        <span class="bb-log-stat-label">Deeds / World</span>
                    </div>
                </div>
            `;
        }

        // Slice unique days for lazy-loading/scalability
        const slicedDays = uniqueDays.slice(0, this.visibleDaysCount);

        // Render each day group
        slicedDays.forEach((day) => {
            const dayContainer = this.documentRef.createElement("div");
            dayContainer.className = "bb-log-day-group";
            
            const isCollapsed = this.collapsedDays.has(day);
            const logs = logsByDay[day];

            dayContainer.innerHTML = `
                <div class="bb-log-day-header ${isCollapsed ? 'collapsed-header' : 'expanded-header'}" data-day="${day}">
                    <div class="bb-log-day-title">
                        <i class="fa-solid fa-calendar-day"></i> Day ${day} 
                        <span class="bb-log-day-count">(${logs.length} ${logs.length === 1 ? 'event' : 'events'})</span>
                    </div>
                    <i class="fa-solid fa-chevron-up bb-log-collapse-arrow"></i>
                </div>
                <div class="bb-log-day-wrapper ${isCollapsed ? '' : 'expanded'}">
                    <div class="bb-log-day-content">
                        <div class="bb-log-day-events-inner"></div>
                    </div>
                </div>
            `;

            const eventsInner = dayContainer.querySelector(".bb-log-day-events-inner");
            
            logs.forEach((log) => {
                const entry = this._createLogEntry(log);
                eventsInner.appendChild(entry);
            });

            // Bind click handler for accordion collapse
            const headerEl = dayContainer.querySelector(".bb-log-day-header");
            const wrapperEl = dayContainer.querySelector(".bb-log-day-wrapper");
            headerEl.addEventListener("click", () => {
                if (this.collapsedDays.has(day)) {
                    this.collapsedDays.delete(day);
                    wrapperEl.classList.add("expanded");
                    headerEl.classList.add("expanded-header");
                    headerEl.classList.remove("collapsed-header");
                } else {
                    this.collapsedDays.add(day);
                    wrapperEl.classList.remove("expanded");
                    headerEl.classList.remove("expanded-header");
                    headerEl.classList.add("collapsed-header");
                }
            });

            this.listEl.appendChild(dayContainer);
        });

        // Add "Load More" button if there are more days to display
        if (uniqueDays.length > this.visibleDaysCount) {
            const loadMoreBtn = this.documentRef.createElement("button");
            loadMoreBtn.className = "bb-log-load-more-btn";
            loadMoreBtn.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Load More Days (${uniqueDays.length - this.visibleDaysCount} remaining)`;
            loadMoreBtn.addEventListener("click", () => {
                this.visibleDaysCount += DAYS_PER_PAGE;
                this.renderList();
            });
            this.listEl.appendChild(loadMoreBtn);
        }
    }

    hide() {
        this.root.classList.add("hidden");
    }

    _createOverlay() {
        const overlay = this.documentRef.createElement("div");
        overlay.className = "mgmt-overlay bb-world-log-overlay hidden";
        overlay.innerHTML = `
            <div class="exit-modal-content bb-world-log-modal">
                <div class="bb-world-log-header">
                    <h2 class="bb-world-log-title">
                        <i class="fa-solid fa-calendar-days"></i> World Chronicles
                    </h2>
                    <button id="btn-close-world-log" class="bb-world-log-close" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="bb-world-log-filters">
                    <!-- Sleek Stats Dashboard Panel -->
                    <div id="world-log-stats" class="bb-world-log-stats-panel"></div>

                    <div class="bb-world-log-tabs">
                        <button class="bb-log-filter-btn active" data-filter="all" style="font-family: var(--font-main)">All Days</button>
                        <button class="bb-log-filter-btn" data-filter="world" style="font-family: var(--font-main)">World Events</button>
                        <button class="bb-log-filter-btn" data-filter="player" style="font-family: var(--font-main)">Company Deeds</button>
                    </div>
                    <div class="bb-world-log-search-container">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="world-log-search" placeholder="Search events..." class="bb-world-log-search" />
                    </div>
                </div>

                <div id="world-log-list" class="bb-world-log-list"></div>
            </div>
        `;
        this.documentRef.body.appendChild(overlay);
        return overlay;
    }

    _createLogEntry(log) {
        const meta = CHRONICLE_EVENT_META[log.event_type] || CHRONICLE_EVENT_META.world;
        const entry = this.documentRef.createElement("div");
        entry.className = "bb-chronicles-entry bb-world-log-entry";
        
        let labelText = escapeHtml(log.event_text);
        if (log.node_name) {
            labelText = `<b style="color: #60a5fa;">[${escapeHtml(log.node_name)}]</b> ${labelText}`;
        }

        entry.innerHTML = `
            <div class="bb-chronicles-icon ${escapeHtml(meta.className)}">
                <i class="fa-solid ${escapeHtml(meta.icon)}"></i>
            </div>
            <div class="bb-world-log-entry-text">
                <div class="bb-chronicles-text">${labelText}</div>
            </div>
        `;
        return entry;
    }

    _bindUIEvents() {
        // Close buttons
        this.root.querySelector("#btn-close-world-log").addEventListener("click", () => this.hide());
        
        // Outside click to close
        this.root.addEventListener("click", (event) => {
            if (event.target === this.root) {
                this.hide();
            }
        });

        // Filter button tabs click
        const filterBtns = this.root.querySelectorAll(".bb-log-filter-btn");
        filterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                this.activeFilter = btn.dataset.filter;
                this.visibleDaysCount = DAYS_PER_PAGE;
                this._updateFilterTabActive();
                this.applyFilterAndRender();
            });
        });

        // Search text inputs
        if (this.searchEl) {
            this.searchEl.addEventListener("input", (e) => {
                this.searchQuery = e.target.value;
                this.visibleDaysCount = DAYS_PER_PAGE;
                if (this.searchQuery) {
                    this.collapsedDays.clear();
                }
                this.applyFilterAndRender();
            });
        }
    }

    _updateFilterTabActive() {
        const filterBtns = this.root.querySelectorAll(".bb-log-filter-btn");
        filterBtns.forEach((btn) => {
            if (btn.dataset.filter === this.activeFilter) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }
}
