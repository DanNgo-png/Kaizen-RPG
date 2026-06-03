import {
    BAREBONES_UI,
    getReputationColor,
    getReputationString,
    HOSTILE_REPUTATION_THRESHOLD
} from "./BarebonesConstants.js";
import { emptyStateHtml, escapeHtml } from "./BarebonesTemplates.js";

const DEFAULT_FACTION_COLOR = "#60a5fa";
const UNALIGNED_FACTION_COLOR = "#94a3b8";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAP_WIDTH = 920;
const MAP_HEIGHT = 520;
const MAP_PADDING = 48;
const NODE_RADIUS = 8;
const SELECTED_NODE_RADIUS = 11;
const FACTION_HUB_RADIUS = 13;
const COORDINATE_FALLBACK_SPREAD = 40;
const MIN_COORDINATE_RANGE = 1;
const HOSTILE_REPUTATION_FLOOR = -100;
const PLAYER_RELATIONSHIP_LABEL = "Company Standing";

export class SettlementRelationshipOverlay {
    constructor({ documentRef = document } = {}) {
        this.documentRef = documentRef;
        this.nodes = [];
        this.options = {};
        this.root = this._createOverlay();
        this._bindEvents();
    }

    show(nodes = [], options = {}) {
        this.nodes = Array.isArray(nodes) ? nodes : [];
        this.options = options;
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
        overlay.className = "mgmt-overlay bb-settlement-relationship-overlay hidden";
        overlay.innerHTML = `
            <div class="exit-modal-content bb-settlement-relationship-modal">
                <div class="bb-settlement-modal-header">
                    <h2 class="bb-settlement-modal-title">
                        <i class="fa-solid fa-diagram-project"></i> Relationship Map
                    </h2>
                    <button class="bb-settlement-modal-close" data-action="close" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="bb-relationship-summary" data-role="summary"></div>
                <div class="bb-relationship-content">
                    <div class="bb-relationship-map-panel" data-role="map"></div>
                    <div class="bb-relationship-faction-panel" data-role="factions"></div>
                </div>
            </div>
        `;
        this.documentRef.body.appendChild(overlay);
        return overlay;
    }

    _bindEvents() {
        this.root.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
        this.root.addEventListener("click", (event) => {
            if (event.target === this.root) this.hide();
        });
    }

    _render() {
        const summaryEl = this.root.querySelector("[data-role='summary']");
        const mapEl = this.root.querySelector("[data-role='map']");
        const factionsEl = this.root.querySelector("[data-role='factions']");
        const groups = this._factionGroups(this.nodes);

        if (summaryEl) summaryEl.innerHTML = this._summaryHtml(groups);
        if (mapEl) mapEl.innerHTML = this.nodes.length ? this._mapHtml(groups) : emptyStateHtml("No settlements match the current filters.");
        if (factionsEl) factionsEl.innerHTML = this.nodes.length ? this._factionsHtml(groups) : "";
    }

    _summaryHtml(groups) {
        const hostileCount = this.nodes.filter((node) => this._isHostileNode(node)).length;
        const factionCount = groups.length;
        const friendlyCount = this.nodes.filter((node) => Number(node.reputation) > HOSTILE_REPUTATION_THRESHOLD).length;

        return `
            <div class="bb-relationship-stat">
                <span>${this.nodes.length}</span>
                <label>Settlements</label>
            </div>
            <div class="bb-relationship-stat">
                <span>${factionCount}</span>
                <label>Factions</label>
            </div>
            <div class="bb-relationship-stat">
                <span>${friendlyCount}</span>
                <label>Open</label>
            </div>
            <div class="bb-relationship-stat hostile">
                <span>${hostileCount}</span>
                <label>Hostile</label>
            </div>
        `;
    }

    _mapHtml(groups) {
        const positionedNodes = this._positionedNodes(this.nodes);
        const hubs = this._factionHubs(groups, positionedNodes);
        const links = positionedNodes
            .map((node) => this._linkHtml(node, hubs.get(this._factionKey(node))))
            .join("");
        const hubHtml = Array.from(hubs.values()).map((hub) => this._hubHtml(hub)).join("");
        const nodeHtml = positionedNodes.map((node) => this._nodeHtml(node)).join("");

        return `
            <svg class="bb-relationship-map" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="Settlement relationship map">
                <defs>
                    <pattern id="bbRelationshipGrid" width="46" height="46" patternUnits="userSpaceOnUse">
                        <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(148, 163, 184, 0.12)" stroke-width="1" />
                    </pattern>
                    <filter id="bbRelationshipGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="8" fill="rgba(15, 23, 42, 0.72)" />
                <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="8" fill="url(#bbRelationshipGrid)" />
                <text x="${MAP_PADDING}" y="${MAP_PADDING - 16}" class="bb-relationship-map-kicker">${PLAYER_RELATIONSHIP_LABEL}</text>
                ${links}
                ${hubHtml}
                ${nodeHtml}
            </svg>
        `;
    }

    _factionsHtml(groups) {
        return groups.map((group) => {
            const standingRows = group.nodes
                .map((node) => this._factionNodeHtml(node))
                .join("");

            return `
                <section class="bb-relationship-faction-card" style="--faction-color:${group.color};">
                    <div class="bb-relationship-faction-header">
                        <span class="bb-relationship-faction-dot"></span>
                        <div>
                            <h3>${escapeHtml(group.name)}</h3>
                            <p>${group.nodes.length} ${group.nodes.length === 1 ? "settlement" : "settlements"}</p>
                        </div>
                    </div>
                    <div class="bb-relationship-faction-nodes">
                        ${standingRows}
                    </div>
                </section>
            `;
        }).join("");
    }

    _factionNodeHtml(node) {
        const reputation = Number(node.reputation) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const standing = getReputationString(reputation);
        const color = getReputationColor(reputation);
        const isSelected = this.options.selectedNodeId === node.id;

        return `
            <div class="bb-relationship-faction-node ${isSelected ? "selected" : ""}">
                <div>
                    <strong>${escapeHtml(node.name)}</strong>
                    <span>${escapeHtml(node.type)} / ${escapeHtml(standing)}</span>
                </div>
                <em style="--standing-color:${color};">${reputation}</em>
            </div>
        `;
    }

    _positionedNodes(nodes) {
        const bounds = this._bounds(nodes);
        return nodes.map((node, index) => {
            const fallbackX = index * COORDINATE_FALLBACK_SPREAD;
            const fallbackY = index * COORDINATE_FALLBACK_SPREAD;
            const x = Number.isFinite(Number(node.x)) ? Number(node.x) : fallbackX;
            const y = Number.isFinite(Number(node.y)) ? Number(node.y) : fallbackY;

            return {
                ...node,
                mapX: this._scaleCoordinate(x, bounds.minX, bounds.rangeX, MAP_WIDTH),
                mapY: this._scaleCoordinate(y, bounds.minY, bounds.rangeY, MAP_HEIGHT)
            };
        });
    }

    _bounds(nodes) {
        const xValues = nodes.map((node, index) => Number.isFinite(Number(node.x)) ? Number(node.x) : index * COORDINATE_FALLBACK_SPREAD);
        const yValues = nodes.map((node, index) => Number.isFinite(Number(node.y)) ? Number(node.y) : index * COORDINATE_FALLBACK_SPREAD);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);

        return {
            minX,
            minY,
            rangeX: Math.max(maxX - minX, MIN_COORDINATE_RANGE),
            rangeY: Math.max(maxY - minY, MIN_COORDINATE_RANGE)
        };
    }

    _scaleCoordinate(value, min, range, size) {
        const drawableSize = size - MAP_PADDING * 2;
        return MAP_PADDING + ((value - min) / range) * drawableSize;
    }

    _factionHubs(groups, positionedNodes) {
        const hubs = new Map();

        groups.forEach((group) => {
            const groupNodes = positionedNodes.filter((node) => this._factionKey(node) === group.key);
            const sum = groupNodes.reduce((acc, node) => ({
                x: acc.x + node.mapX,
                y: acc.y + node.mapY
            }), { x: BAREBONES_UI.DEFAULT_RESOURCE_VALUE, y: BAREBONES_UI.DEFAULT_RESOURCE_VALUE });
            const count = Math.max(groupNodes.length, MIN_COORDINATE_RANGE);

            hubs.set(group.key, {
                key: group.key,
                name: group.name,
                color: group.color,
                x: sum.x / count,
                y: sum.y / count
            });
        });

        return hubs;
    }

    _linkHtml(node, hub) {
        if (!hub) return "";
        const color = this._safeHexColor(node.faction?.color, UNALIGNED_FACTION_COLOR);

        return `
            <line
                x1="${hub.x.toFixed(2)}"
                y1="${hub.y.toFixed(2)}"
                x2="${node.mapX.toFixed(2)}"
                y2="${node.mapY.toFixed(2)}"
                stroke="${color}"
                stroke-opacity="0.22"
                stroke-width="1.5"
            />
        `;
    }

    _hubHtml(hub) {
        return `
            <g class="bb-relationship-hub">
                <circle cx="${hub.x.toFixed(2)}" cy="${hub.y.toFixed(2)}" r="${FACTION_HUB_RADIUS}" fill="${hub.color}" fill-opacity="0.18" stroke="${hub.color}" stroke-width="2" />
                <text x="${(hub.x + FACTION_HUB_RADIUS + 4).toFixed(2)}" y="${(hub.y + 4).toFixed(2)}">${escapeHtml(hub.name)}</text>
            </g>
        `;
    }

    _nodeHtml(node) {
        const reputation = Number(node.reputation) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const standing = getReputationString(reputation);
        const standingColor = getReputationColor(reputation);
        const factionColor = this._safeHexColor(node.faction?.color, DEFAULT_FACTION_COLOR);
        const radius = this.options.selectedNodeId === node.id ? SELECTED_NODE_RADIUS : NODE_RADIUS;
        const hostileClass = this._isHostileNode(node) ? " hostile" : "";
        const selectedClass = this.options.selectedNodeId === node.id ? " selected" : "";

        return `
            <g class="bb-relationship-node${hostileClass}${selectedClass}" filter="url(#bbRelationshipGlow)">
                <title>${escapeHtml(node.name)} / ${escapeHtml(standing)} (${reputation})</title>
                <circle cx="${node.mapX.toFixed(2)}" cy="${node.mapY.toFixed(2)}" r="${radius}" fill="${factionColor}" stroke="${standingColor}" stroke-width="3" />
                <text x="${(node.mapX + radius + 5).toFixed(2)}" y="${(node.mapY + 4).toFixed(2)}">${escapeHtml(node.name)}</text>
            </g>
        `;
    }

    _factionGroups(nodes) {
        const groups = new Map();

        nodes.forEach((node) => {
            const key = this._factionKey(node);
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    name: node.faction?.name || "Unaffiliated",
                    color: this._safeHexColor(node.faction?.color, UNALIGNED_FACTION_COLOR),
                    nodes: []
                });
            }

            groups.get(key).nodes.push(node);
        });

        return Array.from(groups.values())
            .map((group) => ({
                ...group,
                nodes: group.nodes.sort((a, b) => String(a.name).localeCompare(String(b.name)))
            }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    _factionKey(node) {
        return node.faction?.name || node.faction_id || "unaffiliated";
    }

    _safeHexColor(color, fallback) {
        return HEX_COLOR_PATTERN.test(String(color ?? "")) ? color : fallback;
    }

    _isHostileNode(node) {
        const reputation = Number(node?.reputation) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        return node?.is_hostile === 1 || reputation <= HOSTILE_REPUTATION_THRESHOLD || reputation <= HOSTILE_REPUTATION_FLOOR;
    }
}
