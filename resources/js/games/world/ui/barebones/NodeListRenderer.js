import {
    BAREBONES_TABS,
    DEFAULT_NODE_ICON,
    NODE_TYPE_ICONS
} from "./BarebonesConstants.js";
import { escapeHtml } from "./BarebonesTemplates.js";

export class NodeListRenderer {
    constructor({
        dom,
        menuManager,
        chroniclesModal,
        onSelectNode,
        onSwitchTab,
        onTogglePin
    }) {
        this.dom = dom;
        this.menuManager = menuManager;
        this.chroniclesModal = chroniclesModal;
        this.onSelectNode = onSelectNode;
        this.onSwitchTab = onSwitchTab;
        this.onTogglePin = onTogglePin;
    }

    render(nodes, selectedNode) {
        if (!this.dom.nodeList) return;

        this.dom.nodeList.innerHTML = "";
        this._sortNodes(nodes).forEach((node) => {
            this.dom.nodeList.appendChild(this._createNodeCard(node, selectedNode));
        });
    }

    _sortNodes(nodes) {
        return [...nodes].sort((a, b) => {
            if (b.is_pinned !== a.is_pinned) return Number(b.is_pinned) - Number(a.is_pinned);
            return String(a.name).localeCompare(String(b.name));
        });
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

        return `
            <div class="bb-node-icon"><i class="fa-solid ${escapeHtml(icon)}"></i></div>
            <div class="bb-node-content">
                <div class="bb-node-title">${escapeHtml(node.name)} ${pinHtml}</div>
                <div class="bb-node-type">${escapeHtml(node.type)}</div>
            </div>
        `;
    }

    _showContextMenu(event, node) {
        this.menuManager.show(event, [
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
            },
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
        ]);
    }
}
