import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";
import { ItemFactory } from "../factories/ItemFactory.mjs";
import { 
    SETTLEMENT_EVENTS, 
    BUILDING_MATERIALS, 
    SETTLEMENT_UPGRADE_PATH, 
    SETTLEMENT_TIERS,
    SPECIALIZATIONS
} from "../data/GameDataConstants.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
        this.settingsRepo = new AppSettingsRepository();
    }

    _getEnrichedInventory(node = null) {
        const rawInventory = this.repo.getInventory();
        return rawInventory.map(inv => {
            const itemInstance = ItemFactory.createItem(inv.item_id); 
            
            let baseTypeMult = 0.15; // Normal items

            if (itemInstance.type === 'Treasure') {
                baseTypeMult = 0.95;
            } else if (itemInstance.type === 'Trade Good') {
                let produces = false;
                if (node && node.specialization) {
                    const producedItems = SPECIALIZATIONS[node.specialization] || [];
                    if (producedItems.includes(itemInstance.id)) produces = true;
                }
                baseTypeMult = produces ? 0.15 : 1.01;
            }

            let finalSellPrice = itemInstance.cost * baseTypeMult;

            if (node) {
                // Selling to a node:
                // Reputation bonus: +0.2% per reputation point (Max +60% payout at 300 Kindred)
                const repMod = Math.max(0.1, 1.0 + ((node.reputation || 0) * 0.002));
                const attachMod = 1.0 + ((node.attachments || 0) * 0.02);
                
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

    register(app) {
        app.events.on("getWorldData", () => {
            try {
                const resources = this.repo.getResources();
                const worldState = this.repo.getWorldState();

                worldState.nodes.forEach(node => {
                    node.effective_buy = node.buy_modifier || 1.0;
                    node.effective_sell = node.sell_modifier || 1.0;
                    node.event_name = null;

                    if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                        const evt = SETTLEMENT_EVENTS[node.current_event];
                        node.effective_buy *= evt.buyMult;
                        node.effective_sell *= evt.sellMult;
                        node.event_name = evt.name;
                    }

                    // --- INJECT GROWTH UI DATA FOR FRONTEND ---
                    const tierData = SETTLEMENT_TIERS[node.type];
                    let reqs = {};
                    try { reqs = JSON.parse(node.expansion_reqs || '{}'); } catch(e){}

                    node.growth_data = {
                        contractsDone: reqs.contracts || 0,
                        contractsNeeded: tierData?.growthReqs?.contracts || 1,
                        tradeDone: reqs.trade || 0,
                        tradeNeeded: tierData?.growthReqs?.trade || 1,
                        materialsDone: node.development_progress || 0,
                        materialsNeeded: tierData?.growthReqs?.materials || 1,
                        nextTier: SETTLEMENT_UPGRADE_PATH[node.type] || 'Colonial Outpost',
                        canGrow: !!tierData?.growthReqs
                    };
                });

                app.events.broadcast("receiveWorldData", { 
                    resources: resources,
                    nodes: worldState.nodes,
                    player: worldState.player, 
                    origin: worldState.origin,
                    gameVersion: worldState.gameVersion,
                    isDelving: worldState.isDelving 
                });
            } catch (error) {
                if (!error.message.includes("No game save is currently loaded")) {
                    console.error("❌ Error fetching world data:", error);
                }
                app.events.broadcast("receiveWorldData", { nodes: [], player: {x: 400, y: 300}, origin: 'default', gameVersion: 'standard' });
            }
        });

        app.events.on("setDelvingStatus", (payload) => {
            try {
                this.repo.setCampaignSetting('is_delving', payload.isDelving ? 'true' : 'false');
                app.events.broadcast("delvingStatusUpdated", { isDelving: payload.isDelving });
            } catch(e) { 
                if (!e.message.includes("No game save is currently loaded")) console.error(e); 
            }
        });

        app.events.on("saveWorldData", (payload) => {
            try {
                if (payload && payload.x !== undefined && payload.y !== undefined) {
                    this.repo.savePlayerPosition(payload.x, payload.y);
                }
            } catch (error) {}
        });

        app.events.on("getPartyData", () => {
            try {
                const mercs = this.repo.getAllMercenaries();
                const resources = this.repo.getResources();
                const inventory = this._getEnrichedInventory(null);
                
                mercs.forEach(m => {
                    m.equipment = {};
                    inventory.forEach(item => {
                        if (item.mercenaryId === m.id && item.equipSlot) {
                            m.equipment[item.equipSlot] = item;
                        }
                    });
                });

                app.events.broadcast("receivePartyData", { mercenaries: mercs, resources: resources, inventory: inventory });
            } catch (error) {
                if (error.message.includes("No game save is currently loaded") || error.message.includes("No active save")) {
                    app.events.broadcast("receivePartyData", null);
                } else {
                    console.error("❌ Error getting party data:", error);
                }
            }
        });

        app.events.on("processDayEnd", () => {
            try {
                const result = this.repo.processDayEnd();
                app.events.broadcast("dayEnded", { success: true, ...result });
                this._refreshParty(app); 
            } catch (error) {
                app.events.broadcast("dayEnded", { success: false, error: error.message });
            }
        });

        app.events.on("internal:sessionCompleted", (payload) => {
            try {
                const { focusSeconds, ratio } = payload;
                const minutes = focusSeconds / 60;
                const result = this.repo.distributeSessionXP(minutes, ratio);
                app.events.broadcast("xpGained", result); 
            } catch (e) {
                if (!e.message.includes("No game save is currently loaded")) {
                    console.error("XP Distribution failed", e);
                }
            }
        });

        app.events.on("hireMercenary", (payload) => {
            try {
                const cost = payload.cost || 100; 
                const rosterLimit = 12;
                const currentRoster = this.repo.getAllMercenaries();
                if (currentRoster.length >= rosterLimit) {
                    throw new Error(`Roster is full (${rosterLimit}/${rosterLimit}).`);
                }

                const newGoldBalance = this.repo.updateGold(-cost);
                const result = this.repo.addMercenary(payload.mercData);

                app.events.broadcast("mercenaryHired", {
                    success: true,
                    newGold: newGoldBalance,
                    merc: { id: result.lastInsertRowid, ...payload.mercData }
                });

                this._refreshParty(app);
            } catch (error) {
                app.events.broadcast("mercenaryHired", { success: false, error: error.message });
            }
        });

        app.events.on("moveInventoryItem", (payload) => {
            try {
                this.repo.moveItemInStash(payload.inventoryId, payload.newSlotIndex);
                this._refreshParty(app);
            } catch(e) {
                if (!e.message.includes("No game save is currently loaded")) console.error("Failed to move item:", e);
            }
        });
        
        app.events.on("equipItem", (payload) => {
            try {
                this.repo.equipItem(payload.inventoryId, payload.mercenaryId, payload.equipSlot);
                this._refreshParty(app);
            } catch(e) { 
                if (!e.message.includes("No game save is currently loaded")) console.error("Failed to equip item:", e); 
            }
        });

        app.events.on("unequipItem", (payload) => {
            try {
                this.repo.unequipItem(payload.inventoryId, payload.stashSlotIndex);
                this._refreshParty(app);
            } catch(e) { 
                if (!e.message.includes("No game save is currently loaded")) console.error("Failed to unequip item:", e); 
            }
        });

        app.events.on("getActiveContract", () => {
            try {
                const contract = this.repo.getActiveContract();
                app.events.broadcast("receiveActiveContract", contract);
            } catch(e) { 
                if (!e.message.includes("No game save is currently loaded")) {
                    console.error("❌ Failed to get active contract:", e); 
                }
                app.events.broadcast("receiveActiveContract", null);
            }
        });

        app.events.on("saveContractProgress", (payload) => {
            try {
                this.repo.updateContractProgress(payload.contractId, payload.progressMinutes);
            } catch(e) { 
                if (!e.message.includes("No game save is currently loaded")) console.error("Failed to save contract progress:", e); 
            }
        });

        app.events.on("completeActiveContract", (payload) => {
            try {
                const result = this.repo.completeActiveContract();
                if (result) {
                    app.events.broadcast("contractCompletedRealtime", result);
                    this._refreshParty(app);
                }
            } catch(e) { console.error(e); }
        });

        app.events.on("getContractsForNode", (payload) => {
            try {
                const minMins = parseInt(this.settingsRepo.getSetting('gameMinFocusTime')) || 10;
                const maxMins = parseInt(this.settingsRepo.getSetting('gameMaxFocusTime')) || 120;

                const contracts = this.repo.getOrGenerateContracts(payload.nodeId, minMins, maxMins);
                const activeContract = this.repo.getActiveContract();
                
                app.events.broadcast("receiveContracts", { contracts, activeContract });
            } catch(e) { console.error(e); }
        });

        app.events.on("acceptContract", (payload) => {
            try {
                this.repo.acceptContract(payload.contractId);
                const activeContract = this.repo.getActiveContract();
                app.events.broadcast("contractAccepted", { activeContract });
            } catch(e) { console.error(e); }
        });

        app.events.on("abortContract", (payload) => {
            try {
                this.repo.cancelContract(payload.contractId);
                this.repo.updateNodeReputation(payload.nodeId, -10);
                app.events.broadcast("contractAborted", { success: true });
            } catch(e) { console.error(e); }
        });

        app.events.on("getMarketData", (payload) => {
            try {
                let buyMod = 1.0;
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

                        if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                            const evt = SETTLEMENT_EVENTS[node.current_event];
                            node.effective_buy *= evt.buyMult;
                            node.effective_sell *= evt.sellMult;
                            qtyMod = evt.qtyMult !== undefined ? evt.qtyMult : 1.0;
                        }

                        buyMod = node.effective_buy;
                        nodeType = node.type;
                        specialization = node.specialization;
                        nodeContext = node;

                        let inventoryChanged = false;
                        let shopInventory = [];
                        try {
                            shopInventory = node.shop_inventory ? JSON.parse(node.shop_inventory) : [];
                        } catch (e) { shopInventory = []; }

                        let lastRestockDay = node.last_restock_day || 0;
                        let nextTradeRestockDay = node.next_trade_restock_day || 0;

                        // Restock Standard Items (Affected by qtyMod)
                        if (currentDay > lastRestockDay) {
                            shopInventory = shopInventory.filter(item => item.type === 'Trade Good');
                            const newStandard = ItemFactory.getStandardInventory(nodeType, qtyMod);
                            shopInventory = shopInventory.concat(newStandard);
                            lastRestockDay = currentDay;
                            inventoryChanged = true;
                        }

                        // Restock Trade Goods (Affected by qtyMod)
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

                        // --- DYNAMIC BUY PRICING ---
                        // Reputation Discount: -0.15% per point (Max -45% cost at 300 Kindred). Minimum price floored at 50%.
                        const repBuyMod = Math.max(0.5, 1.0 - ((node.reputation || 0) * 0.0015));
                        
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
        });

        app.events.on("buyItem", (payload) => {
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
                    // Track trade volume for economy scaling
                    this.repo.logTradeVolume(payload.nodeId, payload.cost);

                    // Nerfed: 1 rep per 300g traded, no guaranteed minimum
                    const repGain = Math.floor(payload.cost / 300);
                    if (repGain > 0) {
                        this.repo.updateNodeReputation(payload.nodeId, repGain);
                    }
                }
                
                app.events.broadcast("transactionComplete", { success: true });
            } catch(e) {
                app.events.broadcast("transactionComplete", { success: false, error: e.message });
            }
        });

        app.events.on("sellItem", (payload) => {
            try {
                const itemDb = this.repo.db.prepare('SELECT item_id FROM inventory WHERE id = ?').get(payload.inventoryId);
                const itemId = itemDb ? itemDb.item_id : null;

                this.repo.updateGold(payload.price);
                this.repo.deleteItemFromInventory(payload.inventoryId);
                
                if (payload.nodeId) {
                    // Track trade volume for economy scaling
                    this.repo.logTradeVolume(payload.nodeId, payload.price);

                    const repGain = Math.floor(payload.price / 300);
                    if (repGain > 0) {
                        this.repo.updateNodeReputation(payload.nodeId, repGain);
                    }

                    if (itemId) {
                        const node = this.repo.getNodeById(payload.nodeId);
                        const isBuildingMat = BUILDING_MATERIALS.includes(itemId);
                        
                        if (isBuildingMat) {
                            // Get dynamic threshold based on the settlement's tier
                            const tierInfo = SETTLEMENT_TIERS[node.type] || { growthReqs: { materials: 10 } };
                            const maxProg = tierInfo.growthReq;

                            if (node.current_event === 'building_boom') {
                                let newProgress = (node.development_progress || 0) + 1;
                                let newType = node.type;
                                let newEvent = node.current_event;
                                let buyMod = node.buy_modifier;
                                let sellMod = node.sell_modifier;
                                
                                const nextTier = SETTLEMENT_UPGRADE_PATH[node.type];
                                let upgraded = false;
                                
                                // Compare against dynamic maxProg
                                if (newProgress >= maxProg && nextTier) {
                                    newType = nextTier;
                                    newProgress = 0;
                                    newEvent = null;
                                    upgraded = true;
    
                                    const nextTierInfo = SETTLEMENT_TIERS[nextTier];
                                    if (nextTierInfo) {
                                        buyMod = nextTierInfo.buyMult;
                                        sellMod = nextTierInfo.sellMult;
                                    }
                                }
                                
                                this.repo.updateNodeDevelopment(node.id, newProgress, newType, newEvent, buyMod, sellMod);
                                
                                if (upgraded) {
                                    this.repo.logNodeHistory(node.id, `The construction finished! The settlement has grown into a ${newType}.`, 'world');
                                }
                            } else if (node.current_event === 'settlement_expansion') {
                                let newProgress = (node.development_progress || 0) + 1;
                                
                                // Compare against dynamic maxProg
                                if (newProgress >= maxProg) {
                                    let newSpec = null;
                                    if (itemId === 'quality_wood') newSpec = 'Lumber Camp';
                                    if (itemId === 'peat_bricks') newSpec = 'Peat Pit';
                                    if (itemId === 'copper_ingots') newSpec = 'Copper Mine';
    
                                    this.repo.updateNodeDevelopment(node.id, 0, node.type, null, node.buy_modifier, node.sell_modifier);
                                    this.repo.logNodeHistory(node.id, `The construction finished! ${node.name} has expanded its borders.`, 'world');
                                    
                                    const spawnedNode = this.repo.spawnColony(node, newSpec);
                                    
                                    if (spawnedNode) {
                                         this.repo.logNodeHistory(node.id, `Established the new settlement of ${spawnedNode.name} with a ${newSpec ? 'focus on ' + newSpec : 'focus on local resources'}.`, 'world');
                                         this.repo.logNodeHistory(spawnedNode.id, `Founded as an outpost by ${node.name}.`, 'world');
                                    }
                                } else {
                                    this.repo.updateNodeDevelopment(node.id, newProgress, node.type, node.current_event, node.buy_modifier, node.sell_modifier);
                                }
                            }
                        }
                    }
                }
                
                app.events.broadcast("transactionComplete", { success: true });
            } catch(e) {
                app.events.broadcast("transactionComplete", { success: false, error: e.message });
            }
        });

        app.events.on("toggleNodePin", (payload) => {
            try {
                this.repo.toggleNodePin(payload.nodeId);
                app.events.broadcast("nodePinToggled", { success: true });
            } catch(e) { console.error(e); }
        });

        app.events.on("getNodeHistory", (payload) => {
            try {
                const history = this.repo.getNodeHistory(payload.nodeId);
                app.events.broadcast("receiveNodeHistory", { nodeId: payload.nodeId, history });
            } catch(e) { console.error(e); }
        });
    }

    _refreshParty(app) {
        const mercs = this.repo.getAllMercenaries();
        const resources = this.repo.getResources();
        const inventory = this._getEnrichedInventory(null);
        
        mercs.forEach(m => {
            m.equipment = {};
            inventory.forEach(item => {
                if (item.mercenaryId === m.id && item.equipSlot) {
                    m.equipment[item.equipSlot] = item;
                }
            });
        });

        app.events.broadcast("receivePartyData", { mercenaries: mercs, resources, inventory });
    }
}