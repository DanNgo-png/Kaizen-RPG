import { GameAPI } from "../../api/GameAPI.js";
import { EXTENSION_ID } from "../../api/_extension_id.js";
import { RosterUI } from "./RosterUI.js";
import { CharacterSheetUI } from "./CharacterSheetUI.js";
import { InventoryUI } from "./InventoryUI.js";

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
        
        // Pass drag and drop equip callback
        this.charUI = new CharacterSheetUI({
            onEquip: (invId, mercId, slotName) => {
                GameAPI.equipItem(invId, mercId, slotName);
            }
        });
        
        // Pass drag and drop callback to inventory
        this.inventoryUI = new InventoryUI({
            onItemMoved: (invId, newSlot, source) => {
                if (source === 'equip') {
                    // Item was dragged from the paper doll
                    GameAPI.unequipItem(invId, newSlot);
                } else {
                    // Item was just moved around inside the stash
                    Neutralino.extensions.dispatch(EXTENSION_ID, "moveInventoryItem", {
                        inventoryId: invId,
                        newSlotIndex: newSlot
                    });
                }
            }
        });

        this.init();
    }

    init() {
        Neutralino.events.off('receivePartyData', this._onDataReceived);
        Neutralino.events.on('receivePartyData', this._onDataReceived.bind(this));

        this.refresh();
    }

    refresh() {
        GameAPI.getPartyData();
    }

    _onDataReceived(e) {
        const payload = e.detail;
        if (!payload) return;

        this.data = payload;
        
        const elGold = document.getElementById('mgmt-gold');
        const elRoster = document.getElementById('mgmt-roster-count');
        
        if (elGold) elGold.textContent = this.data.resources.gold || 0;
        if (elRoster) elRoster.textContent = `${this.data.mercenaries.length} / 12`;

        this.rosterUI.render(this.data.mercenaries);

        const validSelection = this.data.mercenaries.find(m => m.id === this.state.selectedMercId);
        
        if ((!this.state.selectedMercId || !validSelection) && this.data.mercenaries.length > 0) {
            this.selectMercenary(this.data.mercenaries[0].id);
        } else if (this.state.selectedMercId) {
            this.selectMercenary(this.state.selectedMercId);
        }

        // Pass enriched inventory data
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
    return new ManagementManager();
}