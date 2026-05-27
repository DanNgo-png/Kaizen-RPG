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
            headArmor: document.getElementById('stat-head-armor'),
            bodyArmor: document.getElementById('stat-body-armor'),
            health: document.getElementById('stat-health'),
            ap: document.getElementById('stat-ap'),
            fatigue: document.getElementById('stat-fatigue'),
            morale: document.getElementById('stat-morale'),
            resolve: document.getElementById('stat-resolve'),
            meleeSkill: document.getElementById('stat-melee-skill'),
            rangeSkill: document.getElementById('stat-range-skill'),
            meleeDefense: document.getElementById('stat-melee-defense'),
            rangeDefense: document.getElementById('stat-range-defense'),
            damage: document.getElementById('stat-damage'),
            armorEffectiveness: document.getElementById('stat-armor-effectiveness'),
            headHitChance: document.getElementById('stat-head-hit-chance'),
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

        if (this.dom.name) this.dom.name.textContent = merc.name;
        if (this.dom.role) this.dom.role.textContent = merc.role;
        if (this.dom.level) this.dom.level.textContent = merc.level;

        // Initialize base stats
        let headArmorVal = 0;
        let bodyArmorVal = 0;
        let totalFatiguePenalty = 0;
        
        let weaponAttack = 0;
        let weaponDefense = 0;
        let weaponArmorPen = 0;

        let shieldDefense = 0;

        const getStat = (item, key, defaultValue = 0) => {
            return (item && item.stats && item.stats[key] !== undefined) ? item.stats[key] : defaultValue;
        };

        // Calculate equipment stats
        if (merc.equipment) {
            // Head
            if (merc.equipment.head) {
                headArmorVal = getStat(merc.equipment.head, 'defense');
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.head, 'fatigue_penalty'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.head, 'weight'));
            }
            // Body
            if (merc.equipment.body) {
                bodyArmorVal = getStat(merc.equipment.body, 'defense');
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.body, 'fatigue_penalty'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.body, 'weight'));
            }
            // Main hand weapon
            if (merc.equipment.main_hand) {
                weaponAttack = getStat(merc.equipment.main_hand, 'attack');
                weaponDefense = getStat(merc.equipment.main_hand, 'defense');
                weaponArmorPen = getStat(merc.equipment.main_hand, 'armor_penetration');
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.main_hand, 'weight'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.main_hand, 'fatigue_penalty'));
            }
            // Off hand shield
            if (merc.equipment.off_hand) {
                shieldDefense = getStat(merc.equipment.off_hand, 'defense');
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.off_hand, 'fatigue_penalty'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.off_hand, 'weight'));
            }
            // Accessory
            if (merc.equipment.accessory) {
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.accessory, 'weight'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.accessory, 'fatigue_penalty'));
            }
            // Ammo
            if (merc.equipment.ammo) {
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.ammo, 'weight'));
                totalFatiguePenalty += Math.abs(getStat(merc.equipment.ammo, 'fatigue_penalty'));
            }
        }

        // Calculate final stats
        const baseMaxFatigue = 100;
        const maxFatigue = Math.max(50, baseMaxFatigue - totalFatiguePenalty);

        // Morale based on Health %
        const hpPercent = merc.current_hp / merc.max_hp;
        let moraleText = "Steady (50)";
        if (hpPercent >= 1.0) moraleText = "Confident (60)";
        else if (hpPercent >= 0.75) moraleText = "Steady (50)";
        else if (hpPercent >= 0.50) moraleText = "Wavering (40)";
        else moraleText = "Breaking (30)";

        // Attributes calculations
        const baseResolve = 50 + (merc.level * 2);
        const baseMeleeSkill = 50 + Math.floor(merc.str * 1.5) + weaponAttack;
        const baseRangeSkill = 40 + Math.floor(merc.int * 1.5) + (merc.equipment?.main_hand?.type === 'Ranged' ? weaponAttack : 0);
        
        const baseMeleeDefense = 5 + Math.floor(merc.spd * 0.5) + shieldDefense + weaponDefense;
        const baseRangeDefense = 5 + Math.floor(merc.spd * 0.4) + shieldDefense;

        // Damage calculation (base + weapon)
        const baseMinDmg = 15 + Math.floor(merc.str * 0.5);
        const baseMaxDmg = 25 + Math.floor(merc.str * 0.8);
        const finalMinDmg = baseMinDmg + weaponAttack;
        const finalMaxDmg = baseMaxDmg + weaponAttack;

        const armorPenPercent = 100 + weaponArmorPen;
        const headHitChanceVal = 25; // standard base 25%

        // Populate UI elements securely
        if (this.dom.headArmor) this.dom.headArmor.textContent = headArmorVal;
        if (this.dom.bodyArmor) this.dom.bodyArmor.textContent = bodyArmorVal;
        if (this.dom.health) this.dom.health.textContent = `${merc.current_hp}/${merc.max_hp}`;
        if (this.dom.ap) this.dom.ap.textContent = `9`;
        if (this.dom.fatigue) this.dom.fatigue.textContent = `${merc.fatigue || 0}/${maxFatigue}`;
        if (this.dom.morale) this.dom.morale.textContent = moraleText;
        if (this.dom.resolve) this.dom.resolve.textContent = baseResolve;
        
        if (this.dom.meleeSkill) this.dom.meleeSkill.textContent = baseMeleeSkill;
        if (this.dom.rangeSkill) this.dom.rangeSkill.textContent = baseRangeSkill;
        if (this.dom.meleeDefense) this.dom.meleeDefense.textContent = baseMeleeDefense;
        if (this.dom.rangeDefense) this.dom.rangeDefense.textContent = baseRangeDefense;
        if (this.dom.damage) this.dom.damage.textContent = `${finalMinDmg} - ${finalMaxDmg}`;
        if (this.dom.armorEffectiveness) this.dom.armorEffectiveness.textContent = `${armorPenPercent}%`;
        if (this.dom.headHitChance) this.dom.headHitChance.textContent = `${headHitChanceVal}%`;

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