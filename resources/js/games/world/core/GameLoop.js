export class GameLoop {
    constructor(onUpdate, onRender) {
        this.onUpdate = onUpdate;
        this.onRender = onRender;

        this.lastTime = 0;
        this.isRunning = false;
        this.frameId = null;

        this._loop = this._loop.bind(this);
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this._loop);
    }

    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        // Calculate Delta Time in seconds
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to prevent huge jumps if tab is inactive (e.g. max 0.1s)
        const safeDt = Math.min(dt, 0.1);

        // 1. Update Logic
        if (this.onUpdate) this.onUpdate(safeDt);

        // 2. Render Visuals
        if (this.onRender) this.onRender();

        // 3. Schedule next frame
        this.frameId = requestAnimationFrame(this._loop);
    }
}