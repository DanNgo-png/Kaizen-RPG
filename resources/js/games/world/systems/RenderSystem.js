const MAP_THEME = Object.freeze({
    water: '#0f172a',
    land: '#1e293b',
    road: '#94a3b8',
    town: '#f59e0b',
    ruins: '#64748b',
    player: '#3b82f6',
    hover: '#ffffff',
    label: '#cbd5e1',
    dungeonTitle: '#475569',
    dungeonAccent: '#ef4444',
    dungeonHint: '#64748b',
    targetLine: 'rgba(255, 255, 255, 0.2)'
});

const NODE_VISUALS = Object.freeze({
    DEFAULT_SIZE: 8,
    CITY_SIZE: 10,
    REGION_SIZE: 12,
    CAPITAL_SIZE: 15,
    PLAYER_SIZE: 6,
    ROAD_WIDTH: 2,
    ROAD_LINK_STRIDE: 2,
    TARGET_LINE_WIDTH: 1,
    TARGET_LINE_DASH: 5,
    TERRITORY_RADIUS: 110,
    CAPITAL_TERRITORY_RADIUS: 170,
    TERRITORY_INNER_ALPHA: 0.16,
    TERRITORY_OUTER_ALPHA: 0,
    FACTION_RING_WIDTH: 3,
    FACTION_RING_RADIUS_BONUS: 4,
    NAME_MIN_FONT_SIZE: 10,
    NAME_BASE_FONT_SIZE: 12,
    NAME_OFFSET: 15,
    FULL_CIRCLE_RADIANS: Math.PI * 2
});

const DUNGEON_VISUALS = Object.freeze({
    TITLE_FONT: 'bold 32px "Segoe UI"',
    SUBTITLE_FONT: '16px "Segoe UI"',
    HINT_FONT: 'italic 14px "Segoe UI"',
    TITLE_Y_OFFSET: -30,
    SUBTITLE_Y_OFFSET: 5,
    HINT_Y_OFFSET: 45
});

const HEX_COLOR_PATTERN = Object.freeze({
    RADIX: 16,
    RED_START: 0,
    RED_END: 2,
    GREEN_START: 2,
    GREEN_END: 4,
    BLUE_START: 4,
    BLUE_END: 6
});

export class RenderSystem {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.theme = MAP_THEME;
    }

    clear() {
        this.ctx.fillStyle = this.theme.water;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(state) {
        this.clear();
        this.ctx.save();

        if (state.origin === 'dungeon' && state.gameVersion === 'barebones') {
            this._drawDungeonPlaceholder();
        } else {
            this.ctx.scale(this.camera.zoom, this.camera.zoom);
            this.ctx.translate(-this.camera.x, -this.camera.y);

            this._drawTerritoryFields(state.nodes);
            this._drawRoads(state.nodes);
            this._drawNodes(state.nodes, state.hoveredNode);
            this._drawPlayer(state);
        }

        this.ctx.restore();
    }

    _drawDungeonPlaceholder() {
        this.ctx.fillStyle = this.theme.dungeonTitle;
        this.ctx.font = DUNGEON_VISUALS.TITLE_FONT;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            "THE INFINITE DUNGEON",
            this.canvas.width / 2,
            this.canvas.height / 2 + DUNGEON_VISUALS.TITLE_Y_OFFSET
        );

        this.ctx.font = DUNGEON_VISUALS.SUBTITLE_FONT;
        this.ctx.fillStyle = this.theme.dungeonAccent;
        this.ctx.fillText(
            "- Barebones Mode -",
            this.canvas.width / 2,
            this.canvas.height / 2 + DUNGEON_VISUALS.SUBTITLE_Y_OFFSET
        );

        this.ctx.font = DUNGEON_VISUALS.HINT_FONT;
        this.ctx.fillStyle = this.theme.dungeonHint;
        this.ctx.fillText(
            "Your party delves deeper automatically upon completing Focus Sessions.",
            this.canvas.width / 2,
            this.canvas.height / 2 + DUNGEON_VISUALS.HINT_Y_OFFSET
        );
    }

    _drawTerritoryFields(nodes) {
        nodes.forEach(node => {
            const factionColor = this._normalizeHexColor(node.faction?.color);
            if (!factionColor || node.type === 'Ruins') return;

            const radius = this._isCapitalType(node.type)
                ? NODE_VISUALS.CAPITAL_TERRITORY_RADIUS
                : NODE_VISUALS.TERRITORY_RADIUS;
            const gradient = this.ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);

            gradient.addColorStop(0, this._hexToRgba(factionColor, NODE_VISUALS.TERRITORY_INNER_ALPHA));
            gradient.addColorStop(1, this._hexToRgba(factionColor, NODE_VISUALS.TERRITORY_OUTER_ALPHA));

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, radius, 0, NODE_VISUALS.FULL_CIRCLE_RADIANS);
            this.ctx.fill();
        });
    }

    _drawRoads(nodes) {
        this.ctx.strokeStyle = this.theme.road;
        this.ctx.lineWidth = NODE_VISUALS.ROAD_WIDTH / this.camera.zoom;
        this.ctx.beginPath();
        for (let i = 0; i < nodes.length - 1; i++) {
            if (i % NODE_VISUALS.ROAD_LINK_STRIDE === 0) {
                this.ctx.moveTo(nodes[i].x, nodes[i].y);
                this.ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
            }
        }
        this.ctx.stroke();
    }

    _drawNodes(nodes, hoveredNode) {
        nodes.forEach(node => {
            if (node.is_hidden) return;
            
            const baseSize = this._nodeSize(node.type);
            const factionColor = this._normalizeHexColor(node.faction?.color);

            if (factionColor) {
                this.ctx.strokeStyle = factionColor;
                this.ctx.lineWidth = NODE_VISUALS.FACTION_RING_WIDTH / this.camera.zoom;
                this.ctx.beginPath();
                this.ctx.arc(
                    node.x,
                    node.y,
                    baseSize + NODE_VISUALS.FACTION_RING_RADIUS_BONUS,
                    0,
                    NODE_VISUALS.FULL_CIRCLE_RADIANS
                );
                this.ctx.stroke();
            }

            this.ctx.fillStyle = this._nodeFillColor(node, hoveredNode, factionColor);
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, baseSize, 0, NODE_VISUALS.FULL_CIRCLE_RADIANS);
            this.ctx.fill();

            const fontSize = Math.max(
                NODE_VISUALS.NAME_MIN_FONT_SIZE,
                NODE_VISUALS.NAME_BASE_FONT_SIZE / this.camera.zoom
            );
            this.ctx.fillStyle = this.theme.label;
            this.ctx.font = `${fontSize}px "Segoe UI"`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                node.name,
                node.x,
                node.y + baseSize + (NODE_VISUALS.NAME_OFFSET / this.camera.zoom)
            );
        });
    }

    _drawPlayer(state) {
        const player = state.player;

        this.ctx.fillStyle = this.theme.player;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, NODE_VISUALS.PLAYER_SIZE, 0, NODE_VISUALS.FULL_CIRCLE_RADIANS);
        this.ctx.fill();

        if (player.targetX !== null) {
            this.ctx.strokeStyle = this.theme.targetLine;
            this.ctx.lineWidth = NODE_VISUALS.TARGET_LINE_WIDTH / this.camera.zoom;
            this.ctx.setLineDash([NODE_VISUALS.TARGET_LINE_DASH, NODE_VISUALS.TARGET_LINE_DASH]);
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            this.ctx.lineTo(player.targetX, player.targetY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    _nodeSize(type) {
        if (['City', 'City-State'].includes(type)) return NODE_VISUALS.CITY_SIZE;
        if (['Province', 'Kingdom'].includes(type)) return NODE_VISUALS.REGION_SIZE;
        if (['High Kingdom', 'Empire', 'Stronghold', 'Stolen Stronghold', 'Bandit Stronghold'].includes(type)) return NODE_VISUALS.CAPITAL_SIZE;
        return NODE_VISUALS.DEFAULT_SIZE;
    }

    _nodeFillColor(node, hoveredNode, factionColor) {
        if (hoveredNode === node) return this.theme.hover;
        if (node.type === 'Ruins') return this.theme.ruins;
        return factionColor || this.theme.town;
    }

    _isCapitalType(type) {
        return ['City', 'Stronghold', 'Stolen Stronghold', 'Bandit Stronghold', 'City-State', 'Province', 'Kingdom', 'High Kingdom', 'Empire'].includes(type);
    }

    _normalizeHexColor(color) {
        return HEX_COLOR_PATTERN.test(String(color ?? '')) ? color : null;
    }

    _hexToRgba(hex, alpha) {
        const value = hex.replace('#', '');
        const red = parseInt(value.slice(HEX_COLOR_PATTERN.RED_START, HEX_COLOR_PATTERN.RED_END), HEX_COLOR_PATTERN.RADIX);
        const green = parseInt(value.slice(HEX_COLOR_PATTERN.GREEN_START, HEX_COLOR_PATTERN.GREEN_END), HEX_COLOR_PATTERN.RADIX);
        const blue = parseInt(value.slice(HEX_COLOR_PATTERN.BLUE_START, HEX_COLOR_PATTERN.BLUE_END), HEX_COLOR_PATTERN.RADIX);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
}