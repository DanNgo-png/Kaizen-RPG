import { DragAndDropManager } from "../../../../components/DragAndDropManager.js";
import { UI_CONFIG, CSS_CLASSES } from "../../data/GameModeConfig.js";

export class DragLogic extends DragAndDropManager {
    constructor(container, callbacks) {
        const onReorder = typeof callbacks === 'function' ? callbacks : callbacks.onReorder;
        const extraCallbacks = typeof callbacks === 'object' ? callbacks : {};

        super({
            container: container,
            itemSelector: '.mode-list-item', 
            handleSelector: null, // Whole card is handle
            enableLongPress: true,
            onReorder: onReorder
        });

        this.longPressDuration = UI_CONFIG.DRAG_PRESS_DURATION_MS;
        
        this.externalOnDragStart = extraCallbacks.onDragStart;
        this.externalOnDragEnd = extraCallbacks.onDragEnd;
    }

    _handlePressStart(e) {
        super._handlePressStart(e);

        if (this.draggedElement) {
            this.draggedElement.style.setProperty('--press-duration', `${this.longPressDuration}ms`);
            this.draggedElement.classList.add(CSS_CLASSES.LOADING);
        }
    }

    _cancelPress() {
        if (this.draggedElement) {
            this.draggedElement.style.removeProperty('--press-duration');
            this.draggedElement.classList.remove(CSS_CLASSES.LOADING);
        }
        super._cancelPress();
    }

    startDrag(e) {
        if (navigator.vibrate) navigator.vibrate(20);

        if (this.draggedElement) {
            this.draggedElement.classList.remove(CSS_CLASSES.LOADING);
        }

        if (this.externalOnDragStart) this.externalOnDragStart();

        super.startDrag(e);
    }

    _onDragEnd() {
        super._onDragEnd();
        
        setTimeout(() => {
            if (this.externalOnDragEnd) this.externalOnDragEnd();
        }, UI_CONFIG.DRAG_END_DELAY_MS);
    }
}