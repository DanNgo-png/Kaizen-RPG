export class WorldState {
    constructor() {
        this.nodes = [];
        this.player = { x: 400, y: 300, targetX: null, targetY: null };
        this.hoveredNode = null;
    }

    setNodes(nodes) {
        this.nodes = nodes;
    }

    updatePlayer(dt) {
        if (this.player.targetX !== null) {
            const dx = this.player.targetX - this.player.x;
            const dy = this.player.targetY - this.player.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 2) {
                this.player.x = this.player.targetX;
                this.player.y = this.player.targetY;
                this.player.targetX = null;
            } else {
                const speed = 200 * dt; // 200px per second
                this.player.x += (dx / dist) * speed;
                this.player.y += (dy / dist) * speed;
            }
        }
    }

    findNodeAt(worldX, worldY, threshold = 20) {
        for (const node of this.nodes) {
            const dist = Math.hypot(node.x - worldX, node.y - worldY);
            if (dist < threshold) return node;
        }
        return null;
    }
}