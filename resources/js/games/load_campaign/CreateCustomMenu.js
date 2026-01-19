import { CustomMenuManager } from "../../components/CustomMenuManager.js";
import { EXTENSION_ID } from "../../api/_extension_id.js";

export class SaveSlotMenu extends CustomMenuManager {
    /**
     * @param {Object} callbacks - Interaction hooks
     * @param {Function} callbacks.onDelete - (slotId) => void
     * @param {Function} callbacks.onReload - () => void
     */
    constructor(callbacks) {
        super();
        this.callbacks = callbacks || {};
    }

    bindToContainer(containerEl) {
        if (!containerEl) return;

        containerEl.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.save-card');
            
            // Only show menu for populated slots
            if (card && card.classList.contains('populated')) {
                this._handleContext(e, card);
            }
        });
    }

    _handleContext(e, card) {
        // --- FIX: Read the ID from the dataset, not the text content ---
        const slotId = card.dataset.slotId;

        if (!slotId) {
            console.error("SaveSlotMenu: No slot ID found on card element.");
            return;
        }

        const items = [
            {
                label: "Load Campaign",
                icon: '<i class="fa-solid fa-play"></i>',
                action: () => this._triggerLoad(slotId)
            },
            {
                label: "Rename Company",
                icon: '<i class="fa-solid fa-pen"></i>',
                action: () => this._renameCompany(slotId)
            },
            {
                label: "View Settings",
                icon: '<i class="fa-solid fa-sliders"></i>',
                action: () => this._viewSettings(slotId)
            },
            { separator: true },
            {
                label: "Delete Save",
                icon: '<i class="fa-solid fa-trash"></i>',
                danger: true,
                action: () => {
                    if (this.callbacks.onDelete) this.callbacks.onDelete(slotId);
                }
            }
        ];

        this.show(e, items);
    }

    _triggerLoad(slotId) {
        // UI Feedback can be added here if desired, but usually 
        // the main manager handles the event flow once data is sent.
        Neutralino.extensions.dispatch(EXTENSION_ID, "loadGame", { slotId });
    }

    async _renameCompany(slotId) {
        const newName = prompt("Enter new company name:");
        
        if (newName && newName.trim()) {
            try {
                await Neutralino.extensions.dispatch(EXTENSION_ID, "updateCampaignSetting", {
                    slotId: slotId,
                    key: 'company_name',
                    value: newName.trim()
                });

                if (this.callbacks.onReload) this.callbacks.onReload();
            } catch (err) {
                console.error("Failed to rename save:", err);
            }
        }
    }

    async _viewSettings(slotId) {
        // Setup listener for the response
        const responseHandler = (e) => {
            const data = e.detail;
            
            // Verify we got the right slot's data (loose comparison for string/int safety)
            if (data && data.slotId == slotId) {
                Neutralino.events.off('receiveSaveMetadata', responseHandler);
                
                const info = `
                    Map Seed: ${data.map_seed || 'N/A'}
                    Economic Difficulty: ${data.difficulty_eco || 'Unknown'}
                    Combat Difficulty: ${data.difficulty_com || 'Unknown'}
                    Current Day: ${data.day || 1}
                    Gold: ${data.gold || 0}
                `.replace(/^\s+/gm, ''); 

                alert(`Campaign Settings (Slot ${slotId}):\n\n${info}`);
            }
        };

        Neutralino.events.on('receiveSaveMetadata', responseHandler);

        // Request Data
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getSaveMetadata", { slotId });
    }
}