import { notifier } from "../../_global-managers/NotificationManager.js";

export class CharacterSheetUI {
    constructor(callbacks = {}) {
        this.onEquip = callbacks.onEquip;
        this.currentMercId = null;

        this.dom = {
            name: document.getElementById('char-name'),
            role: document.getElementById('char-role'),
            level: document.getElementById('char-level'),
            // Stats
            hp: document.getElementById('stat-hp'),
            fat: document.getElementById('stat-fat'),
            res: document.getElementById('stat-res'),
            ini: document.getElementById('stat-ini'),
            matk: document.getElementById('stat-matk'),
            ratk: document.getElementById('stat-ratk'),
            mdef: document.getElementById('stat-mdef'),
            rdef: document.getElementById('stat-rdef'),
            // Slots
            slots: document.querySelectorAll('.doll-slot')
        };

        this._setupDropZones();
    }

    _setupDropZones() {
        this.dom.slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault(); // allow drop
                slot.style.borderColor = 'var(--accent-active-text)';
            });

            slot.addEventListener('dragleave', () => {
                slot.style.borderColor = '';
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.style.borderColor = '';

                if (!this.currentMercId) return;

                const rawData = e.dataTransfer.getData('text/plain');
                if (!rawData) return;

                try {
                    const data = JSON.parse(rawData);

                    // Ensure it came from a draggable source in our UI
                    if (data.source === 'stash' || data.source === 'equip') {
                        const targetSlot = slot.dataset.slot; 
                        
                        // Map our DOM slot names to valid item types
                        const validTypes = {
                            'head': ['Head'],
                            'body': ['Armor'],
                            'main_hand': ['Weapon', 'Ranged'],
                            'off_hand': ['Off-Hand', 'Weapon'], // allow shields or dual wield
                            'accessory': ['Accessory', 'Consumable'],
                            'ammo': ['Ammo', 'Ranged']
                        };
                        
                        const allowed = validTypes[targetSlot];
                        if (allowed && allowed.includes(data.type)) {
                            if (this.onEquip) this.onEquip(data.invId, this.currentMercId, targetSlot);
                        } else {
                            notifier.show("Invalid Slot", "This item cannot be equipped here.", "fa-solid fa-xmark");
                        }
                    }
                } catch (err) {
                    console.error("Drop Parse Error", err);
                }
            });
        });
    }

    render(merc) {
        if (!merc) return;
        this.currentMercId = merc.id;

        this.dom.name.textContent = merc.name;
        this.dom.role.textContent = merc.role;
        this.dom.level.textContent = merc.level;

        // Basic Stats
        this.dom.hp.textContent = `${merc.current_hp}/${merc.max_hp}`;
        this.dom.fat.textContent = merc.fatigue || 0;
        this.dom.res.textContent = 50; 
        this.dom.ini.textContent = merc.spd; 
        this.dom.matk.textContent = merc.str; 
        this.dom.ratk.textContent = merc.int; 
        this.dom.mdef.textContent = 10;
        this.dom.rdef.textContent = 5;

        // Clear Slots
        this.dom.slots.forEach(slot => {
            const existingItem = slot.querySelector('.slotted-item');
            if (existingItem) existingItem.remove();
        });

        // Populate Equipment
        if (merc.equipment) {
            Object.entries(merc.equipment).forEach(([slotName, item]) => {
                const slotEl = document.querySelector(`.doll-slot[data-slot="${slotName}"]`);
                if (slotEl && item) {
                    this._renderItemInSlot(slotEl, item);
                }
            });
        }
    }

    _renderItemInSlot(slotEl, item) {
        const img = document.createElement('div');
        img.className = `slotted-item item-${item.rarity || 'common'}`;
        img.style.width = "100%"; 
        img.style.height = "100%";
        img.style.display = "flex"; 
        img.style.alignItems = "center"; 
        img.style.justifyContent = "center";
        img.style.position = "absolute"; // Align over the icon cleanly
        img.innerHTML = `<i class="${item.icon || 'fa-solid fa-cube'}"></i>`;
        
        img.title = item.name;
        img.draggable = true;

        img.addEventListener('dragstart', (e) => {
            const payload = JSON.stringify({ invId: item.inventoryId, type: item.type, source: 'equip' });
            e.dataTransfer.setData('text/plain', payload);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => img.classList.add('is-dragging'), 0);
        });

        img.addEventListener('dragend', () => {
            img.classList.remove('is-dragging');
        });

        slotEl.appendChild(img);
    }
}