/**
 * Generic Drag and Drop Manager with FLIP animations.
 * Provides a modern, tactile feel similar to mobile UI frameworks.
 */
export class DragAndDropManager {
    /**
     * @param {Object} config
     * @param {HTMLElement} config.container - The parent element containing items.
     * @param {string} config.itemSelector - CSS selector for draggable items (e.g., '.list-item').
     * @param {string} [config.handleSelector] - Optional selector for a specific drag handle inside the item.
     * @param {boolean} [config.enableLongPress] - If true, requires a hold delay before dragging starts (mobile style).
     * @param {Function} [config.onReorder] - Callback(newOrderIds) when drag ends.
     */
    constructor(config) {
        this.container = config.container;
        this.itemSelector = config.itemSelector;
        this.handleSelector = config.handleSelector || null;
        this.enableLongPress = config.enableLongPress || false;
        this.onReorder = config.onReorder || (() => {});

        // Configuration Constants
        this.LONG_PRESS_DURATION = 200;
        this.SCROLL_THRESHOLD = 5;

        // State
        this.pressTimer = null;
        this.isDragging = false;
        this.startY = 0;
        this.offsetY = 0;
        this.draggedElement = null;
        this.avatar = null;
        this.placeholder = null;

        // Bindings
        this._bindStart = this._handlePressStart.bind(this);
        this._bindMove = this._onDragMove.bind(this);
        this._bindEnd = this._onDragEnd.bind(this);
        this._bindCancel = this._cancelPress.bind(this);
        this._bindCheckMove = this._checkMovement.bind(this);

        this.init();
    }

    init() {
        if (!this.container) return;
        
        // Use event delegation for dynamic lists
        this.container.addEventListener('mousedown', this._bindStart);
        this.container.addEventListener('touchstart', this._bindStart, { passive: false });
    }

    destroy() {
        if (!this.container) return;
        this.container.removeEventListener('mousedown', this._bindStart);
        this.container.removeEventListener('touchstart', this._bindStart);
        this._removeTempListeners();
    }

    _handlePressStart(e) {
        // Find the closest item
        const item = e.target.closest(this.itemSelector);
        if (!item || !this.container.contains(item)) return;

        // Handle Selector Check
        if (this.handleSelector) {
            if (!e.target.closest(this.handleSelector)) return;
        }

        // Prevent default text selection
        if (e.type === 'mousedown' && e.button !== 0) return; // Only left click

        this.draggedElement = item;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const rect = item.getBoundingClientRect();

        this.startY = clientY;
        this.offsetY = clientY - rect.top;

        if (this.enableLongPress) {
            this.pressTimer = setTimeout(() => {
                this.startDrag(e);
            }, this.LONG_PRESS_DURATION);
            
            // Add visual feedback class for "pressing"
            item.classList.add('is-pressing');
        } else {
            this.startDrag(e);
        }

        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';
        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';

        // Important: Bind cancel listener to catch early release (before long press time)
        document.addEventListener(upEvent, this._bindCancel, { once: true });
        document.addEventListener(moveEvent, this._bindCheckMove, { passive: false });
    }

    _checkMovement(e) {
        if (this.isDragging) return;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        // If moved too much before long press triggers, cancel it (it's a scroll or click)
        if (Math.abs(clientY - this.startY) > this.SCROLL_THRESHOLD) {
            this._cancelPress();
        }
    }

    _cancelPress() {
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
        if (this.draggedElement) {
            this.draggedElement.classList.remove('is-pressing');
            this.draggedElement = null;
        }
        document.removeEventListener('mousemove', this._bindCheckMove);
        document.removeEventListener('touchmove', this._bindCheckMove);
    }

    startDrag(e) {
        if (this.pressTimer) clearTimeout(this.pressTimer);
        
        // Prevent scrolling on touch
        if (e.cancelable && e.type === 'touchmove') e.preventDefault();

        this.isDragging = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        // 1. Create Placeholder (keeps layout flow)
        const rect = this.draggedElement.getBoundingClientRect();
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'dnd-placeholder';
        this.placeholder.style.height = `${rect.height}px`;
        this.placeholder.style.width = '100%';
        this.placeholder.style.margin = getComputedStyle(this.draggedElement).margin;
        this.placeholder.style.opacity = '0';
        
        // 2. Create Avatar (floating element)
        this.avatar = this.draggedElement.cloneNode(true);
        this.avatar.classList.add('dnd-avatar');
        this.avatar.classList.remove('is-pressing');
        
        // Style Avatar
        Object.assign(this.avatar.style, {
            position: 'fixed',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            zIndex: '9999',
            pointerEvents: 'none',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            opacity: '0.9',
            transform: 'scale(1.02)',
            transition: 'box-shadow 0.2s, transform 0.2s' // Smooth lift
        });

        document.body.appendChild(this.avatar);
        
        // 3. Swap Element with Placeholder
        this.container.insertBefore(this.placeholder, this.draggedElement);
        this.draggedElement.style.display = 'none'; // Hide original

        // 4. Setup Drag Listeners
        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';
        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';

        // Cleanup the "pre-drag" listeners to avoid conflict
        document.removeEventListener('mousemove', this._bindCheckMove);
        document.removeEventListener('touchmove', this._bindCheckMove);
        
        // FIX: Remove the cancel listener so mouseup doesn't trigger _cancelPress
        document.removeEventListener('mouseup', this._bindCancel);
        document.removeEventListener('touchend', this._bindCancel);
        
        document.addEventListener(moveEvent, this._bindMove, { passive: false });
        document.addEventListener(upEvent, this._bindEnd);
    }

    _onDragMove(e) {
        if (!this.isDragging) return;
        if (e.cancelable) e.preventDefault();

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;

        // Move Avatar
        const newTop = clientY - this.offsetY;
        this.avatar.style.top = `${newTop}px`;

        // Detection Logic: Find element under cursor
        // Hide avatar momentarily so elementFromPoint sees what's underneath
        this.avatar.style.display = 'none';
        const elementUnder = document.elementFromPoint(clientX, clientY);
        this.avatar.style.display = '';

        const targetItem = elementUnder ? elementUnder.closest(this.itemSelector) : null;

        // Reordering Logic
        if (targetItem && targetItem !== this.placeholder && targetItem !== this.draggedElement && this.container.contains(targetItem)) {
            const box = targetItem.getBoundingClientRect();
            const boxCenter = box.top + (box.height / 2);
            const moveUp = clientY < boxCenter;

            // FLIP Animation Helper
            this._animateSwap(() => {
                if (moveUp) {
                    this.container.insertBefore(this.placeholder, targetItem);
                } else {
                    this.container.insertBefore(this.placeholder, targetItem.nextSibling);
                }
            });
        }
    }

    /**
     * Executes a DOM change while animating the siblings using FLIP technique.
     */
    _animateSwap(domAction) {
        // 1. First: Measure positions
        const siblings = Array.from(this.container.querySelectorAll(this.itemSelector));
        const positions = new Map();
        siblings.forEach(el => {
            if (el !== this.draggedElement) {
                positions.set(el, el.getBoundingClientRect().top);
            }
        });

        // 2. Do DOM Change
        domAction();

        // 3. Last: Measure new positions and animate
        siblings.forEach(el => {
            if (el !== this.draggedElement) {
                const oldTop = positions.get(el);
                const newTop = el.getBoundingClientRect().top;
                const delta = oldTop - newTop;

                if (delta !== 0) {
                    // Invert
                    el.style.transform = `translateY(${delta}px)`;
                    el.style.transition = 'none';
                    
                    // Force Layout
                    void el.offsetHeight; 

                    // Play
                    el.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)';
                    el.style.transform = '';

                    const cleanup = () => {
                        el.style.transition = '';
                        el.style.transform = '';
                        el.removeEventListener('transitionend', cleanup);
                    };
                    el.addEventListener('transitionend', cleanup);
                }
            }
        });
    }

    _onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        // Remove Global Listeners
        this._removeTempListeners();
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Animate Avatar dropping into place
        if (this.placeholder && this.avatar) {
            const destRect = this.placeholder.getBoundingClientRect();
            
            this.avatar.style.transition = 'top 0.2s ease, left 0.2s ease, transform 0.2s';
            this.avatar.style.top = `${destRect.top}px`;
            this.avatar.style.left = `${destRect.left}px`;
            this.avatar.style.transform = 'scale(1)';
        }

        // Commit changes after animation
        setTimeout(() => {
            // FIX: Add safety check for draggedElement and placeholder validity
            if (!this.draggedElement || !this.placeholder || !this.placeholder.parentNode) {
                // If state is corrupt, just cleanup what we can
                if(this.avatar) this.avatar.remove();
                if(this.placeholder) this.placeholder.remove();
                if(this.draggedElement) {
                    this.draggedElement.style.display = '';
                    this.draggedElement.classList.remove('is-pressing');
                }
                return;
            }

            // Swap placeholder with real element
            this.container.insertBefore(this.draggedElement, this.placeholder);
            this.placeholder.remove();
            this.avatar.remove();
            
            this.draggedElement.style.display = '';
            this.draggedElement.classList.remove('is-pressing');

            // Collect IDs for callback
            const newOrder = Array.from(this.container.querySelectorAll(this.itemSelector))
                .map(el => el.dataset.id)
                .filter(id => id !== undefined);

            this.onReorder(newOrder);

            // Cleanup state
            this.draggedElement = null;
            this.placeholder = null;
            this.avatar = null;
        }, 200);
    }

    _removeTempListeners() {
        document.removeEventListener('mouseup', this._bindCancel);
        document.removeEventListener('touchend', this._bindCancel);
        document.removeEventListener('mousemove', this._bindMove);
        document.removeEventListener('touchmove', this._bindMove);
        document.removeEventListener('mouseup', this._bindEnd);
        document.removeEventListener('touchend', this._bindEnd);
    }
}