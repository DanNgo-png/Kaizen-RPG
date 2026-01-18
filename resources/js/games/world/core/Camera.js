export class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.viewport = { width, height };
    }

    resize(width, height) {
        this.viewport = { width, height };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.zoom) + this.x,
            y: (screenY / this.zoom) + this.y
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }

    pan(dx, dy) {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
    }

    zoomAt(screenX, screenY, delta) {
        const oldZoom = this.zoom;
        let newZoom = oldZoom + (delta * -0.001);
        newZoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));

        // Calculate world point under mouse before zoom
        const worldPos = this.screenToWorld(screenX, screenY);

        this.zoom = newZoom;

        // Adjust camera so the world point remains under the mouse
        this.x = worldPos.x - (screenX / newZoom);
        this.y = worldPos.y - (screenY / newZoom);
    }

    centerOn(targetX, targetY) {
        this.x = targetX - (this.viewport.width / 2) / this.zoom;
        this.y = targetY - (this.viewport.height / 2) / this.zoom;
    }
}