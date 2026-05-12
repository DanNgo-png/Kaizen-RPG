import { WEAPONS } from '../data/items/Weapons.mjs';
import { ARMOR } from '../data/items/Armor.mjs';
import { CONSUMABLES } from '../data/items/Consumables.mjs';
import { SETTLEMENT_TIERS } from '../data/GameDataConstants.mjs';

class ItemFactoryClass {
    constructor() {
        this.templates = new Map();
        this._registerTemplates([...WEAPONS , ...ARMOR, ...CONSUMABLES]);
    }

    _registerTemplates(items) {
        items.forEach(item => this.templates.set(item.id, item));
    }

    createItem(id, overrides = {}) {
        const template = this.templates.get(id);
        if (!template) {
            return this._createFallbackItem(id);
        }

        // Return a fresh instance so modifications (like durability) don't affect the template
        return {
            ...template,
            cost: template.baseValue, // Map base value to shop cost
            durability: 100,          // Default instance property
            ...overrides              // Allow injecting specific instance traits
        };
    }

    getShopInventory(nodeType, buyModifier = 1.0) {
        const inventory = [];
        if (nodeType === 'Ruins') return inventory; // Ruins have no active shops

        const tierConfig = SETTLEMENT_TIERS[nodeType] || { shopLevel: 1 };
        const shopLevel = tierConfig.shopLevel;

        this.templates.forEach(template => {
            let available = false;

            // Direct match or global
            if (template.availableIn.includes('All') || template.availableIn.includes(nodeType)) {
                available = true;
            } else {
                // Backward compatibility & hierarchical shop access mapped to legacy tags
                if (template.availableIn.includes('Village') && shopLevel >= 1) available = true;
                if (template.availableIn.includes('Town') && shopLevel >= 2) available = true;
                if (template.availableIn.includes('Stronghold') && nodeType === 'Stronghold') available = true;
            }

            if (available) {
                const item = this.createItem(template.id);
                // Apply the exact settlement markup
                item.cost = Math.max(1, Math.ceil(item.cost * buyModifier));
                inventory.push(item);
            }
        });
        return inventory;
    }

    getRandomItem() {
        const items = Array.from(this.templates.values());
        const randomTemplate = items[Math.floor(Math.random() * items.length)];
        return this.createItem(randomTemplate.id);
    }

    _createFallbackItem(id) {
        return { 
            id, 
            name: `Unknown Loot (${id})`, 
            type: 'Misc', 
            icon: 'fa-solid fa-sack-dollar', 
            cost: 100, 
            rarity: 'common' 
        };
    }
}

export const ItemFactory = new ItemFactoryClass();