import { EXTENSION_ID } from "../api/_extension_id.js";
import { loadPage } from "../router.js";
import { initMenuButtons } from "./playGameManager.js";
import { SaveSlotMenu } from "./load_campaign/CreateCustomMenu.js";
import { initGameModes } from "./GameModesManager.js";
import { initWorldMap } from "./world/WorldMapManager.js";
import { LoadDragLogic } from "./load_campaign/logic/DragLogic.js";
export class LoadCampaignManager {
    constructor() {
        this.dom = {
            container: document.getElementById('save-slots-container'),
            btnBack: document.getElementById('btn-back-menu'),
            btnRefresh: document.getElementById('btn-refresh-saves'),
            
            modalDelete: document.getElementById('modal-delete-save'),
            btnConfirmDelete: document.getElementById('btn-confirm-delete'),
            btnCancelDelete: document.getElementById('btn-cancel-delete'),
            deleteNameSpan: document.getElementById('delete-slot-name'),

            modalRename: document.getElementById('modal-rename-save'),
            inputRename: document.getElementById('input-rename-company'),
            btnConfirmRename: document.getElementById('btn-confirm-rename'),
            btnCancelRename: document.getElementById('btn-cancel-rename'),

            modalSettings: document.getElementById('modal-view-settings'),
            settingsContent: document.getElementById('settings-content-area'),
            btnCloseSettings: document.getElementById('btn-close-settings')
        };

        this.slotsToCheck = [1, 2, 3]; 
        this.activeSlotId = null;
        this.dragLogic = null; 

        this.menuManager = new SaveSlotMenu({
            onDelete: (slotId) => this.openDeleteModal(slotId),
            onRename: (slotId) => this.openRenameModal(slotId),
            onViewSettings: (slotId) => this.openSettingsModal(slotId),
            onReload: () => this.fetchSaves()
        });

        this.init();
    }

    init() {
        this.bindGeneralEvents();
        this.bindModalEvents();
        this.bindServerEvents();

        this.menuManager.bindToContainer(this.dom.container);
        this.fetchSaves();
    }

    bindGeneralEvents() {
        if (this.dom.btnBack) {
            this.dom.btnBack.addEventListener('click', () => {
                loadPage('./pages/games/play-game.html').then(initMenuButtons);
            });
        }
        if (this.dom.btnRefresh) {
            this.dom.btnRefresh.addEventListener('click', () => this.fetchSaves());
        }
    }

    bindModalEvents() {
        this.dom.btnCancelDelete.addEventListener('click', () => this.dom.modalDelete.classList.add('hidden'));
        this.dom.btnConfirmDelete.addEventListener('click', () => this.executeDelete());

        this.dom.btnCancelRename.addEventListener('click', () => this.dom.modalRename.classList.add('hidden'));
        this.dom.btnConfirmRename.addEventListener('click', () => this.executeRename());

        this.dom.btnCloseSettings.addEventListener('click', () => this.dom.modalSettings.classList.add('hidden'));
        
        [this.dom.modalDelete, this.dom.modalRename, this.dom.modalSettings].forEach(modal => {
            if(modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.add('hidden');
                });
            }
        });
    }

    bindServerEvents() {
        Neutralino.events.off('receiveSaveSlots', this._onReceiveSlots);
        Neutralino.events.on('receiveSaveSlots', this._onReceiveSlots.bind(this));

        Neutralino.events.off('gameLoaded', this._onGameLoaded);
        Neutralino.events.on('gameLoaded', this._onGameLoaded.bind(this));

        Neutralino.events.off('receiveSaveMetadata', this._onReceiveMetadata);
        Neutralino.events.on('receiveSaveMetadata', this._onReceiveMetadata.bind(this));
    }

    fetchSaves() {
        this.dom.container.innerHTML = `<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Reading disk...</div>`;
        Neutralino.extensions.dispatch(EXTENSION_ID, "listSaveSlots");
    }

    _onReceiveSlots(e) {
        const files = e.detail || []; 
        this.renderSlots(files);

        // Initialize Drag Logic after DOM is rendered
        if (!this.dragLogic) {
            this.dragLogic = new LoadDragLogic(this.dom.container);
        } else {
            // Re-initialize to attach listeners to new elements
            this.dragLogic.destroy();
            this.dragLogic.init();
        }
    }

    renderSlots(files) {
        this.dom.container.innerHTML = '';
        const fileMap = {};
        files.forEach(f => fileMap[f.slotId] = f);

        // 1. Render Existing Files (Sorted by backend)
        files.forEach(f => {
            this._createSlotElement(f.slotId, f);
        });

        // 2. Render Empty Slots (if they don't exist in file list)
        this.slotsToCheck.forEach(id => {
            // Check via ID string comparison
            const exists = files.some(f => String(f.slotId) === String(id));
            if (!exists) {
                this._createSlotElement(id, null);
            }
        });
    }

    _createSlotElement(id, saveFile) {
        const el = document.createElement('div');
        // Important: data-id is required by DragAndDropManager to report order
        el.dataset.id = id;
        el.dataset.slotId = id; // Kept for existing context menu logic

        if (saveFile) {
            const dateStr = new Date(saveFile.lastModified).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            const displayName = saveFile.companyName || `Save Slot ${id}`;

            el.className = 'save-card populated';
            el.innerHTML = `
                <div class="drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="slot-info">
                    <div class="slot-icon"><i class="fa-solid fa-scroll"></i></div>
                    <div class="slot-meta">
                        <span class="slot-title">${displayName}</span>
                        <span class="slot-subtitle"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                    </div>
                </div>
                <div class="slot-actions">
                    <button class="btn-slot-action btn-load">Load</button>
                    <button class="btn-slot-action load-campaign-btn-delete" title="Delete Save">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;

            el.querySelector('.btn-load').addEventListener('click', () => this.loadGame(id));
            el.querySelector('.load-campaign-btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDeleteModal(id);
            });

        } else {
            // Empty Slots
            el.className = 'save-card empty';
            el.innerHTML = `
                <div class="drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></div>
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
    }

    // --- Actions & Modals ---

    loadGame(slotId) {
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

    openDeleteModal(slotId) {
        this.activeSlotId = slotId;
        this.dom.deleteNameSpan.textContent = `Slot ${slotId}`;
        this.dom.modalDelete.classList.remove('hidden');
    }

    executeDelete() {
        if (!this.activeSlotId) return;
        Neutralino.extensions.dispatch(EXTENSION_ID, "deleteSaveSlot", { slotId: this.activeSlotId });
        setTimeout(() => this.fetchSaves(), 300); 
        this.dom.modalDelete.classList.add('hidden');
        this.activeSlotId = null;
    }

    openRenameModal(slotId) {
        this.activeSlotId = slotId;
        this.dom.inputRename.value = "";
        this.dom.modalRename.classList.remove('hidden');
        setTimeout(() => this.dom.inputRename.focus(), 100);
    }

    executeRename() {
        const newName = this.dom.inputRename.value.trim();
        if (!this.activeSlotId || !newName) return;

        Neutralino.extensions.dispatch(EXTENSION_ID, "updateCampaignSetting", {
            slotId: this.activeSlotId,
            key: 'company_name',
            value: newName
        });

        setTimeout(() => this.fetchSaves(), 200);
        this.dom.modalRename.classList.add('hidden');
    }

    openSettingsModal(slotId) {
        this.activeSlotId = slotId;
        this.dom.settingsContent.innerHTML = `<div style="padding:20px; color:#9ca3af;"><i class="fa-solid fa-circle-notch fa-spin"></i> Reading database...</div>`;
        this.dom.modalSettings.classList.remove('hidden');
        Neutralino.extensions.dispatch(EXTENSION_ID, "getSaveMetadata", { slotId });
    }

    _onReceiveMetadata(e) {
        const data = e.detail;
        if (data.slotId != this.activeSlotId) return;

        const fields = [
            { label: 'Origin', value: this._formatOrigin(data.origin) },
            { label: 'Company Name', value: data.company_name || 'Unknown' },
            { label: 'Gold Crowns', value: data.gold || 0 },
            { label: 'Current Day', value: data.day || 1 },
            { label: 'Map Seed', value: data.map_seed || 'N/A' },
            { label: 'Economy', value: data.difficulty_eco || 'Normal' },
            { label: 'Combat', value: data.difficulty_com || 'Normal' },
        ];

        let html = '<div class="settings-grid-view">';
        fields.forEach(f => {
            html += `
                <div class="setting-item">
                    <span class="setting-label">${f.label}</span>
                    <span class="setting-value">${f.value}</span>
                </div>
            `;
        });
        html += '</div>';

        this.dom.settingsContent.innerHTML = html;
    }

    _formatOrigin(modeId) {
        if (!modeId) return 'Unknown';
        const map = {
            'sellswords': 'The Sellswords',
            'empire': 'Empire Builder',
            'lonewolf': 'Lone Wolf',
            'ironman': 'Ironman Patrol',
            'dungeon': 'Dungeon Crawler'
        };
        return map[modeId] || modeId.charAt(0).toUpperCase() + modeId.slice(1);
    }
}

export function initLoadCampaign() {
    new LoadCampaignManager();
}