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
import { notifier } from "../../_global-managers/NotificationManager.js";

let activeWorldMapManager = null;

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
        this._resizeBinding = () => this.resize();
        this._onWorldDataLoadedBound = this._onWorldDataLoaded.bind(this);
        this._onDayEndedBound = this._onDayEnded.bind(this);
        this._isDestroyed = false;

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
        this.isRunning = false;
        // Remove global save hook when stopping/destroying
        window.kaizenSaveWorldState = null;
    }

    destroy() {
        if (this._isDestroyed) return;
        this._isDestroyed = true;

        this.stop();
        window.removeEventListener('resize', this._resizeBinding);
        Neutralino.events.off('receiveWorldData', this._onWorldDataLoadedBound);
        Neutralino.events.off('dayEnded', this._onDayEndedBound);
        this.input?.destroy();
        this.barebonesUI?.destroy();
        this.managementInstance?.destroy();

        if (activeWorldMapManager === this) {
            activeWorldMapManager = null;
        }
    }

    _shouldHandleEvent() {
        if (this._isDestroyed) return false;
        if (this.canvas && document.body.contains(this.canvas)) return true;

        this.destroy();
        return false;
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
        window.removeEventListener('resize', this._resizeBinding);
        window.addEventListener('resize', this._resizeBinding);

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
        Neutralino.events.off('receiveWorldData', this._onWorldDataLoadedBound);
        Neutralino.events.on('receiveWorldData', this._onWorldDataLoadedBound);

        this.bindUI();
        GameAPI.getWorldData();
        this.gameLoop.start();
    }

    _onWorldDataLoaded(e) {
        if (!this._shouldHandleEvent()) return;

        const data = e.detail;
        if(data) {
            console.log("🗺️ Loaded World Map Data");
            
            if (data.origin) this.state.origin = data.origin;
            if (data.gameVersion) this.state.gameVersion = data.gameVersion;
            
            if(data.nodes) this.state.setNodes(data.nodes);
            if(data.resources) this.hud.updateStats(data.resources);

            if (data.player) {
                this.state.player.x = data.player.x;
                this.state.player.y = data.player.y;
                this.camera.centerOn(data.player.x, data.player.y);
            }

            // Sync Delving Status
            if (data.isDelving !== undefined) this.barebonesUI.isDelving = data.isDelving;

            if (this.state.origin === 'dungeon' && this.state.gameVersion === 'barebones') {
                if (this.barebonesUI.dom.overlay.classList.contains('hidden')) {
                    this.barebonesUI.show(this.state.nodes);
                    // Force refresh active banner right away
                    this.barebonesUI.updateActiveBanner(this.barebonesUI.activeContract);
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

        // Setup Manual Camping (Instantly skip a day to heal)
        const campBtn = document.getElementById('btn-world-camp');
        if (campBtn) {
            campBtn.addEventListener('click', () => {
                if (confirm("Rest at camp for the day? This will pay daily wages and instantly heal injured party members if you have medical supplies.")) {
                    Neutralino.extensions.dispatch("js.node-neutralino.projectRunner", "processDayEnd");
                }
            });
        }

        // Listen for the Camp Day Ended event to refresh the UI and show a toast
        Neutralino.events.off('dayEnded', this._onDayEndedBound);
        Neutralino.events.on('dayEnded', this._onDayEndedBound);

        const exitModal = document.getElementById('exit-game-modal');
        const btnCancelExit = document.getElementById('btn-cancel-exit');
        const btnConfirmExit = document.getElementById('btn-confirm-exit');

        const handleExitRequest = () => {
            this.save(); // Save game state before showing prompt
            if (exitModal) exitModal.classList.remove('hidden');
        };

        // Bind Standard HUD Exit Button
        document.getElementById('btn-world-menu')?.addEventListener('click', handleExitRequest);
        
        // Bind Barebones HUD Exit Button
        document.getElementById('btn-bb-exit')?.addEventListener('click', handleExitRequest);

        // Cancel Exit
        if (btnCancelExit) {
            btnCancelExit.addEventListener('click', () => {
                exitModal.classList.add('hidden');
            });
        }

        // Confirm Exit
        if (btnConfirmExit) {
            btnConfirmExit.addEventListener('click', async () => {
                exitModal.classList.add('hidden');
                
                this.destroy(); // Stop loops and remove global hooks/listeners
                GameAPI.closeGame(); 
                
                await loadPage('./pages/games/play-game.html');
                initMenuButtons();
            });
        }
    }

    _onDayEnded(e) {
        if (!this._shouldHandleEvent()) return;
        if (!e.detail.success) return;

        const { wagesPaid, medicineUsed, totalHealed, spoiledCount } = e.detail;
        let msg = `Paid ${wagesPaid}g. `;
        if (totalHealed > 0) msg += `Healed ${totalHealed} HP using ${medicineUsed} Meds. `;
        else msg += "Party is fully rested. ";

        if (spoiledCount > 0) msg += `${spoiledCount} food item(s) spoiled!`;

        notifier.show("Rested at Camp", msg, "fa-solid fa-campground");
        GameAPI.getWorldData(); // Refresh HUD
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
    activeWorldMapManager?.destroy();
    activeWorldMapManager = new WorldMapManager();
    return activeWorldMapManager;
}
