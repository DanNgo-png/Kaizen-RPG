import { WEAPONS } from '../data/items/Weapons.mjs';
import { ARMOR } from '../data/items/Armor.mjs';
import { CONSUMABLES } from '../data/items/Consumables.mjs';

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

    getShopInventory(nodeType) {
        const inventory = [];
        this.templates.forEach(template => {
            if (template.availableIn.includes(nodeType) || template.availableIn.includes('All')) {
                inventory.push(this.createItem(template.id));
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