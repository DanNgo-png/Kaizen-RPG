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

                // Add Provisions Visual Stat
                if (item.stats && item.stats.provisions) {
                    el.innerHTML += `<div style="position: absolute; top: 2px; right: 4px; font-size: 0.75rem; font-weight: 700; font-family: monospace; color: #d97706; text-shadow: 1px 1px 2px #000, -1px -1px 2px #000; pointer-events: none;"><i class="fa-solid fa-drumstick-bite"></i> ${item.stats.provisions}</div>`;
                }
                
                // Add Spoil text to native title Tooltip
                let titleText = item.name;
                if (item.stats && item.stats.spoil_days) {
                    titleText += ` (Spoils in ${item.durability} days)`;
                }
                el.title = titleText;
                el.draggable = true;

                // --- Drag Start ---
                el.addEventListener('dragstart', (e) => {
                    // CHANGED: Package type and source inside a JSON payload so Character Sheet can validate it
                    const payload = JSON.stringify({ invId: item.inventoryId, type: item.type, source: 'stash' });
                    e.dataTransfer.setData('text/plain', payload);
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
                
                const rawData = e.dataTransfer.getData('text/plain');
                if (rawData) {
                    try {
                        const data = JSON.parse(rawData);
                        if (this.onItemMoved) {
                            // If coming from equip slots, this acts as an Unequip
                            this.onItemMoved(data.invId, i, data.source); 
                        }
                    } catch(err) {
                        // Fallback in case old ID behavior triggers somehow
                        if (this.onItemMoved) this.onItemMoved(parseInt(rawData), i, 'stash');
                    }
                }
            });
            
            this.container.appendChild(el);
        }
    }
}