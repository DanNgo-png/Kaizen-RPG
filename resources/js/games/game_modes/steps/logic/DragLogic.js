import { DragAndDropManager } from "../../../../components/DragAndDropManager.js";

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

        this.LONG_PRESS_DURATION = 200; 
        
        this.externalOnDragStart = extraCallbacks.onDragStart;
        this.externalOnDragEnd = extraCallbacks.onDragEnd;
    }

    _handlePressStart(e) {
        super._handlePressStart(e);

        if (this.draggedElement) {
            this.draggedElement.style.setProperty('--press-duration', `${this.LONG_PRESS_DURATION}ms`);
            this.draggedElement.classList.add('mode-reorder-charging');
        }
    }

    _cancelPress() {
        if (this.draggedElement) {
            this.draggedElement.style.removeProperty('--press-duration');
            this.draggedElement.classList.remove('mode-reorder-charging');
        }
        super._cancelPress();
    }

    startDrag(e) {
        if (navigator.vibrate) navigator.vibrate(20);

        if (this.draggedElement) {
            this.draggedElement.classList.remove('mode-reorder-charging');
        }

        if (this.externalOnDragStart) this.externalOnDragStart();

        super.startDrag(e);
    }

    _onDragEnd() {
        super._onDragEnd();
        
        setTimeout(() => {
            if (this.externalOnDragEnd) this.externalOnDragEnd();
        }, 250);
    }
}