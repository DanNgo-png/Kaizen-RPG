import { CustomMenuManager } from "../../components/CustomMenuManager.js";
import { EXTENSION_ID } from "../../api/_extension_id.js";

export class SaveSlotMenu extends CustomMenuManager {
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
        // Read ID from the dataset we added in LoadCampaignManager
        const slotId = card.dataset.slotId;

        if (!slotId) return;

        const items = [
            {
                label: "Load Campaign",
                icon: '<i class="fa-solid fa-play"></i>',
                action: () => this._triggerLoad(slotId)
            },
            {
                label: "Rename Company",
                icon: '<i class="fa-solid fa-pen"></i>',
                action: () => {
                    if (this.callbacks.onRename) this.callbacks.onRename(slotId);
                }
            },
            {
                label: "View Settings",
                icon: '<i class="fa-solid fa-sliders"></i>',
                action: () => {
                    if (this.callbacks.onViewSettings) this.callbacks.onViewSettings(slotId);
                }
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
        Neutralino.extensions.dispatch(EXTENSION_ID, "loadGame", { slotId });
    }
}