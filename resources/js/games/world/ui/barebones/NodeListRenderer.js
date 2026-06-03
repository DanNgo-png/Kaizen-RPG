import {
    BAREBONES_TABS,
    BAREBONES_UI,
    DEFAULT_NODE_ICON,
    HOSTILE_REPUTATION_THRESHOLD,
    NODE_TYPE_ICONS,
    SETTLEMENT_HIERARCHY_RANKS,
    SETTLEMENT_PANEL_DEFAULT_SETTINGS,
    SETTLEMENT_SORT_DIRECTIONS,
    SETTLEMENT_SORT_MODES
} from "./BarebonesConstants.js";
import { escapeHtml } from "./BarebonesTemplates.js";

const DEFAULT_FACTION_COLOR = "#60a5fa";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const confirmAction = (message) => globalThis.confirm?.(message) ?? true;

export class NodeListRenderer {
    constructor({
        dom,
        menuManager,
        chroniclesModal,
        onSelectNode,
        onSwitchTab,
        onTogglePin,
        onClearHostileNode
    }) {
        this.dom = dom;
        this.menuManager = menuManager;
        this.chroniclesModal = chroniclesModal;
        this.onSelectNode = onSelectNode;
        this.onSwitchTab = onSwitchTab;
        this.onTogglePin = onTogglePin;
        this.onClearHostileNode = onClearHostileNode;
    }

    render(nodes, selectedNode, settings = SETTLEMENT_PANEL_DEFAULT_SETTINGS) {
        if (!this.dom.nodeList) return;

        this.dom.nodeList.innerHTML = "";
        this._sortNodes(nodes, settings).forEach((node) => {
            this.dom.nodeList.appendChild(this._createNodeCard(node, selectedNode));
        });
    }

    _sortNodes(nodes, settings = SETTLEMENT_PANEL_DEFAULT_SETTINGS) {
        const sortSettings = {
            ...SETTLEMENT_PANEL_DEFAULT_SETTINGS,
            ...settings
        };
        const direction = sortSettings.sortDirection === SETTLEMENT_SORT_DIRECTIONS.DESC ? -1 : 1;

        return [...nodes].sort((a, b) => {
            if (sortSettings.keepPinnedOnTop && b.is_pinned !== a.is_pinned) {
                return Number(b.is_pinned) - Number(a.is_pinned);
            }

            const modeResult = this._compareByMode(a, b, sortSettings.sortMode);
            if (modeResult !== BAREBONES_UI.DEFAULT_RESOURCE_VALUE) return modeResult * direction;

            return this._compareName(a, b);
        });
    }

    _compareByMode(a, b, sortMode) {
        if (sortMode === SETTLEMENT_SORT_MODES.HIERARCHY) {
            return this._compareNumber(this._hierarchyRank(a), this._hierarchyRank(b))
                || this._compareNumber(this._populationTier(a), this._populationTier(b));
        }

        if (sortMode === SETTLEMENT_SORT_MODES.FACTION) {
            return this._compareString(this._factionName(a), this._factionName(b));
        }

        if (sortMode === SETTLEMENT_SORT_MODES.REPUTATION) {
            return this._compareNumber(this._reputation(a), this._reputation(b));
        }

        if (sortMode === SETTLEMENT_SORT_MODES.POPULATION) {
            return this._compareNumber(this._populationTier(a), this._populationTier(b))
                || this._compareNumber(this._hierarchyRank(a), this._hierarchyRank(b));
        }

        return this._compareName(a, b);
    }

    _compareName(a, b) {
        return this._compareString(a.name, b.name);
    }

    _compareString(a, b) {
        return String(a ?? "").localeCompare(String(b ?? ""));
    }

    _compareNumber(a, b) {
        return Number(a) - Number(b);
    }

    _hierarchyRank(node) {
        return SETTLEMENT_HIERARCHY_RANKS[node?.type] ?? BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }

    _populationTier(node) {
        return Number(node?.population_tier) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }

    _reputation(node) {
        return Number(node?.reputation) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }

    _factionName(node) {
        return node?.faction?.name || "";
    }

    _createNodeCard(node, selectedNode) {
        const element = document.createElement("div");
        element.className = "bb-node-card";
        if (selectedNode && node.id === selectedNode.id) {
            element.classList.add("selected");
        }

        element.innerHTML = this._nodeCardHtml(node);
        element.addEventListener("click", () => this.onSelectNode(node));
        element.addEventListener("contextmenu", (event) => this._showContextMenu(event, node));

        return element;
    }

    _nodeCardHtml(node) {
        const icon = NODE_TYPE_ICONS[node.type] || DEFAULT_NODE_ICON;
        const pinHtml = node.is_pinned
            ? `<i class="fa-solid fa-thumbtack bb-node-pin"></i>`
            : "";

        const specHtml = this._nodeMetaHtml(node);
        const factionHtml = node.faction ? this._factionHtml(node.faction) : "";

        return `
            <div class="bb-node-icon"><i class="fa-solid ${escapeHtml(icon)}"></i></div>
            <div class="bb-node-content">
                <div class="bb-node-title">${escapeHtml(node.name)} ${pinHtml}</div>
                <div class="bb-node-type">${escapeHtml(node.type)} ${specHtml}</div>
                ${factionHtml}
            </div>
        `;
    }

    _factionHtml(faction) {
        const color = this._safeHexColor(faction.color);
        const title = faction.motto || faction.name;

        return `
            <div class="bb-node-faction" title="${escapeHtml(title)}" style="--faction-color:${color};">
                <span class="bb-node-faction-dot"></span>
                ${escapeHtml(faction.name)}
            </div>
        `;
    }

    _safeHexColor(color) {
        return HEX_COLOR_PATTERN.test(String(color ?? "")) ? color : DEFAULT_FACTION_COLOR;
    }

    _nodeMetaHtml(node) {
        if (this._isHostileNode(node)) {
            return `<span style="color:#ef4444; margin-left: 8px; font-weight:700;" title="Hostile"><i class="fa-solid fa-skull"></i> Hostile</span>`;
        }

        if (node.specialization) {
            return `<span style="color:#a78bfa; margin-left: 8px;" title="${escapeHtml(node.specialization)}"><i class="fa-solid fa-star"></i> ${escapeHtml(node.specialization)}</span>`;
        }

        return `<span style="color:#6b7280; margin-left: 8px; font-style:italic;" title="No Specialization"><i class="fa-solid fa-ban"></i> Poor</span>`;
    }

    _isHostileNode(node) {
        return node.is_hostile === 1 || node.reputation <= HOSTILE_REPUTATION_THRESHOLD;
    }

    _showContextMenu(event, node) {
        const isHostile = this._isHostileNode(node);
        const menuItems = [
            {
                label: "Description",
                icon: '<i class="fa-solid fa-book-open"></i>',
                action: () => this.chroniclesModal.showForNode(node)
            },
            { separator: true },
            {
                label: node.is_pinned ? "Unpin Settlement" : "Pin to Top",
                icon: '<i class="fa-solid fa-thumbtack"></i>',
                action: () => this.onTogglePin(node.id)
            }
        ];

        if (isHostile) {
            menuItems.push(
                { separator: true },
                {
                    label: "Clear Hostile Settlement",
                    icon: '<i class="fa-solid fa-skull-crossbones"></i>',
                    action: () => {
                        this.onSelectNode(node);
                        this.onSwitchTab(BAREBONES_TABS.JOBS);
                        if (confirmAction(`Clear ${node.name} without a settlement contract? There will be no gold reward.`)) {
                            this.onClearHostileNode?.(node.id);
                        }
                    }
                }
            );
        } else {
            menuItems.push(
                { separator: true },
                {
                    label: "Visit Marketplace",
                    icon: '<i class="fa-solid fa-coins"></i>',
                    action: () => {
                        this.onSelectNode(node);
                        this.onSwitchTab(BAREBONES_TABS.MARKET);
                    }
                },
                {
                    label: "Visit Hiring Hall",
                    icon: '<i class="fa-solid fa-handshake"></i>',
                    action: () => {
                        this.onSelectNode(node);
                        this.onSwitchTab(BAREBONES_TABS.HIRE);
                    }
                },
                {
                    label: "View Job Board",
                    icon: '<i class="fa-solid fa-clipboard-list"></i>',
                    action: () => {
                        this.onSelectNode(node);
                        this.onSwitchTab(BAREBONES_TABS.JOBS);
                    }
                }
            );
        }

        this.menuManager.show(event, menuItems);
    }
}
