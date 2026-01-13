/**
 * dragLogic.js
 * Smoother drag with FLIP animations for shifting items.
 */

export const StackDragLogic = {
    // Configuration
    LONG_PRESS_DURATION: 300,
    SCROLL_THRESHOLD: 10,

    // State
    pressTimer: null,
    isDragging: false,
    startY: 0, 
    offsetY: 0, 
    
    // DOM References
    draggedElement: null,
    avatar: null,
    placeholder: null,
    container: null,

    init(containerElement) {
        this.container = containerElement;
        const headers = this.container.querySelectorAll('.stack-header');
        
        headers.forEach(header => {
            const stack = header.closest('.habit-stack');
            if(stack) {
                header.addEventListener('mousedown', (e) => this.handlePressStart(e, stack));
                header.addEventListener('touchstart', (e) => this.handlePressStart(e, stack), { passive: false });
            }
        });
    },

    handlePressStart(e, stackElement) {
        if (e.type === 'mousedown' && e.button !== 0) return;

        this.isDragging = false;
        this.draggedElement = stackElement;
        
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const rect = stackElement.getBoundingClientRect();
        
        this.startY = clientY;
        this.offsetY = clientY - rect.top;

        stackElement.classList.add('is-pressing');

        this.pressTimer = setTimeout(() => {
            this.startDrag(e);
        }, this.LONG_PRESS_DURATION);

        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';
        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';

        this._boundCancel = this.cancelPress.bind(this);
        this._boundMoveCheck = this.checkMovement.bind(this);

        document.addEventListener(upEvent, this._boundCancel);
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
        if (e.cancelable) e.preventDefault();
        
        this.isDragging = true;
        document.body.classList.add('is-dragging-stack');
        
        const rect = this.draggedElement.getBoundingClientRect();

        // 1. Create Placeholder
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'habit-stack stack-placeholder';
        this.placeholder.style.height = `${rect.height}px`;
        
        // 2. Create Avatar
        this.avatar = this.draggedElement.cloneNode(true);
        this.avatar.classList.add('stack-drag-avatar');
        this.avatar.classList.remove('is-pressing'); 
        
        this.avatar.style.width = `${rect.width}px`;
        this.avatar.style.height = `${rect.height}px`;
        this.avatar.style.top = `${rect.top}px`;
        this.avatar.style.left = `${rect.left}px`;
        
        // 3. Swap in DOM
        document.body.appendChild(this.avatar);
        this.container.insertBefore(this.placeholder, this.draggedElement);
        this.draggedElement.style.display = 'none';
        
        if (navigator.vibrate) navigator.vibrate(20);

        // 4. Bind Listeners
        const moveEvent = e.type.includes('mouse') ? 'mousemove' : 'touchmove';
        const upEvent = e.type.includes('mouse') ? 'mouseup' : 'touchend';

        this._boundDragMove = this.onDragMove.bind(this);
        this._boundDragEnd = this.onDragEnd.bind(this);

        document.addEventListener(moveEvent, this._boundDragMove, { passive: false });
        document.addEventListener(upEvent, this._boundDragEnd);
        
        this._removeTempListeners();
    },

    /**
     * FLIP Animation Helper
     * Captures positions, executes the DOM change callback, then animates the difference.
     */
    _withFlipAnimation(domChangeCallback) {
        // 1. First (Snapshot positions)
        const siblings = Array.from(this.container.querySelectorAll('.habit-stack'));
        const positions = new Map();
        siblings.forEach(el => positions.set(el, el.getBoundingClientRect().top));

        // 2. Execute DOM Change
        domChangeCallback();

        // 3. Last & Invert & Play
        siblings.forEach(el => {
            const oldTop = positions.get(el);
            const newTop = el.getBoundingClientRect().top;
            const delta = oldTop - newTop;

            if (delta !== 0) {
                // Invert: translate back to old position instantly
                el.style.transform = `translateY(${delta}px)`;
                el.style.transition = 'none';
                
                // Force Reflow
                void el.offsetHeight; 

                // Play: Animate to new position (0)
                // Use a spring-like cubic-bezier for that "flutter" feel
                el.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)';
                el.style.transform = '';

                // Clean up styles after animation matches duration
                const cleanup = () => {
                    el.style.transition = '';
                    el.style.transform = '';
                    el.removeEventListener('transitionend', cleanup);
                };
                el.addEventListener('transitionend', cleanup);
            }
        });
    },

    onDragMove(e) {
        if (!this.isDragging) return;
        if (e.cancelable) e.preventDefault(); 

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;

        // 1. Move Avatar
        const newTop = clientY - this.offsetY;
        this.avatar.style.top = `${newTop}px`;

        // 2. Detect Reorder
        this.avatar.style.display = 'none';
        const elementUnder = document.elementFromPoint(clientX, clientY);
        this.avatar.style.display = ''; 

        const targetStack = elementUnder ? elementUnder.closest('.habit-stack') : null;

        if (targetStack && targetStack !== this.placeholder && targetStack !== this.draggedElement) {
            const box = targetStack.getBoundingClientRect();
            const boxCenter = box.top + (box.height / 2);
            
            // Determine Direction
            const moveUp = clientY < boxCenter;
            
            // Wrap the DOM move in FLIP animation
            this._withFlipAnimation(() => {
                if (moveUp) {
                    this.container.insertBefore(this.placeholder, targetStack);
                } else {
                    this.container.insertBefore(this.placeholder, targetStack.nextSibling);
                }
            });
        }
    },

    onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        document.body.classList.remove('is-dragging-stack');

        this.avatar.classList.add('dropping');
        
        const destRect = this.placeholder.getBoundingClientRect();
        this.avatar.style.top = `${destRect.top}px`;
        this.avatar.style.left = `${destRect.left}px`;
        this.avatar.style.transform = 'scale(1)';

        setTimeout(() => {
            if (this.placeholder.parentNode) {
                this.container.insertBefore(this.draggedElement, this.placeholder);
                this.placeholder.remove();
            }
            
            this.draggedElement.style.display = '';
            this.draggedElement.classList.remove('is-pressing');
            this.avatar.remove();

            this.avatar = null;
            this.placeholder = null;
            this.draggedElement = null;

        }, 200);

        document.removeEventListener('mousemove', this._boundDragMove);
        document.removeEventListener('touchmove', this._boundDragMove);
        document.removeEventListener('mouseup', this._boundDragEnd);
        document.removeEventListener('touchend', this._boundDragEnd);
    }
};