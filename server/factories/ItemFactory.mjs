import { WEAPONS } from '../data/items/Weapons.mjs';
import { ARMOR } from '../data/items/Armor.mjs';
import { CONSUMABLES } from '../data/items/Consumables.mjs';
import { TRADE_GOODS } from '../data/items/TradeGoods.mjs';
import { SETTLEMENT_TIERS, SPECIALIZATIONS } from '../data/GameDataConstants.mjs';

class ItemFactoryClass {
    constructor() {
        this.templates = new Map();
        this._registerTemplates([...WEAPONS, ...ARMOR, ...CONSUMABLES, ...TRADE_GOODS]);
    }

    _registerTemplates(items) {
        items.forEach(item => this.templates.set(item.id, item));
    }

    createItem(id, overrides = {}) {
        const template = this.templates.get(id);
        if (!template) {
            return this._createFallbackItem(id);
        }
        return {
            ...template,
            cost: template.baseValue, 
            durability: 100,          
            ...overrides              
        };
    }

    getShopInventory(nodeType, buyModifier = 1.0, specialization = null) {
        const inventory = [];
        if (nodeType === 'Ruins') return inventory;

        const tierConfig = SETTLEMENT_TIERS[nodeType] || { shopLevel: 1 };
        const shopLevel = tierConfig.shopLevel;

        // 1. Generate Standard Equipment
        this.templates.forEach(template => {
            if (template.type === 'Trade Good') return; // Skip trade goods in generic generation

            let available = false;
            if (template.availableIn.includes('All') || template.availableIn.includes(nodeType)) {
                available = true;
            } else {
                if (template.availableIn.includes('Village') && shopLevel >= 1) available = true;
                if (template.availableIn.includes('Town') && shopLevel >= 2) available = true;
                if (template.availableIn.includes('Stronghold') && nodeType === 'Stronghold') available = true;
            }

            if (available) {
                const item = this.createItem(template.id);
                item.cost = Math.max(1, Math.ceil(item.cost * buyModifier));
                inventory.push(item);
            }
        });

        // 2. Generate Trade Goods based on Specialization
        if (specialization && SPECIALIZATIONS[specialization]) {
            const tradeGoodIds = SPECIALIZATIONS[specialization];
            tradeGoodIds.forEach(id => {
                // Generate 2 to 6 of the specialized item
                const qty = Math.floor(Math.random() * 5) + 2; 
                for (let i = 0; i < qty; i++) {
                    const item = this.createItem(id);
                    
                    item.cost = Math.max(1, Math.floor(item.cost * buyModifier)); 
                    inventory.push(item);
                }
            });
        }

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