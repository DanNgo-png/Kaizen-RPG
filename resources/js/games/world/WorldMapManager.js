import { initManagement } from "../management/ManagementManager.js";
import { Camera } from "./core/Camera.js";
import { InputHandler } from "./core/InputHandler.js";
import { GameLoop } from "./core/GameLoop.js";
import { RenderSystem } from "./systems/RenderSystem.js";
import { WorldState } from "./data/WorldState.js";
import { WorldHUD } from "./ui/WorldHUD.js"; 
import { BarebonesUIManager } from "./ui/BarebonesUIManager.js";
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

        this.barebonesUI = new BarebonesUIManager();

        this.gameLoop = new GameLoop(
            (dt) => this.update(dt),  
            () => this.draw()         
        );

        this.managementInstance = null; 

        // Bind for cleanup
        this._saveBinding = () => this.save();

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
        // Remove global save hook when stopping/destroying
        window.kaizenSaveWorldState = null;
    }

    save() {
        // console.log("💾 Saving World State...");
        GameAPI.saveWorldData({
            x: this.state.player.x,
            y: this.state.player.y
        });
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Register Global Save Hook for Window Close
        window.kaizenSaveWorldState = this._saveBinding;

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
        if(data) {
            console.log("🗺️ Loaded World Map Data");
            
            if (data.origin) this.state.origin = data.origin;
            if (data.gameVersion) this.state.gameVersion = data.gameVersion;
            
            // 1. Load Nodes
            if(data.nodes) this.state.setNodes(data.nodes);
            
            // 2. Load Resources
            if(data.resources) this.hud.updateStats(data.resources);

            // 3. Load Player Position
            if (data.player) {
                this.state.player.x = data.player.x;
                this.state.player.y = data.player.y;
                this.camera.centerOn(data.player.x, data.player.y);
            }

            // ---> Check if Barebones, boot UI instead
            if (this.state.origin === 'dungeon' && this.state.gameVersion === 'barebones') {
                if (this.barebonesUI.dom.overlay.classList.contains('hidden')) {
                    this.barebonesUI.show(this.state.nodes);
                    if (data.resources) this.barebonesUI.updateStats(data.resources);
                } else {
                    this.barebonesUI.updateData(this.state.nodes, data.resources);
                }
            } else {
                this.barebonesUI.hide();
            }
        }
    }

    bindUI() {
        // --- Overlay Logic ---
        const overlay = document.getElementById('management-overlay');
        const openBtn = document.getElementById('btn-open-party-modal');
        const closeBtn = document.getElementById('btn-close-mgmt-modal');
        const bbOpenBtn = document.getElementById('btn-bb-inventory');

        const closeOverlay = () => {
            if (!overlay) return;
            overlay.classList.add('hidden');
            this.startLoop();
            GameAPI.getWorldData(); // Refresh in case money changed
        };

        const openOverlay = () => {
            if (!overlay) return;
            // Save before opening management (good practice)
            this.save();
            this.stopLoop();
            overlay.classList.remove('hidden');

            if (!this.managementInstance) {
                this.managementInstance = initManagement();
            } else {
                this.managementInstance.refresh();
            }
        };

        // Bind standard map button
        if (openBtn) {
            openBtn.addEventListener('click', openOverlay);
        }

        // Bind Barebones stash button
        if (bbOpenBtn) {
            bbOpenBtn.addEventListener('click', openOverlay);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeOverlay);
        }

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });
        }

        // Exit Menu Logic (Standard)
        document.getElementById('btn-world-menu')?.addEventListener('click', async () => {
            this.save();
            if (confirm("Exit to Main Menu?")) {
                this.stop(); // Stop loop and remove global hook
                GameAPI.closeGame(); 
                await loadPage('./pages/games/play-game.html');
                initMenuButtons();
            }
        });

        // Exit Menu Logic (Barebones Overlay)
        document.getElementById('btn-bb-exit')?.addEventListener('click', async () => {
            this.save();
            if (confirm("Exit to Main Menu?")) {
                this.stop(); 
                GameAPI.closeGame(); 
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