import { WEAPONS } from '../data/items/Weapons.mjs';
import { ARMOR } from '../data/items/Armor.mjs';
import { CONSUMABLES } from '../data/items/Consumables.mjs';
import { TRADE_GOODS } from '../data/items/TradeGoods.mjs';
import { TREASURE } from '../data/items/Treasure.mjs';
import { PROVISIONS } from '../data/items/Provisions.mjs';
import { SETTLEMENT_TIERS, getSpecializationTradeGoodIds } from '../data/GameDataConstants.mjs';

class ItemFactoryClass {
    constructor() {
        this.templates = new Map();
        this._registerTemplates([...WEAPONS, ...ARMOR, ...CONSUMABLES, ...TRADE_GOODS, ...TREASURE, ...PROVISIONS]);
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

    getStandardInventory(nodeType, qtyMult = 1.0, rareChanceMult = 1.0) {
        const inventory = [];
        if (nodeType === 'Ruins') return inventory;

        const tierConfig = SETTLEMENT_TIERS[nodeType] || { shopLevel: 1 };
        const shopLevel = tierConfig.shopLevel;

        this.templates.forEach(template => {
            if (template.type === 'Trade Good' || template.type === 'Treasure') return;

            let available = false;
            if (template.availableIn.includes('All') || template.availableIn.includes(nodeType)) {
                available = true;
            } else {
                if (template.availableIn.includes('Village') && shopLevel >= 1) available = true;
                if (template.availableIn.includes('Town') && shopLevel >= 2) available = true;
                if (template.availableIn.includes('Stronghold') && nodeType === 'Stronghold') available = true;
            }

            if (available) {
                // Determine spawn probability based on rarity
                let spawnProb = 1.0;
                if (template.rarity === 'uncommon') spawnProb = 0.5 * rareChanceMult;
                if (template.rarity === 'rare') spawnProb = 0.15 * rareChanceMult;
                if (template.rarity === 'legendary') spawnProb = 0.05 * rareChanceMult;

                if (Math.random() <= spawnProb) {
                    // Boost base count specifically for provisions and consumables
                    let consumableBoost = 0;
                    if (template.type === 'Provision' || template.type === 'Consumable' || template.type === 'Resource') {
                        consumableBoost = Math.floor(qtyMult); // Extra basics if well supplied
                    }

                    const spawnCount = Math.floor(1 * qtyMult + (Math.random() * qtyMult)) + consumableBoost;
                    
                    for (let i = 0; i < spawnCount; i++) {
                        const item = this.createItem(template.id);
                        inventory.push(item);
                    }
                }
            }
        });

        return inventory;
    }

    getTradeInventory(specialization = null, qtyMult = 1.0) {
        const inventory = [];
        
        if (specialization) {
            const tradeGoodIds = getSpecializationTradeGoodIds(specialization);
            tradeGoodIds.forEach(id => {
                const baseQty = Math.floor(Math.random() * 5) + 2; 
                const finalQty = Math.floor(baseQty * qtyMult);

                for (let i = 0; i < finalQty; i++) {
                    const item = this.createItem(id);
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
