import { DragAndDropManager } from "../../../components/DragAndDropManager.js";
import { EXTENSION_ID } from "../../../api/_extension_id.js";

export class LoadDragLogic extends DragAndDropManager {
    constructor(container) {
        super({
            container: container,
            itemSelector: '.save-card', 
            handleSelector: '.drag-handle', // Only drag when clicking the grip icon
            enableLongPress: false, // Desktop-first preference: instant drag on handle
            onReorder: (newOrderIds) => {
                // IDs in DOM are slot IDs (e.g. "1", "2")
                Neutralino.extensions.dispatch(EXTENSION_ID, "saveSlotOrder", { order: newOrderIds });
            }
        });
    }

    // Optional: Override animations or behaviors specific to this page if needed
    // The base class handles FLIP animations automatically.
}