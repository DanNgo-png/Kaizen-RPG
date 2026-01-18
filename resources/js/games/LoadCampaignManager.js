import { EXTENSION_ID } from "../api/_extension_id.js";
import { loadPage } from "../router.js";
import { initMenuButtons } from "./playGameManager.js";
import { initGameModes } from "./GameModesManager.js";
import { initWorldMap } from "./world/WorldMapManager.js";

export class LoadCampaignManager {
    constructor() {
        this.dom = {
            container: document.getElementById('save-slots-container'),
            btnBack: document.getElementById('btn-back-menu'),
            btnRefresh: document.getElementById('btn-refresh-saves'),
            
            // Modal DOM Elements
            modalDelete: document.getElementById('modal-delete-save'),
            btnConfirmDelete: document.getElementById('btn-confirm-delete'),
            btnCancelDelete: document.getElementById('btn-cancel-delete'),
            deleteNameSpan: document.getElementById('delete-slot-name')
        };

        this.slotsToCheck = [1, 2, 3]; // Define max slots
        this.pendingDeleteId = null;

        this.init();
    }

    init() {
        // Navigation Events
        if (this.dom.btnBack) {
            this.dom.btnBack.addEventListener('click', () => {
                loadPage('./pages/games/play-game.html').then(initMenuButtons);
            });
        }

        if (this.dom.btnRefresh) {
            this.dom.btnRefresh.addEventListener('click', () => this.fetchSaves());
        }

        // --- Delete Modal Events ---
        if (this.dom.btnCancelDelete) {
            this.dom.btnCancelDelete.addEventListener('click', () => this.toggleModal(false));
        }
        if (this.dom.btnConfirmDelete) {
            this.dom.btnConfirmDelete.addEventListener('click', () => this.executeDelete());
        }

        // Listen for Data
        Neutralino.events.off('receiveSaveSlots', this._onReceiveSlots);
        Neutralino.events.on('receiveSaveSlots', this._onReceiveSlots.bind(this));

        Neutralino.events.off('gameLoaded', this._onGameLoaded);
        Neutralino.events.on('gameLoaded', this._onGameLoaded.bind(this));

        // Initial Fetch
        this.fetchSaves();
    }

    fetchSaves() {
        this.dom.container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Reading disk...</div>`;
        Neutralino.extensions.dispatch(EXTENSION_ID, "listSaveSlots");
    }

    _onReceiveSlots(e) {
        const files = e.detail || []; 
        this.render(files);
    }

    render(files) {
        this.dom.container.innerHTML = '';

        // Map files to a dictionary for easy lookup by slot ID
        const fileMap = {};
        files.forEach(f => fileMap[f.slotId] = f);

        // Iterate through fixed slots (1, 2, 3)
        this.slotsToCheck.forEach(id => {
            const saveFile = fileMap[id];
            const el = document.createElement('div');
            
            if (saveFile) {
                // --- POPULATED SLOT ---
                const dateStr = new Date(saveFile.lastModified).toLocaleDateString(undefined, { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });

                el.className = 'save-card populated';
                el.innerHTML = `
                    <div class="slot-info">
                        <div class="slot-icon"><i class="fa-solid fa-scroll"></i></div>
                        <div class="slot-meta">
                            <span class="slot-title">Save Slot ${id}</span>
                            <span class="slot-subtitle">
                                <i class="fa-regular fa-clock"></i> ${dateStr}
                            </span>
                        </div>
                    </div>
                    <div class="slot-actions">
                        <button class="btn-slot-action btn-load">Load</button>
                        
                        <!-- DELETE BUTTON ADDED HERE -->
                        <button class="btn-slot-action load-campaign-btn-delete" title="Delete Save">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;

                // Bind Load
                el.querySelector('.btn-load').addEventListener('click', () => this.loadGame(id));
                
                // Bind Delete (Triggers Modal)
                el.querySelector('.load-campaign-btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.pendingDeleteId = id;
                    this.dom.deleteNameSpan.textContent = `Slot ${id}`;
                    this.toggleModal(true);
                });

            } else {
                // --- EMPTY SLOT ---
                el.className = 'save-card empty';
                el.innerHTML = `
                    <div class="slot-info">
                        <div class="slot-icon"><i class="fa-solid fa-plus"></i></div>
                        <div class="slot-meta">
                            <span class="slot-title">Empty Slot ${id}</span>
                            <span class="slot-subtitle">No data found</span>
                        </div>
                    </div>
                    <div class="slot-actions">
                        <button class="btn-slot-action btn-create">New Campaign</button>
                    </div>
                `;

                el.querySelector('.btn-create').addEventListener('click', async () => {
                    localStorage.setItem('kaizen_target_slot', id);
                    await loadPage("./pages/games/game-modes.html");
                    initGameModes();
                });
            }

            this.dom.container.appendChild(el);
        });
    }

    loadGame(slotId) {
        // UI Feedback
        const btns = document.querySelectorAll('.btn-load');
        btns.forEach(b => { b.disabled = true; b.textContent = 'Loading...'; });
        Neutralino.extensions.dispatch(EXTENSION_ID, "loadGame", { slotId });
    }

    _onGameLoaded(e) {
        if (e.detail.success) {
            loadPage('./pages/games/world-map.html').then(() => {
                initWorldMap();
            });
        } else {
            alert("Failed to load save: " + e.detail.error);
            this.fetchSaves(); 
        }
    }

    // --- Execute Logic ---
    executeDelete() {
        if (!this.pendingDeleteId) return;
        
        // Dispatch to backend
        Neutralino.extensions.dispatch(EXTENSION_ID, "deleteSaveSlot", { slotId: this.pendingDeleteId });
        
        // Wait briefly for FS operation then refresh list
        setTimeout(() => this.fetchSaves(), 300); 
        
        this.toggleModal(false);
        this.pendingDeleteId = null;
    }

    toggleModal(show) {
        if(show) this.dom.modalDelete.classList.remove('hidden');
        else this.dom.modalDelete.classList.add('hidden');
    }
}

export function initLoadCampaign() {
    new LoadCampaignManager();
}