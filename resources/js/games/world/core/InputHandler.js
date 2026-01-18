export class InputHandler {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        // Callbacks
        this.onPan = null;
        this.onZoom = null;
        this.onClick = null;
        this.onRightClick = null;
        this.onHover = null;

        this._bindEvents();
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this._onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _onMouseDown(e) {
        if (e.button === 2) { // Right Click
            const worldPos = this.camera.screenToWorld(e.offsetX, e.offsetY);
            if (this.onRightClick) this.onRightClick(worldPos);
        } else if (e.button === 0) { // Left Click
            this.isDragging = true;
            this.dragStart = { x: e.clientX, y: e.clientY };
            // We handle "Click" inside MouseUp to distinguish from Drag
        }
    }

    _onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.dragStart = { x: e.clientX, y: e.clientY };
            
            if (this.onPan) this.onPan(dx, dy);
        }

        const worldPos = this.camera.screenToWorld(e.offsetX, e.offsetY);
        if (this.onHover) this.onHover(worldPos, e.clientX, e.clientY);
    }

    _onMouseUp() {
        this.isDragging = false;
    }

    _onWheel(e) {
        e.preventDefault();
        if (this.onZoom) this.onZoom(e.offsetX, e.offsetY, e.deltaY);
    }
}