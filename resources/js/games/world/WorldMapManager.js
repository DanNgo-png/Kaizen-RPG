import { Camera } from "./core/Camera.js";
import { InputHandler } from "./core/InputHandler.js";
import { GameLoop } from "./core/GameLoop.js";
import { RenderSystem } from "./systems/RenderSystem.js";
import { WorldState } from "./data/WorldState.js";
import { WorldHUD } from "./ui/WorldHUD.js"; 
import { loadPage } from "../../router.js";
import { initParty } from "../party/PartyManager.js";
import { initMenuButtons } from "../playGameManager.js";

export class WorldMapManager {
    constructor() {
        this.canvas = document.getElementById('world-canvas');

        // 1. Initialize Subsystems
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.state = new WorldState();
        this.renderer = new RenderSystem(this.canvas, this.camera);
        this.input = new InputHandler(this.canvas, this.camera);
        this.hud = new WorldHUD(); 

        this.gameLoop = new GameLoop(
            (dt) => this.update(dt),  // Logic
            () => this.draw()         // Render
        );

        this.init();
    }

    update(dt) {
        this.state.updatePlayer(dt);
    }

    draw() {
        this.renderer.draw(this.state);
    }

    // Called when leaving the page (e.g. "Exit to Menu" button)
    stop() {
        this.gameLoop.stop();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 3. Connect Input Events to Logic
        this.input.onPan = (dx, dy) => this.camera.pan(dx, dy);
        this.input.onZoom = (x, y, delta) => this.camera.zoomAt(x, y, delta);

        this.input.onRightClick = (worldPos) => {
            this.state.player.targetX = worldPos.x;
            this.state.player.targetY = worldPos.y;
        };

        this.input.onHover = (worldPos, clientX, clientY) => {
            const node = this.state.findNodeAt(worldPos.x, worldPos.y);
            this.state.hoveredNode = node;

            if (node) {
                this.canvas.style.cursor = 'pointer';
                this.hud.showTooltip(node, clientX, clientY);
            } else {
                this.canvas.style.cursor = this.input.isDragging ? 'grabbing' : 'default';
                this.hud.hideTooltip();
            }
        };

        this.bindUI();
        await this.loadWorldData();

        this.gameLoop.start();
    }

    bindUI() {
        document.getElementById('btn-open-party')?.addEventListener('click', async () => {
            this.stopLoop(); // Optimization: Stop rendering when leaving page
            await loadPage('./pages/games/party.html');
            initParty();
        });

        document.getElementById('btn-world-menu')?.addEventListener('click', async () => {
            if (confirm("Exit to Main Menu?")) {
                this.stopLoop();
                await loadPage('./pages/games/play-game.html');
                initMenuButtons();
            }
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.resize(window.innerWidth, window.innerHeight);
        this.renderer.draw(this.state); // Force redraw
    }

    async loadWorldData() {
        // ... (Simulated or Real Fetch) ...
        // Mock Generation for now
        this.state.setNodes(this._generateProceduralMap());
        this.camera.centerOn(this.state.player.x, this.state.player.y);
    }

    _generateProceduralMap() {
        // ... (Logic from previous GenerateProceduralMap) ...
        const nodes = [];
        for (let i = 0; i < 15; i++) {
            nodes.push({
                id: i,
                x: Math.random() * 2000,
                y: Math.random() * 1500,
                type: Math.random() > 0.3 ? 'Village' : 'Stronghold',
                name: `Node ${i}`
            });
        }
        return nodes;
    }

    startLoop() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    stopLoop() {
        this.isRunning = false;
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        // Calculate Delta Time (seconds)
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 1. Update State
        this.state.updatePlayer(dt);

        // 2. Render
        this.renderer.draw(this.state);

        requestAnimationFrame((t) => this.loop(t));
    }
}

export function initWorldMap() {
    new WorldMapManager();
}