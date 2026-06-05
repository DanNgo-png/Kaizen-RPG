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
        this.selectedFactionKey = null; // Filter state for scalability
        this.root = this._createOverlay();
        this._bindEvents();
    }

    show(nodes = [], options = {}) {
        this.nodes = Array.isArray(nodes) ? nodes : [];
        this.options = options;
        this.selectedFactionKey = null; // Clear previous state
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
            <div class="bb-settlement-relationship-modal">
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

    _bindMapInteractions(groups) {
        // Reset View button handler
        const resetBtn = this.root.querySelector('#bb-map-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                this.selectedFactionKey = null;
                this._render();
            };
        }

        // Faction Hub click and hover triggers
        const hubs = this.root.querySelectorAll('.bb-relationship-hub');
        hubs.forEach(hub => {
            const key = hub.dataset.key;
            hub.onclick = (e) => {
                e.stopPropagation();
                this.selectedFactionKey = (this.selectedFactionKey === key) ? null : key;
                this._render();
            };
        });

        // Click empty space/background on SVG to clear filters
        const svg = this.root.querySelector('.bb-relationship-map');
        if (svg) {
            svg.onclick = (e) => {
                if (e.target === svg || e.target.tagName === 'rect') {
                    if (this.selectedFactionKey) {
                        this.selectedFactionKey = null;
                        this._render();
                    }
                }
            };
        }
    }

    _render() {
        const summaryEl = this.root.querySelector("[data-role='summary']");
        const mapEl = this.root.querySelector("[data-role='map']");
        const factionsEl = this.root.querySelector("[data-role='factions']");
        const groups = this._factionGroups(this.nodes);

        if (summaryEl) summaryEl.innerHTML = this._summaryHtml(groups);

        // Filter factions shown in list when a hub is clicked
        const displayGroups = this.selectedFactionKey 
            ? groups.filter(g => g.key === this.selectedFactionKey)
            : groups;

        if (mapEl) mapEl.innerHTML = this.nodes.length ? this._mapHtml(groups) : emptyStateHtml("No settlements match the current filters.");
        if (factionsEl) factionsEl.innerHTML = this.nodes.length ? this._factionsHtml(displayGroups) : "";
        
        this._bindMapInteractions(groups);
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

        // Render Settlement-to-Centroid connections
        const links = positionedNodes
            .map((node) => this._linkHtml(node, hubs.get(this._factionKey(node))))
            .join("");

        // Render Faction-to-Faction diplomatic relationships
        const relationLinks = this._interFactionRelationsHtml(hubs);

        const hubHtml = Array.from(hubs.values()).map((hub) => this._hubHtml(hub)).join("");
        const nodeHtml = positionedNodes.map((node) => this._nodeHtml(node)).join("");

        const resetBtnHtml = this.selectedFactionKey 
            ? `
                <g class="reset-view-btn" style="cursor:pointer;" id="bb-map-reset-btn">
                    <rect x="${MAP_WIDTH - 150}" y="${MAP_PADDING - 20}" width="120" height="30" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
                    <text x="${MAP_WIDTH - 90}" y="${MAP_PADDING}" fill="#60a5fa" font-size="12" font-weight="700" text-anchor="middle">Reset View</text>
                </g>
            `
            : "";

        const legendHtml = `
            <g class="map-legend" transform="translate(${MAP_PADDING}, ${MAP_HEIGHT - 60})">
                <rect width="330" height="40" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(148, 163, 184, 0.15)" stroke-width="1" />
                
                <line x1="15" y1="20" x2="35" y2="20" stroke="#10b981" stroke-width="2" />
                <text x="42" y="24" fill="#cbd5e1" font-size="10" font-weight="600">Alliance</text>
                
                <line x1="105" y1="20" x2="125" y2="20" stroke="#3b82f6" stroke-width="1.5" />
                <text x="132" y="24" fill="#cbd5e1" font-size="10" font-weight="600">Trade / Peace</text>
                
                <line x1="205" y1="20" x2="225" y2="20" stroke="#ef4444" stroke-dasharray="3,3" stroke-width="2" />
                <text x="232" y="24" fill="#cbd5e1" font-size="10" font-weight="600">Conflict / War</text>
            </g>
        `;

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
                
                ${relationLinks}
                ${links}
                ${hubHtml}
                ${nodeHtml}
                ${legendHtml}
                ${resetBtnHtml}
            </svg>
        `;
    }

    _interFactionRelationsHtml(hubs) {
        const hubArray = Array.from(hubs.values());
        let html = '';
        
        for (let i = 0; i < hubArray.length; i++) {
            for (let j = i + 1; j < hubArray.length; j++) {
                const hubA = hubArray[i];
                const hubB = hubArray[j];
                
                const relation = this._getDiplomaticRelation(hubA, hubB);
                if (relation === 'None') continue;

                let strokeColor = '#94a3b8'; 
                let strokeDash = '';
                let strokeWidth = 1.5;
                let opacity = 0.18;
                
                if (relation === 'War') {
                    strokeColor = '#ef4444'; 
                    strokeDash = '5,5';
                    strokeWidth = 2.2;
                    opacity = 0.55;
                } else if (relation === 'Alliance') {
                    strokeColor = '#10b981'; 
                    strokeWidth = 2;
                    opacity = 0.45;
                } else if (relation === 'Trade') {
                    strokeColor = '#3b82f6'; 
                    strokeWidth = 1.5;
                    opacity = 0.35;
                }

                if (this.selectedFactionKey) {
                    if (hubA.key === this.selectedFactionKey || hubB.key === this.selectedFactionKey) {
                        opacity = Math.min(1.0, opacity * 1.8);
                        strokeWidth *= 1.4;
                    } else {
                        opacity = 0.03; // Dim irrelevant relationships
                    }
                }

                html += `
                    <line
                        x1="${hubA.x.toFixed(2)}"
                        y1="${hubA.y.toFixed(2)}"
                        x2="${hubB.x.toFixed(2)}"
                        y2="${hubB.y.toFixed(2)}"
                        stroke="${strokeColor}"
                        stroke-dasharray="${strokeDash}"
                        stroke-width="${strokeWidth}"
                        stroke-opacity="${opacity}"
                        class="relation-line relation-${relation.toLowerCase()}"
                        data-from="${hubA.key}"
                        data-to="${hubB.key}"
                    >
                        <title>${hubA.name} &harr; ${hubB.name}: State of ${relation}</title>
                    </line>
                `;
            }
        }
        return html;
    }

    _getDiplomaticRelation(hubA, hubB) {
        const keyA = hubA.key.toLowerCase();
        const keyB = hubB.key.toLowerCase();

        if (keyA === 'unaffiliated' || keyB === 'unaffiliated') {
            return 'None';
        }

        const isMonsterA = this._isMonsterFaction(hubA);
        const isMonsterB = this._isMonsterFaction(hubB);

        // Monster clans/hordes are perpetually at war with humans and other monsters
        if (isMonsterA || isMonsterB) {
            return 'War';
        }

        // Noble Houses share defensive pact alliances and trade routes
        if (!isMonsterA && !isMonsterB) {
            if (keyA.includes('blackwood') && keyB.includes('thornwatch')) {
                return 'Trade'; // Distant/Different houses
            }
            return 'Alliance';
        }

        return 'None';
    }

    _isMonsterFaction(hub) {
        const key = hub.key.toLowerCase();
        const name = hub.name.toLowerCase();
        return (
            key === 'bandit' || name.includes('bandit') || name.includes('brigand') ||
            key === 'barbarian' || name.includes('barbarian') ||
            key === 'undead' || name.includes('undead') || name.includes('lich') ||
            key === 'webknecht' || name.includes('webknecht') || name.includes('dynasty') ||
            key === 'greenskins' || name.includes('greenskin') || name.includes('goblin') || name.includes('orc')
        );
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
        
        let opacity = 0.22;
        if (this.selectedFactionKey) {
            opacity = (this._factionKey(node) === this.selectedFactionKey) ? 0.6 : 0.02;
        }

        return `
            <line
                x1="${hub.x.toFixed(2)}"
                y1="${hub.y.toFixed(2)}"
                x2="${node.mapX.toFixed(2)}"
                y2="${node.mapY.toFixed(2)}"
                stroke="${color}"
                stroke-opacity="${opacity}"
                stroke-width="1.5"
                class="settlement-link"
                data-faction="${this._factionKey(node)}"
            />
        `;
    }

    _hubHtml(hub) {
        const isSelected = this.selectedFactionKey === hub.key;
        let opacity = 1.0;
        let scaleClass = "";

        if (this.selectedFactionKey) {
            opacity = isSelected ? 1.0 : 0.15;
            if (isSelected) scaleClass = "selected-active-hub";
        }

        return `
            <g class="bb-relationship-hub ${scaleClass}" data-key="${hub.key}" style="opacity: ${opacity};">
                <circle cx="${hub.x.toFixed(2)}" cy="${hub.y.toFixed(2)}" r="${FACTION_HUB_RADIUS}" fill="${hub.color}" fill-opacity="0.18" stroke="${hub.color}" stroke-width="${isSelected ? 3.5 : 2}" />
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
        
        let opacity = 1.0;
        if (this.selectedFactionKey) {
            opacity = (this._factionKey(node) === this.selectedFactionKey) ? 1.0 : 0.15;
        }

        return `
            <g class="bb-relationship-node${hostileClass}${selectedClass}" filter="url(#bbRelationshipGlow)" style="opacity: ${opacity};">
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