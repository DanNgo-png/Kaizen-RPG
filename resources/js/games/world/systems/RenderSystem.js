export class RenderSystem {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        
        // Theme config
        this.theme = {
            water: '#0f172a',
            land: '#1e293b',
            road: '#94a3b8',
            town: '#f59e0b',
            player: '#3b82f6',
            hover: '#ffffff'
        };
    }

    clear() {
        this.ctx.fillStyle = this.theme.water;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(state) {
        this.clear();
        this.ctx.save();

        if (state.origin === 'dungeon' && state.gameVersion === 'barebones') {
            this.ctx.fillStyle = '#475569'; // Slate
            this.ctx.font = 'bold 32px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("THE INFINITE DUNGEON", this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            this.ctx.font = '16px "Segoe UI"';
            this.ctx.fillStyle = '#ef4444'; // Red-ish accent
            this.ctx.fillText("— Barebones Mode —", this.canvas.width / 2, this.canvas.height / 2 + 5);
            
            this.ctx.font = 'italic 14px "Segoe UI"';
            this.ctx.fillStyle = '#64748b'; // Muted text
            this.ctx.fillText("Your party delvers deeper automatically upon completing Focus Sessions.", this.canvas.width / 2, this.canvas.height / 2 + 45);
        } else {
            // -> Standard Map Rendering
            this.ctx.scale(this.camera.zoom, this.camera.zoom);
            this.ctx.translate(-this.camera.x, -this.camera.y);

            this._drawRoads(state.nodes);
            this._drawNodes(state.nodes, state.hoveredNode);
            this._drawPlayer(state);
        }

        this.ctx.restore();
    }

    _drawRoads(nodes) {
        this.ctx.strokeStyle = this.theme.road;
        this.ctx.lineWidth = 2 / this.camera.zoom; 
        this.ctx.beginPath();
        for (let i = 0; i < nodes.length - 1; i++) {
            if (i % 2 === 0) { 
                this.ctx.moveTo(nodes[i].x, nodes[i].y);
                this.ctx.lineTo(nodes[i+1].x, nodes[i+1].y);
            }
        }
        this.ctx.stroke();
    }

    _drawNodes(nodes, hoveredNode) {
        nodes.forEach(node => {
            // DYNAMIC SCALE: Map nodes get visually bigger based on new Tiers
            let baseSize = 8;
            if (['City', 'City-State'].includes(node.type)) baseSize = 10;
            if (['Province', 'Kingdom'].includes(node.type)) baseSize = 12;
            if (['High Kingdom', 'Empire', 'Stronghold'].includes(node.type)) baseSize = 15;
            
            this.ctx.fillStyle = (hoveredNode === node) ? this.theme.hover : this.theme.town;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, baseSize, 0, Math.PI * 2);
            this.ctx.fill();

            const fontSize = Math.max(10, 12 / this.camera.zoom); 
            this.ctx.fillStyle = '#cbd5e1';
            this.ctx.font = `${fontSize}px "Segoe UI"`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.name, node.x, node.y + baseSize + (15 / this.camera.zoom));
        });
    }

    _drawPlayer(state) {
        const player = state.player;

        this.ctx.fillStyle = this.theme.player;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Target Line
        if (player.targetX !== null) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1 / this.camera.zoom;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(player.x, player.y);
            this.ctx.lineTo(player.targetX, player.targetY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
}