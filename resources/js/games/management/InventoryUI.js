export class InventoryUI {
    constructor(callbacks = {}) {
        this.container = document.getElementById('stash-grid');
        this.tabs = document.querySelectorAll('.stash-tab');
        this.onItemMoved = callbacks.onItemMoved;
        
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    render(items, filter = 'all') {
        this.container.innerHTML = '';
        
        const capacity = 50; 
        
        // Map items exactly to their saved stash_slot index
        const slotMap = new Array(capacity).fill(null);
        
        items.forEach(item => {
            // Ensure item is not equipped by a mercenary, and fits within the 50 slot cap
            if (item.mercenaryId === null && item.stashSlot !== null && item.stashSlot < capacity) {
                slotMap[item.stashSlot] = item;
            }
        });
        
        for(let i = 0; i < capacity; i++) {
            const item = slotMap[i]; 
            const el = document.createElement('div');
            el.className = 'item-card';
            el.dataset.slotIndex = i; // Store target index
            
            if (item) {
                // Populated Slot
                el.classList.add(`item-${item.rarity || 'common'}`);
                el.innerHTML = `<i class="${item.icon || 'fa-solid fa-sack-dollar'}"></i>`;
                
                if (item.count > 1) {
                    el.innerHTML += `<div class="item-qty">${item.count}</div>`;
                }
                
                el.title = item.name;
                el.draggable = true;

                // --- Drag Start ---
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.inventoryId);
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => el.classList.add('is-dragging'), 0); // Visual indicator
                });
                
                el.addEventListener('dragend', () => {
                    el.classList.remove('is-dragging');
                });
            } else {
                // Empty Slot
                el.classList.add('empty');
            }
            
            // --- Drag Over (Drop Zone) ---
            el.addEventListener('dragover', (e) => {
                e.preventDefault(); // Must call preventDefault to allow drop
                el.style.borderColor = 'var(--accent-active-text)';
            });
            
            el.addEventListener('dragleave', () => {
                el.style.borderColor = ''; // Reset border
            });

            // --- Drop ---
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.style.borderColor = '';
                const invId = e.dataTransfer.getData('text/plain');
                if (invId && this.onItemMoved) {
                    this.onItemMoved(parseInt(invId), i); // i = Target Slot Index
                }
            });
            
            this.container.appendChild(el);
        }
    }
}