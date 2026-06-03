import {
    SETTLEMENT_PANEL_DEFAULT_SETTINGS,
    SETTLEMENT_SORT_DEFAULT_DIRECTIONS,
    SETTLEMENT_SORT_DIRECTIONS,
    SETTLEMENT_SORT_LABELS,
    SETTLEMENT_SORT_MODES,
    SETTLEMENT_SORT_SEQUENCE
} from "./BarebonesConstants.js";

const SETTING_ACTIONS = Object.freeze({
    CLOSE: "close",
    SET_SORT: "set-sort",
    SET_DIRECTION: "set-direction",
    TOGGLE_HOSTILE: "toggle-hostile",
    TOGGLE_PINNED: "toggle-pinned"
});

export class SettlementSettingsOverlay {
    constructor({ documentRef = document, onChange } = {}) {
        this.documentRef = documentRef;
        this.onChange = onChange;
        this.settings = { ...SETTLEMENT_PANEL_DEFAULT_SETTINGS };
        this.root = this._createOverlay();
        this._bindEvents();
    }

    show(settings = {}) {
        this.settings = this._normalizedSettings(settings);
        this._render();
        this.root.classList.remove("hidden");
    }

    hide() {
        this.root.classList.add("hidden");
    }

    destroy() {
        this.root?.remove();
    }

    _createOverlay() {
        const overlay = this.documentRef.createElement("div");
        overlay.className = "mgmt-overlay bb-settlement-settings-overlay hidden";
        overlay.innerHTML = `
            <div class="exit-modal-content bb-settlement-settings-modal">
                <div class="bb-settlement-modal-header">
                    <h2 class="bb-settlement-modal-title">
                        <i class="fa-solid fa-sliders"></i> Settlement Settings
                    </h2>
                    <button class="bb-settlement-modal-close" data-action="${SETTING_ACTIONS.CLOSE}" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="bb-settlement-settings-body" data-role="body"></div>
            </div>
        `;
        this.documentRef.body.appendChild(overlay);
        return overlay;
    }

    _bindEvents() {
        this.root.addEventListener("click", (event) => {
            if (event.target === this.root) {
                this.hide();
                return;
            }

            const actionEl = event.target.closest("[data-action]");
            if (!actionEl || !this.root.contains(actionEl)) return;

            const action = actionEl.dataset.action;
            if (action === SETTING_ACTIONS.CLOSE) {
                this.hide();
                return;
            }

            if (action === SETTING_ACTIONS.SET_SORT) {
                this._updateSortMode(actionEl.dataset.sortMode);
                return;
            }

            if (action === SETTING_ACTIONS.SET_DIRECTION) {
                this._update({ sortDirection: actionEl.dataset.direction });
                return;
            }

            if (action === SETTING_ACTIONS.TOGGLE_HOSTILE) {
                this._update({ hideHostile: !this.settings.hideHostile });
                return;
            }

            if (action === SETTING_ACTIONS.TOGGLE_PINNED) {
                this._update({ keepPinnedOnTop: !this.settings.keepPinnedOnTop });
            }
        });
    }

    _render() {
        const body = this.root.querySelector("[data-role='body']");
        if (!body) return;

        body.innerHTML = `
            <section class="bb-settings-section">
                <h3>Sorting</h3>
                <div class="bb-settings-radio-grid" role="radiogroup" aria-label="Settlement sorting">
                    ${SETTLEMENT_SORT_SEQUENCE.map((mode) => this._sortOptionHtml(mode)).join("")}
                </div>
            </section>

            <section class="bb-settings-section">
                <h3>Direction</h3>
                <div class="bb-settings-segmented" role="group" aria-label="Sort direction">
                    ${this._directionOptionHtml(SETTLEMENT_SORT_DIRECTIONS.ASC, "Ascending", "fa-arrow-up-a-z")}
                    ${this._directionOptionHtml(SETTLEMENT_SORT_DIRECTIONS.DESC, "Descending", "fa-arrow-down-z-a")}
                </div>
            </section>

            <section class="bb-settings-section">
                <h3>Visibility</h3>
                ${this._toggleHtml({
                    action: SETTING_ACTIONS.TOGGLE_HOSTILE,
                    icon: "fa-skull",
                    label: "Hide Hostile",
                    isActive: this.settings.hideHostile
                })}
                ${this._toggleHtml({
                    action: SETTING_ACTIONS.TOGGLE_PINNED,
                    icon: "fa-thumbtack",
                    label: "Pinned First",
                    isActive: this.settings.keepPinnedOnTop
                })}
            </section>
        `;
    }

    _sortOptionHtml(mode) {
        const isActive = this.settings.sortMode === mode;
        const icon = this._sortIcon(mode);

        return `
            <button
                class="bb-settings-option ${isActive ? "active" : ""}"
                data-action="${SETTING_ACTIONS.SET_SORT}"
                data-sort-mode="${mode}"
                role="radio"
                aria-checked="${isActive ? "true" : "false"}"
            >
                <i class="fa-solid ${icon}"></i>
                <span>${SETTLEMENT_SORT_LABELS[mode]}</span>
            </button>
        `;
    }

    _directionOptionHtml(direction, label, icon) {
        const isActive = this.settings.sortDirection === direction;

        return `
            <button
                class="bb-settings-segment ${isActive ? "active" : ""}"
                data-action="${SETTING_ACTIONS.SET_DIRECTION}"
                data-direction="${direction}"
                aria-pressed="${isActive ? "true" : "false"}"
            >
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </button>
        `;
    }

    _toggleHtml({ action, icon, label, isActive }) {
        return `
            <button class="bb-settings-toggle ${isActive ? "active" : ""}" data-action="${action}" aria-pressed="${isActive ? "true" : "false"}">
                <span class="bb-settings-toggle-icon"><i class="fa-solid ${icon}"></i></span>
                <span>${label}</span>
                <span class="bb-settings-switch" aria-hidden="true"></span>
            </button>
        `;
    }

    _sortIcon(mode) {
        const icons = {
            [SETTLEMENT_SORT_MODES.NAME]: "fa-arrow-down-a-z",
            [SETTLEMENT_SORT_MODES.HIERARCHY]: "fa-ranking-star",
            [SETTLEMENT_SORT_MODES.FACTION]: "fa-flag",
            [SETTLEMENT_SORT_MODES.REPUTATION]: "fa-handshake",
            [SETTLEMENT_SORT_MODES.POPULATION]: "fa-users"
        };

        return icons[mode] || icons[SETTLEMENT_SORT_MODES.NAME];
    }

    _updateSortMode(sortMode) {
        if (!SETTLEMENT_SORT_SEQUENCE.includes(sortMode)) return;

        this._update({
            sortMode,
            sortDirection: SETTLEMENT_SORT_DEFAULT_DIRECTIONS[sortMode] || SETTLEMENT_SORT_DIRECTIONS.ASC
        });
    }

    _update(partialSettings) {
        this.settings = this._normalizedSettings({
            ...this.settings,
            ...partialSettings
        });
        this.onChange?.(this.settings);
        this._render();
    }

    _normalizedSettings(settings = {}) {
        const sortMode = SETTLEMENT_SORT_SEQUENCE.includes(settings.sortMode)
            ? settings.sortMode
            : SETTLEMENT_PANEL_DEFAULT_SETTINGS.sortMode;
        const sortDirection = Object.values(SETTLEMENT_SORT_DIRECTIONS).includes(settings.sortDirection)
            ? settings.sortDirection
            : SETTLEMENT_SORT_DEFAULT_DIRECTIONS[sortMode];

        return {
            ...SETTLEMENT_PANEL_DEFAULT_SETTINGS,
            ...settings,
            sortMode,
            sortDirection,
            hideHostile: Boolean(settings.hideHostile),
            keepPinnedOnTop: settings.keepPinnedOnTop !== false
        };
    }
}
