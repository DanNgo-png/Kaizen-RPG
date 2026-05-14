import {
    BAREBONES_UI,
    CHRONICLE_EVENT_META
} from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

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

    _economyHtml(node) {
        const prices = this._modifierPercent(node.buy_modifier);
        const payouts = this._modifierPercent(node.sell_modifier);

        return `
            <div class="bb-chronicles-entry">
                <div class="bb-chronicles-icon economy">
                    <i class="fa-solid fa-scale-balanced"></i>
                </div>
                <div>
                    <div class="bb-chronicles-day">Local Economy</div>
                    <div class="bb-chronicles-text">Prices: ${prices}% | Payouts: ${payouts}%</div>
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
}
