import { ItemFactory } from "../factories/ItemFactory.mjs";
import { 
    SETTLEMENT_EVENTS, 
    BUILDING_MATERIALS, 
    SETTLEMENT_UPGRADE_PATH, 
    SETTLEMENT_TIERS,
    getSpecializationTradeGoodIds,
    normalizeSpecializations
} from "../data/GameDataConstants.mjs";
import { SettlementSpecializationPlanner } from "./simulation/SettlementSpecializationPlanner.mjs";

const DEFAULT_MARKET_BUY_MODIFIER = 1.0;
const REPUTATION_BUY_DISCOUNT_FACTOR = 0.0015;
const MIN_REPUTATION_BUY_FLOOR = 0.5;
const REPUTATION_VOLUME_THRESHOLD = 300;
const REPUTATION_BONUS_FACTOR = 0.002;
const ATTACHMENT_BONUS_FACTOR = 0.02;
const DEFAULT_MATERIAL_DELIVERIES_NEEDED = 10;
const DEVELOPMENT_PROGRESS_STEP = 1;
const MAX_POPULATION_TIER = 5;
const POPULATION_LABELS = Object.freeze({
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Very High",
    5: "Overpopulated"
});

export class MarketService {
    constructor(repo, settingsRepo) {
        this.repo = repo;
        this.settingsRepo = settingsRepo;
    }

    _getNodeSpecializations(node) {
        return normalizeSpecializations(node?.specializations ?? node?.specialization);
    }

    _chooseFirstSpecializationForNode(node, materialItemId) {
        const currentSpecializations = this._getNodeSpecializations(node);
        if (currentSpecializations.length > 0) return null;

        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            node,
            materialItemId,
            currentSpecializations
        );
    }

    _chooseColonySpecialization(parentNode, materialItemId) {
        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            parentNode,
            materialItemId,
            this._getNodeSpecializations(parentNode)
        );
    }

    _getEnrichedInventory(node = null) {
        const rawInventory = this.repo.getInventory();
        const mercenaryNamesById = new Map(
            this.repo.db
                .prepare('SELECT id, name FROM mercenaries')
                .all()
                .map((mercenary) => [mercenary.id, mercenary.name])
        );

        return rawInventory.map(inv => {
            const itemInstance = ItemFactory.createItem(inv.item_id); 
            const isEquipped = inv.mercenary_id !== null || Boolean(inv.equip_slot);
            
            let baseTypeMult = 0.15; // Normal items

            if (itemInstance.type === 'Treasure') {
                baseTypeMult = 0.95;
            } else if (itemInstance.type === 'Trade Good') {
                let produces = false;
                if (node && node.specialization) {
                    const producedItems = getSpecializationTradeGoodIds(node.specializations ?? node.specialization);
                    if (producedItems.includes(itemInstance.id)) produces = true;
                }
                baseTypeMult = produces ? 0.15 : 1.01;
            }

            let finalSellPrice = itemInstance.cost * baseTypeMult;

            if (node) {
                const repMod = Math.max(0.1, 1.0 + ((node.reputation || 0) * REPUTATION_BONUS_FACTOR));
                const attachMod = 1.0 + ((node.attachments || 0) * ATTACHMENT_BONUS_FACTOR);
                
                let eventMod = node.sell_modifier || 1.0;
                if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                    eventMod *= SETTLEMENT_EVENTS[node.current_event].sellMult;
                }

                finalSellPrice = finalSellPrice * eventMod * repMod * attachMod;
            }
            
            return {
                id: inv.id,
                inventoryId: inv.id, 
                itemId: inv.item_id,
                mercenaryId: inv.mercenary_id,
                stashSlot: inv.stash_slot, 
                equipSlot: inv.equip_slot, 
                isEquipped,
                equippedByName: isEquipped ? (mercenaryNamesById.get(inv.mercenary_id) || "Unknown Mercenary") : null,
                name: itemInstance.name,
                icon: itemInstance.icon,
                type: itemInstance.type,
                rarity: itemInstance.rarity,
                count: 1, 
                sellPrice: Math.max(1, Math.floor(finalSellPrice)),
                durability: inv.durability,
                stats: itemInstance.stats 
            };
        });
    }

    getMarketData(payload, app) {
        try {
            let buyMod = DEFAULT_MARKET_BUY_MODIFIER;
            let nodeType = 'Town';
            let specialization = null;
            let shopItems = [];
            let nodeContext = null;

            if (payload.nodeId) {
                const node = this.repo.getNodeById(payload.nodeId);
                const currentDay = parseInt(this.repo.statements.getSetting.get('day')?.value) || 1;

                if (node) {
                    node.effective_buy = node.buy_modifier || 1.0;
                    node.effective_sell = node.sell_modifier || 1.0;
                    let qtyMod = 1.0;
                    let rareMod = 1.0; 

                    if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                        const evt = SETTLEMENT_EVENTS[node.current_event];
                        node.effective_buy *= evt.buyMult;
                        node.effective_sell *= evt.sellMult;
                        qtyMod = evt.qtyMult !== undefined ? evt.qtyMult : 1.0;
                        rareMod = evt.rareChanceMult !== undefined ? evt.rareChanceMult : 1.0;
                    }

                    buyMod = node.effective_buy;
                    nodeType = node.type;
                    specialization = node.specializations ?? node.specialization;
                    nodeContext = node;

                    let inventoryChanged = false;
                    let shopInventory = [];
                    try {
                        shopInventory = node.shop_inventory ? JSON.parse(node.shop_inventory) : [];
                    } catch (e) { shopInventory = []; }

                    let lastRestockDay = node.last_restock_day || 0;
                    let nextTradeRestockDay = node.next_trade_restock_day || 0;

                    if (currentDay > lastRestockDay) {
                        shopInventory = shopInventory.filter(item => item.type === 'Trade Good');
                        const newStandard = ItemFactory.getStandardInventory(nodeType, qtyMod, rareMod);
                        shopInventory = shopInventory.concat(newStandard);
                        lastRestockDay = currentDay;
                        inventoryChanged = true;
                    }

                    if (currentDay >= nextTradeRestockDay) {
                        shopInventory = shopInventory.filter(item => item.type !== 'Trade Good');
                        const newTrade = ItemFactory.getTradeInventory(specialization, qtyMod);
                        shopInventory = shopInventory.concat(newTrade);
                        nextTradeRestockDay = currentDay + Math.floor(Math.random() * 3) + 2;
                        inventoryChanged = true;
                    }

                    if (inventoryChanged) {
                        this.repo.updateNodeShopData(node.id, JSON.stringify(shopInventory), lastRestockDay, nextTradeRestockDay);
                    }

                    const repBuyMod = Math.max(MIN_REPUTATION_BUY_FLOOR, 1.0 - ((node.reputation || 0) * REPUTATION_BUY_DISCOUNT_FACTOR));
                    
                    shopItems = shopInventory.map(item => {
                        const baseCost = item.baseValue || ItemFactory.createItem(item.id).baseValue;
                        return {
                            ...item,
                            cost: Math.max(1, Math.ceil(baseCost * buyMod * repBuyMod))
                        };
                    });
                }
            }

            const resources = this.repo.getResources();
            const enrichedInventory = this._getEnrichedInventory(nodeContext);

            app.events.broadcast("receiveMarketData", { 
                gold: resources.gold,
                inventory: enrichedInventory,
                shopItems: shopItems
            });
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) {
                console.error("❌ Error fetching market data:", e); 
            }
            app.events.broadcast("receiveMarketData", { gold: 0, inventory: [], shopItems: [] });
        }
    }

    buyItem(payload, app) {
        try {
            if (payload.nodeId) {                    
                const node = this.repo.getNodeById(payload.nodeId);
                if (node) {
                    let shopInventory = [];
                    try { shopInventory = node.shop_inventory ? JSON.parse(node.shop_inventory) : []; } 
                    catch (e) { shopInventory = []; }

                    const index = shopInventory.findIndex(i => i.id === payload.itemId);
                    if (index !== -1) {
                        shopInventory.splice(index, 1);
                        this.repo.updateNodeShopData(node.id, JSON.stringify(shopInventory), node.last_restock_day, node.next_trade_restock_day);
                    } else {
                        throw new Error("Item is out of stock.");
                    }
                }
            }

            this.repo.updateGold(-payload.cost);
            
            const template = ItemFactory.createItem(payload.itemId);
            if (template && template.type === 'Resource') {
                const resources = this.repo.getResources();
                const currentAmount = resources[template.resourceType] || 0;
                this.repo.setCampaignSetting(template.resourceType, currentAmount + template.amount);
            } else {
                this.repo.addItemToInventory(payload.itemId);
            }
            
            if (payload.nodeId) {
                this.repo.logTradeVolume(payload.nodeId, payload.cost);

                const repGain = Math.floor(payload.cost / REPUTATION_VOLUME_THRESHOLD);
                if (repGain > 0) {
                    this.repo.updateNodeReputation(payload.nodeId, repGain);
                }
            }
            
            app.events.broadcast("transactionComplete", { success: true });
        } catch(e) {
            app.events.broadcast("transactionComplete", { success: false, error: e.message });
        }
    }

    sellItem(payload, app) {
        try {
            const itemDb = this.repo.db.prepare(`
                SELECT
                    inventory.item_id,
                    inventory.mercenary_id,
                    inventory.equip_slot,
                    mercenaries.name AS mercenary_name
                FROM inventory
                LEFT JOIN mercenaries ON mercenaries.id = inventory.mercenary_id
                WHERE inventory.id = ?
            `).get(payload.inventoryId);

            if (!itemDb) {
                throw new Error("Item is no longer in your company inventory.");
            }

            if (itemDb.mercenary_id !== null || itemDb.equip_slot) {
                const wearerName = itemDb.mercenary_name || "a mercenary";
                throw new Error(`Unequip this item from ${wearerName} before selling it.`);
            }

            const itemId = itemDb.item_id;

            this.repo.updateGold(payload.price);
            this.repo.deleteItemFromInventory(payload.inventoryId);
            
            if (payload.nodeId) {
                this.repo.logTradeVolume(payload.nodeId, payload.price);

                const repGain = Math.floor(payload.price / REPUTATION_VOLUME_THRESHOLD);
                if (repGain > 0) {
                    this.repo.updateNodeReputation(payload.nodeId, repGain);
                }

                if (itemId) {
                    const node = this.repo.getNodeById(payload.nodeId);
                    const isBuildingMat = BUILDING_MATERIALS.includes(itemId);
                    
                    if (isBuildingMat) {
                        const tierInfo = SETTLEMENT_TIERS[node.type] || { growthReqs: { materials: DEFAULT_MATERIAL_DELIVERIES_NEEDED } };
                        const maxProg = tierInfo.growthReqs ? tierInfo.growthReqs.materials : DEFAULT_MATERIAL_DELIVERIES_NEEDED;

                        if (node.current_event === 'building_boom') {
                            let newProgress = (node.development_progress || 0) + DEVELOPMENT_PROGRESS_STEP;
                            let newType = node.type;
                            let newEvent = node.current_event;
                            let buyMod = node.buy_modifier;
                            let sellMod = node.sell_modifier;
                            let newPopulationTier = node.population_tier || DEVELOPMENT_PROGRESS_STEP;
                            
                            const nextTier = SETTLEMENT_UPGRADE_PATH[node.type];
                            let upgraded = false;
                            let popGrown = false;
                            let specializationBuilt = null;
                            let oldPopLabel = "";
                            let newPopLabel = "";
                            
                            if (newProgress >= maxProg) {
                                newProgress = 0;
                                newEvent = null;
                                specializationBuilt = this._chooseFirstSpecializationForNode(node, itemId);
                                
                                if (specializationBuilt) {
                                    this.repo.updateNodeSpecialization(node.id, [specializationBuilt]);
                                } else if (newPopulationTier < MAX_POPULATION_TIER) {
                                    oldPopLabel = POPULATION_LABELS[newPopulationTier];
                                    newPopulationTier += DEVELOPMENT_PROGRESS_STEP;
                                    newPopLabel = POPULATION_LABELS[newPopulationTier];
                                    popGrown = true;
                                } else {
                                    if (nextTier) {
                                        newType = nextTier;
                                        newPopulationTier = DEVELOPMENT_PROGRESS_STEP;
                                        upgraded = true;
                                        
                                        const nextTierInfo = SETTLEMENT_TIERS[nextTier];
                                        if (nextTierInfo) {
                                            buyMod = nextTierInfo.buyMult;
                                            sellMod = nextTierInfo.sellMult;
                                        }
                                    } else {
                                        newPopulationTier = MAX_POPULATION_TIER;
                                    }
                                }
                            }
                            
                            this.repo.updateNodeDevelopment(node.id, newProgress, newType, newEvent, buyMod, sellMod, newPopulationTier);
                            
                            if (specializationBuilt) {
                                this.repo.logNodeHistory(node.id, `The construction finished! ${node.name} built a ${specializationBuilt}, giving the settlement its first local specialization.`, 'world');
                            } else if (popGrown) {
                                this.repo.logNodeHistory(node.id, `The construction finished! The settlement's population has grown from ${oldPopLabel} to ${newPopLabel}.`, 'world');
                            } else if (upgraded) {
                                this.repo.logNodeHistory(node.id, `The construction finished! The settlement has grown into a ${newType}.`, 'world');
                            } else if (newProgress === 0) {
                                this.repo.logNodeHistory(node.id, `The construction finished! The settlement continues to thrive at maximum capacity.`, 'world');
                            }
                        } else if (node.current_event === 'settlement_expansion') {
                            let newProgress = (node.development_progress || 0) + DEVELOPMENT_PROGRESS_STEP;
                            
                            if (newProgress >= maxProg) {
                                const firstSpecialization = this._chooseFirstSpecializationForNode(node, itemId);
                                const colonySpecialization = firstSpecialization
                                    ? null
                                    : this._chooseColonySpecialization(node, itemId);

                                this.repo.updateNodeDevelopment(node.id, 0, node.type, null, node.buy_modifier, node.sell_modifier, node.population_tier || DEVELOPMENT_PROGRESS_STEP);

                                if (firstSpecialization) {
                                    this.repo.updateNodeSpecialization(node.id, [firstSpecialization]);
                                    this.repo.logNodeHistory(node.id, `The construction finished! ${node.name} built a ${firstSpecialization}, establishing its first local specialization.`, 'world');
                                    app.events.broadcast("transactionComplete", { success: true });
                                    return;
                                }

                                this.repo.logNodeHistory(node.id, `The construction finished! ${node.name} has expanded its borders.`, 'world');
                                
                                const spawnedNode = this.repo.spawnColony(node, colonySpecialization);
                                
                                if (spawnedNode) {
                                     this.repo.logNodeHistory(node.id, `Established the new settlement of ${spawnedNode.name} with a ${colonySpecialization ? 'focus on ' + colonySpecialization : 'focus on local resources'}.`, 'world');
                                     this.repo.logNodeHistory(spawnedNode.id, `Founded as an outpost by ${node.name}.`, 'world');
                                }
                            } else {
                                this.repo.updateNodeDevelopment(node.id, newProgress, node.type, node.current_event, node.buy_modifier, node.sell_modifier, node.population_tier || DEVELOPMENT_PROGRESS_STEP);
                            }
                        }
                    }
                }
            }
            
            app.events.broadcast("transactionComplete", { success: true });
        } catch(e) {
            app.events.broadcast("transactionComplete", { success: false, error: e.message });
        }
    }
}
