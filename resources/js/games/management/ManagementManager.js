import { GameAPI } from "../../api/GameAPI.js";
import { RosterUI } from "./RosterUI.js";
import { CharacterSheetUI } from "./CharacterSheetUI.js";
import { InventoryUI } from "./InventoryUI.js";
import { initWorldMap } from "../world/WorldMapManager.js";
import { loadPage } from "../../router.js";

export class ManagementManager {
    constructor() {
        this.data = {
            mercenaries: [],
            inventory: [],
            resources: { gold: 0 }
        };
        
        this.state = {
            selectedMercId: null,
            filter: 'all'
        };

        // Initialize Sub-components
        this.rosterUI = new RosterUI((id) => this.selectMercenary(id));
        this.charUI = new CharacterSheetUI();
        this.inventoryUI = new InventoryUI();

        this.init();
    }

    init() {
        // Events
        Neutralino.events.off('receivePartyData', this._onDataReceived);
        Neutralino.events.on('receivePartyData', this._onDataReceived.bind(this));

        // Back Button
        document.getElementById('btn-back-map')?.addEventListener('click', async () => {
            await loadPage('./pages/games/world-map.html');
            initWorldMap();
        });

        // Request Data
        GameAPI.getPartyData();
    }

    _onDataReceived(e) {
        const payload = e.detail;
        if (!payload) return;

        this.data = payload;
        
        // Update Resource Header
        document.getElementById('mgmt-gold').textContent = this.data.resources.gold || 0;
        document.getElementById('mgmt-roster-count').textContent = `${this.data.mercenaries.length} / 12`;

        // Render Roster
        this.rosterUI.render(this.data.mercenaries);

        // Select first merc if none selected
        if (!this.state.selectedMercId && this.data.mercenaries.length > 0) {
            this.selectMercenary(this.data.mercenaries[0].id);
        } else {
            // Re-render current selection to update stats/equip
            this.selectMercenary(this.state.selectedMercId);
        }

        // Render Inventory
        this.inventoryUI.render(this.data.inventory || [], this.state.filter);
    }

    selectMercenary(id) {
        this.state.selectedMercId = id;
        const merc = this.data.mercenaries.find(m => m.id === id);
        
        this.rosterUI.highlight(id);
        this.charUI.render(merc);
    }
}

export function initManagement() {
    new ManagementManager();
}