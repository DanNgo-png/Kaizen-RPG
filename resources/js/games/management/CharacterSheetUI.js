export class CharacterSheetUI {
    constructor() {
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
    }

    render(merc) {
        if (!merc) return;

        this.dom.name.textContent = merc.name;
        this.dom.role.textContent = merc.role;
        this.dom.level.textContent = merc.level;

        // Basic Stats
        this.dom.hp.textContent = `${merc.current_hp}/${merc.max_hp}`;
        this.dom.fat.textContent = merc.fatigue || 0;
        this.dom.res.textContent = 50; // Placeholder until DB column added
        this.dom.ini.textContent = merc.spd; // Mapping Speed to Initiative
        this.dom.matk.textContent = merc.str; // Mapping Str to Melee
        this.dom.ratk.textContent = merc.int; // Mapping Int to Ranged (for now)
        this.dom.mdef.textContent = 10;
        this.dom.rdef.textContent = 5;

        // Clear Slots
        this.dom.slots.forEach(slot => {
            // Remove existing item images, keep the background icon
            const existingItem = slot.querySelector('.slotted-item');
            if(existingItem) existingItem.remove();
        });

        // Populate Equipment (Mock logic until Equipment DB is robust)
        // assuming merc.equipment = { head: { icon: '...', rarity: '...' } }
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
        img.innerHTML = `<i class="${item.icon || 'fa-solid fa-cube'}"></i>`;
        slotEl.appendChild(img);
    }
}