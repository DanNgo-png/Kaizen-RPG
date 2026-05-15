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

export class ChroniclesModal {
    constructor({ documentRef = document, onRequestHistory } = {}) {
        this.documentRef = documentRef;
        this.onRequestHistory = onRequestHistory;
        this.root = this._createModal();
        this.titleEl = this.root.querySelector("#chronicles-title");
        this.economyEl = this.root.querySelector("#inspect-economy-panel");
        this.listEl = this.root.querySelector("#chronicles-list");
    }

    showForNode(node) {
        if (!node) return;

        this.titleEl.innerHTML = `<i class="fa-solid fa-book-open"></i> ${escapeHtml(node.name)}`;
        this.economyEl.innerHTML = this._economyHtml(node);
        this.listEl.innerHTML = loadingStateHtml("Reading archives...");
        this.root.classList.remove("hidden");
        this.onRequestHistory?.(node.id);
    }

    renderHistory(history = []) {
        this.listEl.innerHTML = "";

        if (!history.length) {
            this.listEl.innerHTML = emptyStateHtml("The archives are empty. Nothing of note has happened here recently.");
            return;
        }

        history.forEach((log) => {
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
                <div id="inspect-economy-panel" class="bb-chronicles-economy"></div>
                <div id="chronicles-list" class="bb-chronicles-list"></div>
            </div>
        `;
        this.documentRef.body.appendChild(modal);

        modal.querySelector("#btn-close-chronicles").addEventListener("click", () => this.hide());
        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.hide();
        });

        return modal;
    }

    _getSettlementTier(type) {
        const tiers = {
            'Hamlet': 1, 'Village': 1,
            'Town': 2, 'City': 2,
            'City-State': 3, 'Province': 3, 'Stronghold': 3,
            'Kingdom': 4, 'High Kingdom': 4,
            'Empire': 5,
            'Ruins': 0
        };
        return tiers[type] !== undefined ? tiers[type] : '?';
    }

    _tierHtml(node) {
        const typeIcons = {
            'Hamlet': 'fa-house',
            'Village': 'fa-tree-city',
            'Town': 'fa-house-chimney',
            'City': 'fa-city',
            'City-State': 'fa-chess-rook',
            'Province': 'fa-chess-rook',
            'Kingdom': 'fa-crown',
            'High Kingdom': 'fa-crown',
            'Empire': 'fa-chess-king',
            'Stronghold': 'fa-shield-halved',
            'Ruins': 'fa-skull'
        };
        const icon = typeIcons[node.type] || 'fa-landmark';
        const tier = this._getSettlementTier(node.type);
        
        const tierBadge = tier > 0 
            ? `<span style="background: rgba(250, 204, 21, 0.15); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px; vertical-align: middle; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Tier ${tier}</span>` 
            : '';

        let specHtml = '';
        if (node.specialization) {
            specHtml = `<div style="font-size: 0.8rem; color: #a78bfa; margin-top: 6px; font-weight: 600;"><i class="fa-solid fa-star"></i> Specialization: ${escapeHtml(node.specialization)}</div>`;
        } else if (node.type !== 'Ruins') {
            specHtml = `<div style="font-size: 0.8rem; color: #64748b; margin-top: 6px; font-style: italic;"><i class="fa-solid fa-ban"></i> No specializations.</div>`;
        }

        return `
            <div class="bb-chronicles-entry" style="border-left: 4px solid #facc15; background: rgba(255, 255, 255, 0.04);">
                <div class="bb-chronicles-icon" style="color: #facc15;">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div class="bb-chronicles-day">Settlement Type</div>
                    <div class="bb-chronicles-text" style="display: flex; align-items: center;">
                        <b style="color: #fff; font-size: 1.05rem;">${escapeHtml(node.type)}</b> ${tierBadge}
                    </div>
                    ${specHtml}
                </div>
            </div>
        `;
    }

    _economyHtml(node) {
        // Use effective modifiers provided by backend, fallback to base if missing
        const effectiveBuy = node.effective_buy !== undefined ? node.effective_buy : node.buy_modifier;
        const effectiveSell = node.effective_sell !== undefined ? node.effective_sell : node.sell_modifier;

        const prices = this._modifierPercent(effectiveBuy);
        const payouts = this._modifierPercent(effectiveSell);

        // Build Event Context UI
        let eventContext = '';
        if (node.current_event && node.event_name) {
            let color = '#3b82f6'; // Default Blue
            if (node.current_event.includes('ruined') || node.current_event.includes('ambushed')) {
                color = '#ef4444'; // Red for negative events
            } else if (node.current_event === 'well_supplied' || node.current_event === 'safe_roads') {
                color = '#10b981'; // Green for positive events
            }
            
            eventContext = `
                <div style="margin-top: 6px; font-size: 0.85rem; color: ${color}; font-weight: 600;">
                    <i class="fa-solid fa-bolt"></i> Altered by ${escapeHtml(node.event_name)}
                </div>
            `;

            // --- Inject Expansion Progress UI ---
            if (node.current_event === 'settlement_expansion') {
                const progress = node.development_progress || 0;
                const maxProg = BAREBONES_UI.MAX_DEVELOPMENT_PROGRESS;
                const pct = (progress / maxProg) * 100;
                
                eventContext += `
                    <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid #374151;">
                        <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-bottom: 4px;">
                            <i class="fa-solid fa-hammer"></i> Settlement Expansion
                        </div>
                        <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 8px; line-height: 1.4;">
                            Selling Building Materials (Wood, Peat, Copper) accelerates growth.
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
        } else {
            eventContext = `
                <div style="margin-top: 6px; font-size: 0.85rem; color: #64748b; font-style: italic;">
                    No active events altering the economy.
                </div>
            `;
        }

        return `
            ${this._tierHtml(node)}
            ${this._factionHtml(node)}
            <div class="bb-chronicles-entry">
                <div class="bb-chronicles-icon economy">
                    <i class="fa-solid fa-scale-balanced"></i>
                </div>
                <div style="flex: 1;">
                    <div class="bb-chronicles-day">Local Economy</div>
                    <div class="bb-chronicles-text">
                        Prices: <b style="color: #fff;">${prices}%</b> | Payouts: <b style="color: #fff;">${payouts}%</b>
                    </div>
                    ${eventContext}
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
            <div class="bb-chronicles-entry bb-chronicles-faction" style="--faction-color:${color};">
                <div class="bb-chronicles-icon faction">
                    <i class="fa-solid fa-flag"></i>
                </div>
                <div style="flex: 1;">
                    <div class="bb-chronicles-day">${escapeHtml(node.faction.name)}</div>
                    <div class="bb-chronicles-text">${motto}</div>
                    <div class="bb-chronicles-faction-tag">${escapeHtml(node.faction.archetype)}</div>
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
                <div class="bb-chronicles-text">${escapeHtml(log.event_text)}</div>
            </div>
        `;
        return entry;
    }

    _safeHexColor(color) {
        return HEX_COLOR_PATTERN.test(String(color ?? "")) ? color : DEFAULT_FACTION_COLOR;
    }
}