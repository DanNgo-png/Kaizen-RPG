import { GameAPI } from "../../api/GameAPI.js";
import { RosterUI } from "./RosterUI.js";
import { CharacterSheetUI } from "./CharacterSheetUI.js";
import { InventoryUI } from "./InventoryUI.js";
// import { initWorldMap } from "../world/WorldMapManager.js"; // Removed: No longer navigating back

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

        // OLD: Back Button navigating to page
        // document.getElementById('btn-back-map')?.addEventListener('click', ... );

        // NEW: Back/Close Button logic is handled by WorldMapManager toggling the modal class.
        // We can just ensure data is fetched when initialized.
        this.refresh();
    }

    refresh() {
        // Request Fresh Data
        GameAPI.getPartyData();
    }

    _onDataReceived(e) {
        const payload = e.detail;
        if (!payload) return;

        this.data = payload;
        
        // Update Resource Header
        const elGold = document.getElementById('mgmt-gold');
        const elRoster = document.getElementById('mgmt-roster-count');
        
        if (elGold) elGold.textContent = this.data.resources.gold || 0;
        if (elRoster) elRoster.textContent = `${this.data.mercenaries.length} / 12`;

        // Render Roster
        this.rosterUI.render(this.data.mercenaries);

        // Select first merc if none selected or selection invalid
        const validSelection = this.data.mercenaries.find(m => m.id === this.state.selectedMercId);
        
        if ((!this.state.selectedMercId || !validSelection) && this.data.mercenaries.length > 0) {
            this.selectMercenary(this.data.mercenaries[0].id);
        } else if (this.state.selectedMercId) {
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

// Return instance to allow external refresh calls
export function initManagement() {
    return new ManagementManager();
}