import {
    BAREBONES_UI,
    CHRONICLE_EVENT_META
} from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

const DEFAULT_FACTION_COLOR = "#60a5fa";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const GROWTH_PROGRESS_MAX_PERCENT = 100;
const DEFAULT_MATERIAL_DELIVERIES_NEEDED = 10;
const INFLUENCE_PROGRESS_CAP = 100;
const UNREST_HIGH_THRESHOLD = 15;
const DEFAULT_UNREST = 5;
const WARY_UNREST = 30;
const REPUTATION_UNREST_THRESHOLD = -10;
const MAX_POPULATION_TIER = 5;
const HOSTILE_NODE_TYPES = Object.freeze([
    'Bandit Camp',
    'Bandit Outpost',
    'Bandit Stronghold',
    'Stolen Stronghold',
    'Barbarian Camp',
    'Barbarian Outpost',
    'Barbarian Warcamp'
]);

export class ChroniclesModal {
    constructor({ documentRef = document, onRequestHistory } = {}) {
        this.documentRef = documentRef;
        this.onRequestHistory = onRequestHistory;
        
        this.rawHistory = [];
        this.activeFilter = "all";
        
        this.root = this._createModal();
        this.titleEl = this.root.querySelector("#chronicles-title");
        this.listEl = this.root.querySelector("#chronicles-list");
        
        this._bindUIEvents();
    }

    showForNode(node) {
        if (!node) return;

        this.titleEl.innerHTML = `<i class="fa-solid fa-book-open"></i> ${escapeHtml(node.name)}`;
        
        // Populate tab panels
        this.root.querySelector("#inspect-overview-panel").innerHTML = this._overviewHtml(node);
        this.root.querySelector("#inspect-economy-panel").innerHTML = this._economyHtml(node);
        this.root.querySelector("#inspect-politics-panel").innerHTML = this._politicsHtml(node);
        
        // Reset sub-components to defaults
        this._switchLeftTab("overview");
        this._switchLogFilter("all");

        this.listEl.innerHTML = loadingStateHtml("Reading archives...");
        this.root.classList.remove("hidden");
        this.onRequestHistory?.(node.id);
    }

    renderHistory(history = []) {
        this.rawHistory = history;
        this.applyFilterAndRender();
    }

    applyFilterAndRender() {
        this.listEl.innerHTML = "";
        const filter = this.activeFilter || "all";

        const filtered = this.rawHistory.filter(log => {
            if (filter === "all") return true;
            return log.event_type === filter;
        });

        if (!filtered.length) {
            this.listEl.innerHTML = emptyStateHtml("The archives are quiet. No entries match this filter.");
            return;
        }

        filtered.forEach((log) => {
            this.listEl.appendChild(this._createHistoryEntry(log));
        });
    }

    hide() {
        this.root.classList.add("hidden");
    }

    _createModal() {
        const modal = this.documentRef.createElement("div");
        modal.className = "mgmt-overlay bb-chronicles-overlay hidden";
        modal.innerHTML = `
            <div class="exit-modal-content bb-chronicles-modal">
                <div class="bb-chronicles-header">
                    <h2 id="chronicles-title" class="bb-chronicles-title">
                        <i class="fa-solid fa-book-open"></i> Local Chronicles
                    </h2>
                    <button id="btn-close-chronicles" class="bb-chronicles-close" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="bb-chronicles-body">
                    <!-- Left Sidebar (Settlement Metadata, Economy, Expansion) -->
                    <div class="bb-chronicles-sidebar">
                        <div class="bb-chronicles-tabs">
                            <button class="bb-chronicles-tab active" data-tab="overview">Overview</button>
                            <button class="bb-chronicles-tab" data-tab="economy">Economy</button>
                            <button class="bb-chronicles-tab" data-tab="politics">Politics</button>
                        </div>
                        
                        <div class="bb-chronicles-tab-content" id="bb-tab-overview">
                            <div id="inspect-overview-panel"></div>
                        </div>
                        <div class="bb-chronicles-tab-content hidden" id="bb-tab-economy">
                            <div id="inspect-economy-panel"></div>
                        </div>
                        <div class="bb-chronicles-tab-content hidden" id="bb-tab-politics">
                            <div id="inspect-politics-panel"></div>
                        </div>
                    </div>
                    
                    <!-- Right Panel (Chronicle Event Logs) -->
                    <div class="bb-chronicles-main">
                        <div class="bb-chronicles-main-header">
                            <h3><i class="fa-solid fa-clock-rotate-left"></i> Settlement Logs</h3>
                            <div class="bb-chronicles-log-filters">
                                <button class="bb-log-filter active" data-filter="all">All</button>
                                <button class="bb-log-filter" data-filter="world">World</button>
                                <button class="bb-log-filter" data-filter="player">Deeds</button>
                            </div>
                        </div>
                        <div id="chronicles-list" class="bb-chronicles-list"></div>
                    </div>
                </div>
            </div>
        `;
        this.documentRef.body.appendChild(modal);
        return modal;
    }

    _bindUIEvents() {
        this.root.querySelector("#btn-close-chronicles").addEventListener("click", () => this.hide());
        this.root.addEventListener("click", (e) => {
            if (e.target === this.root) this.hide();
        });

        // Left sidebar tab click logic
        this.root.querySelectorAll(".bb-chronicles-tab").forEach(tab => {
            tab.addEventListener("click", () => this._switchLeftTab(tab.dataset.tab));
        });

        // Right panel log filter click logic
        this.root.querySelectorAll(".bb-log-filter").forEach(filterBtn => {
            filterBtn.addEventListener("click", () => this._switchLogFilter(filterBtn.dataset.filter));
        });
    }

    _switchLeftTab(tabName) {
        this.root.querySelectorAll(".bb-chronicles-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.tab === tabName);
        });

        this.root.querySelectorAll(".bb-chronicles-tab-content").forEach(content => {
            content.classList.toggle("hidden", content.id !== `bb-tab-${tabName}`);
        });
    }

    _switchLogFilter(filterName) {
        this.root.querySelectorAll(".bb-log-filter").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.filter === filterName);
        });

        this.activeFilter = filterName;
        if (this.rawHistory.length) {
            this.applyFilterAndRender();
        }
    }

    _overviewHtml(node) {
        const tier = this._getSettlementTier(node.type);
        const isHostileLocation = HOSTILE_NODE_TYPES.includes(node.type);

        const tierBadge = tier > 0 
            ? `<span style="background: rgba(250, 204, 21, 0.15); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Tier ${tier}</span>` 
            : '';

        const popBadge = this._getPopulationBadge(node.population_tier);
        const populationHtml = node.type !== 'Ruins' && !isHostileLocation
            ? `<div style="font-size: 0.85rem; color: #cbd5e1; display: flex; align-items: center; justify-content: space-between;">
                   <span style="margin-right: 8px;"><i class="fa-solid fa-users" style="color: #60a5fa; margin-right: 8px;"></i> Population</span>
                   ${popBadge}
                 </div>`
            : '';

        let specHtml = '';
        if (isHostileLocation) {
            specHtml = `<div style="font-size: 0.85rem; color: #ef4444; font-weight: 700;"><i class="fa-solid fa-skull" style="margin-right: 8px;"></i> Hostile Territory</div>`;
        } else if (node.specialization) {
            specHtml = `<div style="font-size: 0.85rem; color: #cbd5e1; display: flex; align-items: center; justify-content: space-between;">
                            <span style="margin-right: 8px;"><i class="fa-solid fa-star" style="color: #a78bfa; margin-right: 8px;"></i> Specialization</span>
                            <span style="font-weight: 600; color: #a78bfa;">${escapeHtml(node.specialization)}</span>
                          </div>`;
        } else if (node.type !== 'Ruins') {
            specHtml = `<div style="font-size: 0.85rem; color: #64748b; font-style: italic;"><i class="fa-solid fa-ban" style="margin-right: 8px;"></i> No local specialization</div>`;
        }

        const attachHtml = node.attachments > 0 
            ? `<div style="font-size: 0.85rem; color: #cbd5e1; display: flex; align-items: center; justify-content: space-between;">
                   <span style="margin-right: 8px;"><i class="fa-solid fa-link" style="color: #94a3b8; margin-right: 8px;"></i> Attached Locations</span>
                   <span style="font-weight: 600;">${node.attachments}</span>
                 </div>`
            : '';

        return `
            ${this._factionHtml(node)}
            <div class="bb-chronicles-entry" style="border-left: 4px solid #facc15; background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; gap: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 4px;">
                    <span style="margin-right: 8px; font-size: 0.95rem; font-weight: 700; color: #fff;">${escapeHtml(node.type)}</span>
                    ${tierBadge}
                </div>
                ${populationHtml}
                ${specHtml}
                ${attachHtml}
            </div>
        `;
    }

    _politicsHtml(node) {
        const isHostileLocation = HOSTILE_NODE_TYPES.includes(node.type);

        if (isHostileLocation) {
            return `
                <div style="text-align: center; color: #ef4444; padding: 40px 10px; font-size: 0.85rem; font-style: italic;">
                    <i class="fa-solid fa-skull" style="font-size: 1.5rem; margin-bottom: 12px; display: block;"></i>
                    This location is currently occupied by hostile forces. Political mechanics are locked.
                </div>
            `;
        }

        const influence = Number(node.influence) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const influencePct = Math.min(INFLUENCE_PROGRESS_CAP, influence);
        const unrest = node.reputation <= REPUTATION_UNREST_THRESHOLD ? WARY_UNREST : DEFAULT_UNREST;
        const unrestColor = unrest > UNREST_HIGH_THRESHOLD ? '#f87171' : '#34d399';
        const unrestFill = unrest > UNREST_HIGH_THRESHOLD ? '#ef4444' : '#10b981';

        return `
            <div class="bb-chronicles-entry" style="border-left: 4px solid #3b82f6; background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; gap: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <span style="font-size: 0.9rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-gavel"></i> Local Governance</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: #94a3b8; margin-right: 8px;">Noble Influence</span>
                    <span style="font-weight: 700; color: #3b82f6;">${influence}</span>
                </div>
                <div class="bb-progress-bar" style="height: 6px; margin: 0; background: #0f172a; width: 100%;">
                    <div class="bb-fill" style="width: ${influencePct}%; background: #3b82f6;"></div>
                </div>
                <div style="font-size: 0.78rem; color: #9ca3af; line-height: 1.4;">
                    Spend Influence on job boards to push better pay, salvage rights, noble footmen, or local pardons.
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; margin-top: 4px;">
                    <span style="color: #94a3b8; margin-right: 8px;">Civil Unrest</span>
                    <span style="font-weight: 700; color: ${unrestColor};">${unrest}%</span>
                </div>
                <div class="bb-progress-bar" style="height: 6px; margin: 0; background: #0f172a; width: 100%;">
                    <div class="bb-fill" style="width: ${unrest}%; background: ${unrestFill};"></div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 8px;">
                    <span style="color: #94a3b8; margin-right: 8px;"><i class="fa-solid fa-shield-halved"></i> Local Garrison</span>
                    <span style="font-weight: 700; color: #e2e8f0;">Fortified</span>
                </div>
            </div>
        `;
    }

    _economyHtml(node) {
        const effectiveBuy = node.effective_buy !== undefined ? node.effective_buy : node.buy_modifier;
        const effectiveSell = node.effective_sell !== undefined ? node.effective_sell : node.sell_modifier;

        const prices = this._modifierPercent(effectiveBuy);
        const payouts = this._modifierPercent(effectiveSell);

        let eventContext = '';

        if (node.current_event && node.event_name) {
            let color = '#3b82f6'; 
            if (node.current_event.includes('ruined') || node.current_event.includes('ambushed')) {
                color = '#ef4444'; 
            } else if (node.current_event === 'well_supplied' || node.current_event === 'safe_roads') {
                color = '#10b981'; 
            }
            
            eventContext = `
                <div style="margin-top: 6px; font-size: 0.85rem; color: ${color}; font-weight: 700;">
                    <i class="fa-solid fa-bolt"></i> Altered by ${escapeHtml(node.event_name)}
                </div>
            `;

            if (node.current_event === 'settlement_expansion' || node.current_event === 'building_boom') {
                const growth = node.growth_data || {};
                const progress = growth.materialsDone || 0;
                const maxProg = growth.materialsNeeded || DEFAULT_MATERIAL_DELIVERIES_NEEDED;
                const pct = Math.min(GROWTH_PROGRESS_MAX_PERCENT, (progress / maxProg) * GROWTH_PROGRESS_MAX_PERCENT);
                
                let titleStr = "Settlement Upgrade";
                let descStr = "Sell <b>Building Materials</b> (Wood, Peat, Copper) here to construct the new infrastructure.";
                
                if (node.current_event === 'settlement_expansion') {
                    titleStr = 'Colonial Expansion';
                } else if (node.current_event === 'building_boom') {
                    if (!node.specialization) {
                        titleStr = 'Found Local Industry';
                        descStr = "Sell <b>Building Materials</b> (Wood, Peat, Copper) here to establish the settlement's first local specialization.";
                    } else if ((node.population_tier || 1) < MAX_POPULATION_TIER) {
                        titleStr = 'Population Growth';
                        descStr = "Sell <b>Building Materials</b> (Wood, Peat, Copper) here to increase the settlement's population.";
                    } else {
                        titleStr = 'Settlement Upgrade';
                        descStr = "Sell <b>Building Materials</b> (Wood, Peat, Copper) here to construct the new infrastructure and upgrade the settlement type.";
                    }
                }

                eventContext += `
                    <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid #374151;">
                        <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-bottom: 4px;">
                            <i class="fa-solid fa-hammer"></i> ${titleStr} Active!
                        </div>
                        <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 8px; line-height: 1.4;">
                            ${descStr}
                        </div>
                        <div class="bb-progress-bar" style="height: 6px; margin: 0; background: #0f172a; width: 100%;">
                            <div class="bb-fill" style="width: ${pct}%; background: #fbbf24;"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: #cbd5e1; text-align: right; margin-top: 6px;">
                            ${progress} / ${maxProg} Deliveries
                        </div>
                    </div>
                `;
            }

            if (node.current_event === 'well_supplied') {
                eventContext += this._growthProgressHtml(node);
            }
        } else {
            eventContext = `
                <div style="margin-top: 6px; font-size: 0.85rem; color: #64748b; font-style: italic;">
                    No active events altering the economy.
                </div>
            `;

            eventContext += this._growthProgressHtml(node);
        }

        return `
            <div class="bb-chronicles-entry" style="border-left: 4px solid #10b981; background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; gap: 8px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <span style="font-size: 0.9rem; font-weight: 700; color: #fff;"><i class="fa-solid fa-scale-balanced"></i> Market Values</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: #94a3b8; margin-right: 8px;">Local Prices</span>
                    <span style="font-weight: 700; color: #f87171;">${prices}%</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: #94a3b8; margin-right: 8px;">Trade Payouts</span>
                    <span style="font-weight: 700; color: #34d399;">${payouts}%</span>
                </div>
                ${eventContext}
            </div>
        `;
    }

    _growthProgressHtml(node) {
        const growth = node.growth_data;
        if (!growth?.canGrow) return "";

        const contractsPct = Math.min(
            GROWTH_PROGRESS_MAX_PERCENT,
            (growth.contractsDone / growth.contractsNeeded) * GROWTH_PROGRESS_MAX_PERCENT
        );
        const tradePct = Math.min(
            GROWTH_PROGRESS_MAX_PERCENT,
            (growth.tradeDone / growth.tradeNeeded) * GROWTH_PROGRESS_MAX_PERCENT
        );

        const targetTitle = growth.nextTier === 'Colonial Outpost' ? 'Fund Colonial Outpost' : `Upgrade to ${growth.nextTier}`;
        
        let growthDesc = `Contribute to the local economy to trigger a <b>Building Boom</b> and ${targetTitle.toLowerCase()}.`;
        if (!node.specialization) {
            growthDesc = "Contribute to the local economy to trigger a <b>Building Boom</b> and establish a local specialization.";
        } else if ((node.population_tier || 1) < MAX_POPULATION_TIER) {
            growthDesc = "Contribute to the local economy to trigger a <b>Building Boom</b> and grow the population.";
        }

        return `
            <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid #374151;">
                <div style="font-size: 0.85rem; color: #a78bfa; font-weight: 700; margin-bottom: 4px;">
                    <i class="fa-solid fa-arrow-trend-up"></i> Prosperity & Growth
                </div>
                <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 12px; line-height: 1.4;">
                    ${growthDesc}
                </div>

                <div style="margin-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;">
                        <span>Contracts Completed</span>
                        <span>${growth.contractsDone} / ${growth.contractsNeeded}</span>
                    </div>
                    <div class="bb-progress-bar" style="height: 4px; margin: 0; background: #0f172a; width: 100%;">
                        <div class="bb-fill" style="width: ${contractsPct}%; background: #60a5fa;"></div>
                    </div>
                </div>

                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#cbd5e1; margin-bottom:4px;">
                        <span>Trade Volume (Gold)</span>
                        <span>${growth.tradeDone} / ${growth.tradeNeeded}g</span>
                    </div>
                    <div class="bb-progress-bar" style="height: 4px; margin: 0; background: #0f172a; width: 100%;">
                        <div class="bb-fill" style="width: ${tradePct}%; background: #facc15;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    _factionHtml(node) {
        if (!node.faction) return "";

        const color = this._safeHexColor(node.faction.color);
        const motto = node.faction.motto
            ? `&ldquo;${escapeHtml(node.faction.motto)}&rdquo;`
            : `${escapeHtml(node.name)} answers to ${escapeHtml(node.faction.name)}.`;

        return `
            <div class="bb-chronicles-entry bb-chronicles-faction" style="--faction-color:${color}; margin-bottom: 12px;">
                <div class="bb-chronicles-icon faction">
                    <i class="fa-solid fa-flag"></i>
                </div>
                <div style="flex: 1;">
                    <div class="bb-chronicles-day" style="font-weight: 800; font-size: 0.75rem; text-transform: uppercase; color: ${color};">${escapeHtml(node.faction.name)}</div>
                    <div class="bb-chronicles-text" style="font-style: italic; color: #cbd5e1; font-size: 0.85rem; line-height: 1.3;">${motto}</div>
                    <div class="bb-chronicles-faction-tag" style="margin-top: 6px; padding: 2px 6px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(0,0,0,0.4); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">${escapeHtml(node.faction.archetype)}</div>
                </div>
            </div>
        `;
    }

    _modifierPercent(value) {
        const modifier = Number(value) || BAREBONES_UI.DEFAULT_MARKET_MODIFIER;
        return Math.round(modifier * BAREBONES_UI.PROGRESS_PERCENT_MAX);
    }

    _createHistoryEntry(log) {
        const meta = CHRONICLE_EVENT_META[log.event_type] || CHRONICLE_EVENT_META.world;
        const entry = this.documentRef.createElement("div");
        entry.className = "bb-chronicles-entry";
        entry.innerHTML = `
            <div class="bb-chronicles-icon ${escapeHtml(meta.className)}">
                <i class="fa-solid ${escapeHtml(meta.icon)}"></i>
            </div>
            <div>
                <div class="bb-chronicles-day">Day ${Number(log.day) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE}</div>
                <div class="bb-chronicles-text" style="line-height: 1.3;">${escapeHtml(log.event_text)}</div>
            </div>
        `;
        return entry;
    }

    _safeHexColor(color) {
        return HEX_COLOR_PATTERN.test(String(color ?? "")) ? color : DEFAULT_FACTION_COLOR;
    }

    _getSettlementTier(type) {
        const tiers = {
            'Hamlet': 1, 'Village': 1,
            'Town': 2, 'City': 2,
            'City-State': 3, 'Province': 3, 'Stronghold': 3,
            'Kingdom': 4, 'High Kingdom': 4,
            'Empire': 5,
            'Bandit Camp': 0, 'Bandit Outpost': 0, 'Bandit Stronghold': 0, 'Stolen Stronghold': 0,
            'Barbarian Camp': 0, 'Barbarian Outpost': 0, 'Barbarian Warcamp': 0,
            'Ruins': 0
        };
        return tiers[type] !== undefined ? tiers[type] : '?';
    }

    _getOrCreateFaction() {
        // Unused in current Modal logic, but preserved for standard file compatibility
        return null;
    }

    _getPopulationBadge(popTier) {
        const tier = popTier || 1;
        const labels = {
            1: { name: "Low", bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
            2: { name: "Medium", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
            3: { name: "High", bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
            4: { name: "Very High", bg: "rgba(249, 115, 22, 0.15)", color: "#fb923c", border: "rgba(249, 115, 22, 0.3)" },
            5: { name: "Overpopulated", bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" }
        };
        const config = labels[tier] || labels[1];
        return `<span style="background: ${config.bg}; color: ${config.color}; border: 1px solid ${config.border}; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${config.name}</span>`;
    }
}
