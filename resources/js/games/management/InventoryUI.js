export class InventoryUI {
    constructor() {
        this.container = document.getElementById('stash-grid');
        this.tabs = document.querySelectorAll('.stash-tab');
        
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Trigger filter logic (requires parent to call render again or handle internally)
                // For simplicity, visual toggle only here
            });
        });
    }

    render(items, filter = 'all') {
        this.container.innerHTML = '';
        
        // Fill empty slots to make grid look solid (like Battle Brothers)
        // Assume 50 slots capacity
        const capacity = 50; 
        
        for(let i = 0; i < capacity; i++) {
            const item = items[i]; // May be undefined
            const el = document.createElement('div');
            el.className = 'item-card';
            
            if (item) {
                // Populated Slot
                el.classList.add(`item-${item.rarity || 'common'}`);
                el.innerHTML = `<i class="${item.icon || 'fa-solid fa-sack-dollar'}"></i>`;
                
                if (item.count > 1) {
                    el.innerHTML += `<div class="item-qty">${item.count}</div>`;
                }
                
                el.title = item.name;
                el.draggable = true;
                // Add drag events here later
            } else {
                // Empty Slot styling
                el.style.opacity = "0.2";
                el.style.borderStyle = "dashed";
            }
            
            this.container.appendChild(el);
        }
    }
}