import { initManagement } from "../management/ManagementManager.js";
import { Camera } from "./core/Camera.js";
import { InputHandler } from "./core/InputHandler.js";
import { GameLoop } from "./core/GameLoop.js";
import { RenderSystem } from "./systems/RenderSystem.js";
import { WorldState } from "./data/WorldState.js";
import { WorldHUD } from "./ui/WorldHUD.js"; 
import { loadPage } from "../../router.js";
import { initMenuButtons } from "../playGameManager.js";
import { GameAPI } from "../../api/GameAPI.js"; 

export class WorldMapManager {
    constructor() {
        this.canvas = document.getElementById('world-canvas');

        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.state = new WorldState();
        this.renderer = new RenderSystem(this.canvas, this.camera);
        this.input = new InputHandler(this.canvas, this.camera);
        this.hud = new WorldHUD(); 

        this.gameLoop = new GameLoop(
            (dt) => this.update(dt),  
            () => this.draw()         
        );

        this.managementInstance = null; 

        this.init();
    }

    update(dt) {
        this.state.updatePlayer(dt);
    }

    draw() {
        this.renderer.draw(this.state);
    }

    stop() {
        this.gameLoop.stop();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

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

        // Data Listener
        Neutralino.events.off('receiveWorldData', this._onWorldDataLoaded);
        Neutralino.events.on('receiveWorldData', this._onWorldDataLoaded.bind(this));

        this.bindUI();
        GameAPI.getWorldData();
        this.gameLoop.start();
    }

    _onWorldDataLoaded(e) {
        const data = e.detail;
        if(data && data.nodes) {
            console.log("🗺️ Loaded World Map from DB:", data.nodes.length, "nodes");
            this.state.setNodes(data.nodes);
            if(data.resources) this.hud.updateStats(data.resources);
        }
    }

    bindUI() {
        // --- Overlay Logic ---
        const overlay = document.getElementById('management-overlay');
        const openBtn = document.getElementById('btn-open-party-modal');
        const closeBtn = document.getElementById('btn-close-mgmt-modal');

        // Helper to close overlay
        const closeOverlay = () => {
            if (!overlay) return;
            overlay.classList.add('hidden');
            this.startLoop();
            GameAPI.getWorldData();
        };

        if (openBtn && overlay) {
            openBtn.addEventListener('click', () => {
                // 1. Pause Game Loop to save resources
                this.stopLoop();
                
                // 2. Show Overlay
                overlay.classList.remove('hidden');

                // 3. Init or Refresh Management UI
                if (!this.managementInstance) {
                    this.managementInstance = initManagement();
                } else {
                    this.managementInstance.refresh();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeOverlay);
        }

        // Add listener for clicking outside the content (on the overlay background)
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                // If the click target IS the overlay div (not a child), close it.
                if (e.target === overlay) {
                    closeOverlay();
                }
            });
        }

        // Exit Menu Logic 
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
        this.renderer.draw(this.state);
    }

    startLoop() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stopLoop() {
        this.isRunning = false;
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.state.updatePlayer(dt);
        this.renderer.draw(this.state);

        requestAnimationFrame((t) => this.loop(t));
    }
}

export function initWorldMap() {
    new WorldMapManager();
}