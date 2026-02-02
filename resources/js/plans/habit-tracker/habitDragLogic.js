export const HabitDragLogic = {
    // Configuration
    LONG_PRESS_DURATION: 150, // Shorter press for rows
    SCROLL_THRESHOLD: 5,

    // State
    pressTimer: null,
    isDragging: false,
    startY: 0, 
    offsetY: 0, 
    
    // DOM References
    draggedElement: null,
    avatar: null,
    placeholder: null,
    container: null, // The specific .stack-body being dragged in
    onOrderChange: null, // Callback to save global order

    init(boardElement, onOrderChange) {
        this.onOrderChange = onOrderChange;
        
        // Use delegation on the main board to catch events on rows
        if (this._boundStart) {
            boardElement.removeEventListener('mousedown', this._boundStart);
            boardElement.removeEventListener('touchstart', this._boundStart);
        }

        this._boundStart = (e) => this.handlePressStart(e);
        
        boardElement.addEventListener('mousedown', this._boundStart);
        boardElement.addEventListener('touchstart', this._boundStart, { passive: false });
    },

    // --- NEW HELPER: Get correct bounds for display:contents elements ---
    _getRobustRect(element) {
        const style = window.getComputedStyle(element);
        
        // If not display: contents, standard rect is fine
        if (style.display !== 'contents') {
            return element.getBoundingClientRect();
        }
        
        // For display: contents, calculate union of children rects
        let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
        const children = Array.from(element.children);
        
        if (children.length === 0) return element.getBoundingClientRect();

        let hasValidChild = false;
        children.forEach(child => {
            const r = child.getBoundingClientRect();
            // Skip hidden elements if they have no dimension
            if (r.width === 0 && r.height === 0) return;
            
            hasValidChild = true;
            if (r.left < minLeft) minLeft = r.left;
            if (r.top < minTop) minTop = r.top;
            if (r.right > maxRight) maxRight = r.right;
            if (r.bottom > maxBottom) maxBottom = r.bottom;
        });
        
        // Fallback if children calculation failed
        if (!hasValidChild) return element.getBoundingClientRect();

        return {
            left: minLeft,
            top: minTop,
            right: maxRight,
            bottom: maxBottom,
            width: maxRight - minLeft,
            height: maxBottom - minTop
        };
    },

    handlePressStart(e) {
        const row = e.target.closest('.habit-row');
        if (!row) return;

        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I' || e.target.closest('button')) return;
        if (e.type === 'mousedown' && e.button !== 0) return;

        this.isDragging = false;
        this.draggedElement = row;
        this.container = row.parentElement; 

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        // Use robust rect calculation
        const rect = this._getRobustRect(row);
        
        this.startY = clientY;
        this.offsetY = clientY - rect.top;

        row.classList.add('is-pressing');

        this.pressTimer = setTimeout(() => {
            this.startDrag(e);
        }, this.LONG_PRESS_DURATION);

        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';
        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';

        this._boundCancel = this.cancelPress.bind(this);
        this._boundMoveCheck = this.checkMovement.bind(this);

        document.addEventListener(upEvent, this._boundCancel, { once: true });
        document.addEventListener(moveEvent, this._boundMoveCheck, { passive: false });
    },

    checkMovement(e) {
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        if (Math.abs(clientY - this.startY) > this.SCROLL_THRESHOLD) {
            this.cancelPress();
        }
    },

    cancelPress() {
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
        if (this.draggedElement) {
            this.draggedElement.classList.remove('is-pressing');
        }
        this._removeTempListeners();
    },

    _removeTempListeners() {
        document.removeEventListener('mouseup', this._boundCancel);
        document.removeEventListener('touchend', this._boundCancel);
        document.removeEventListener('mousemove', this._boundMoveCheck);
        document.removeEventListener('touchmove', this._boundMoveCheck);
    },

    startDrag(e) {
        if (e.cancelable && e.preventDefault) e.preventDefault();
        
        this.isDragging = true;
        document.body.style.cursor = 'grabbing';
        
        // Use robust rect for positioning
        const rect = this._getRobustRect(this.draggedElement);

        // Placeholder
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'row-placeholder'; 
        this.placeholder.style.gridColumn = "1 / -1";
        this.placeholder.style.height = `${rect.height}px`;
        this.placeholder.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        this.placeholder.style.border = '1px dashed rgba(255, 255, 255, 0.1)';
        
        // Avatar
        this.avatar = this.draggedElement.cloneNode(true);
        this.avatar.classList.add('row-drag-avatar');
        this.avatar.classList.remove('is-pressing'); 
        this.avatar.classList.remove('habit-row');
        
        // Apply Styles
        Object.assign(this.avatar.style, {
            position: 'fixed',
            zIndex: '9999',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            margin: '0', // Important: Clear margins
            boxSizing: 'border-box',
            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            transform: 'scale(1.02)',
            pointerEvents: 'none',
            display: 'grid',
            alignItems: 'center'
        });
        
        // Copy Grid Layout from Container
        const computedStyle = window.getComputedStyle(this.container);
        this.avatar.style.gridTemplateColumns = computedStyle.gridTemplateColumns;
        this.avatar.style.columnGap = computedStyle.columnGap;
        
        document.body.appendChild(this.avatar);
        this.container.insertBefore(this.placeholder, this.draggedElement);
        this.draggedElement.style.display = 'none';
        
        if (navigator.vibrate) navigator.vibrate(10);

        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';
        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';

        this._boundDragMove = this.onDragMove.bind(this);
        this._boundDragEnd = this.onDragEnd.bind(this);

        document.addEventListener(moveEvent, this._boundDragMove, { passive: false });
        document.addEventListener(upEvent, this._boundDragEnd);
        
        this._removeTempListeners();
    },

    onDragMove(e) {
        if (!this.isDragging) return;
        if (e.cancelable) e.preventDefault(); 

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        
        // Move Avatar
        const newTop = clientY - this.offsetY;
        this.avatar.style.top = `${newTop}px`;

        // Detection
        this.avatar.style.display = 'none';
        const elementUnder = document.elementFromPoint(clientX, clientY);
        this.avatar.style.display = 'grid'; 

        const targetRow = elementUnder ? elementUnder.closest('.habit-row') : null;

        // Reorder Logic
        if (targetRow && targetRow !== this.placeholder && targetRow !== this.draggedElement && targetRow.parentElement === this.container) {
            const box = targetRow.getBoundingClientRect();
            const boxCenter = box.top + (box.height / 2);
            
            const moveUp = clientY < boxCenter;
            
            if (moveUp) {
                this.container.insertBefore(this.placeholder, targetRow);
            } else {
                this.container.insertBefore(this.placeholder, targetRow.nextSibling);
            }
        }
    },

    onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.style.cursor = '';

        // Animation Snap
        const destRect = this.placeholder.getBoundingClientRect();
        this.avatar.style.transition = 'top 0.1s, left 0.1s';
        this.avatar.style.top = `${destRect.top}px`;
        this.avatar.style.left = `${destRect.left}px`;

        setTimeout(() => {
            if (this.placeholder.parentNode) {
                this.container.insertBefore(this.draggedElement, this.placeholder);
                this.placeholder.remove();
            }
            
            this.draggedElement.style.display = '';
            this.draggedElement.classList.remove('is-pressing');
            this.avatar.remove();

            this._saveOrder();

            // Cleanup
            this.avatar = null;
            this.placeholder = null;
            this.draggedElement = null;
            this.container = null;

        }, 100);

        document.removeEventListener('mousemove', this._boundDragMove);
        document.removeEventListener('touchmove', this._boundDragMove);
        document.removeEventListener('mouseup', this._boundDragEnd);
        document.removeEventListener('touchend', this._boundDragEnd);
    },

    _saveOrder() {
        if (!this.onOrderChange) return;
        
        const allRows = document.querySelectorAll('.habit-row');
        const newOrder = Array.from(allRows)
            .map(row => row.dataset.habitId)
            .filter(id => id);

        this.onOrderChange(newOrder);
    }
};