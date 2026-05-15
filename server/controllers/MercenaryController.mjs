import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";
import { ItemFactory } from "../factories/ItemFactory.mjs";
import { 
    SETTLEMENT_EVENTS, 
    BUILDING_MATERIALS, 
    SETTLEMENT_UPGRADE_PATH, 
    MAX_DEVELOPMENT_PROGRESS, 
    SETTLEMENT_TIERS 
} from "../data/GameDataConstants.mjs";

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
        this.settingsRepo = new AppSettingsRepository();
    }

    _getEnrichedInventory(sellModifier = 0.5) {
        const rawInventory = this.repo.getInventory();
        return rawInventory.map(inv => {
            const itemInstance = ItemFactory.createItem(inv.item_id); 
            
            return {
                id: inv.id,
                inventoryId: inv.id, 
                itemId: inv.item_id,
                mercenaryId: inv.mercenary_id,
                stashSlot: inv.stash_slot, 
                equipSlot: inv.equip_slot, // Included newly added column
                name: itemInstance.name,
                icon: itemInstance.icon,
                type: itemInstance.type,
                rarity: itemInstance.rarity,
                count: 1, 
                sellPrice: Math.max(1, Math.floor(itemInstance.cost * sellModifier)),
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
                    node.effective_sell = node.sell_modifier || 0.5;
                    node.event_name = null;

                    if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                        const evt = SETTLEMENT_EVENTS[node.current_event];
                        node.effective_buy *= evt.buyMult;
                        node.effective_sell *= evt.sellMult;
                        node.event_name = evt.name;
                    }
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
                app.events.broadcast("receiveWorldData", { nodes: [], player: {x: 400, y: 300}, origin: 'default', gameVersion: 'standard' });
            }
        });

        // --- Toggle Delving State ---
        app.events.on("setDelvingStatus", (payload) => {
            try {
                this.repo.setCampaignSetting('is_delving', payload.isDelving ? 'true' : 'false');
                app.events.broadcast("delvingStatusUpdated", { isDelving: payload.isDelving });
            } catch(e) { console.error(e); }
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
                const inventory = this._getEnrichedInventory();
                
                // Attach Equipment to Mercenaries
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
                if (error.message.includes("No active save")) app.events.broadcast("receivePartyData", null);
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
                
                // Allow XP to scale directly with whatever time was focused
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

        // --- INVENTORY MANAGEMENT EVENTS ---
        app.events.on("moveInventoryItem", (payload) => {
            try {
                this.repo.moveItemInStash(payload.inventoryId, payload.newSlotIndex);
                this._refreshParty(app);
            } catch(e) {
                console.error("Failed to move item:", e);
            }
        });
        
        app.events.on("equipItem", (payload) => {
            try {
                this.repo.equipItem(payload.inventoryId, payload.mercenaryId, payload.equipSlot);
                this._refreshParty(app);
            } catch(e) { console.error("Failed to equip item:", e); }
        });

        app.events.on("unequipItem", (payload) => {
            try {
                this.repo.unequipItem(payload.inventoryId, payload.stashSlotIndex);
                this._refreshParty(app);
            } catch(e) { console.error("Failed to unequip item:", e); }
        });

        // ... (Contracts and Market endpoints remain identical)
        app.events.on("getActiveContract", () => {
            try {
                const contract = this.repo.getActiveContract();
                app.events.broadcast("receiveActiveContract", contract);
            } catch(e) { console.error(e); }
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
                let sellMod = 0.5;
                let nodeType = 'Town';
                let specialization = null;
                let shopItems = [];

                if (payload.nodeId) {
                    const node = this.repo.getNodeById(payload.nodeId);
                    const currentDay = parseInt(this.repo.statements.getSetting.get('day')?.value) || 1;

                    if (node) {
                        buyMod = node.buy_modifier || 1.0;
                        sellMod = node.sell_modifier || 0.5;
                        nodeType = node.type;
                        specialization = node.specialization;

                        let inventoryChanged = false;
                        let shopInventory = [];
                        try {
                            shopInventory = node.shop_inventory ? JSON.parse(node.shop_inventory) : [];
                        } catch (e) { shopInventory = []; }

                        let lastRestockDay = node.last_restock_day || 0;
                        let nextTradeRestockDay = node.next_trade_restock_day || 0;

                        if (currentDay > lastRestockDay) {
                            shopInventory = shopInventory.filter(item => item.type === 'Trade Good');
                            const newStandard = ItemFactory.getStandardInventory(nodeType, buyMod);
                            shopInventory = shopInventory.concat(newStandard);
                            lastRestockDay = currentDay;
                            inventoryChanged = true;
                        }

                        if (currentDay >= nextTradeRestockDay) {
                            shopInventory = shopInventory.filter(item => item.type !== 'Trade Good');
                            const newTrade = ItemFactory.getTradeInventory(buyMod, specialization);
                            shopInventory = shopInventory.concat(newTrade);
                            nextTradeRestockDay = currentDay + Math.floor(Math.random() * 3) + 2;
                            inventoryChanged = true;
                        }

                        if (inventoryChanged) {
                            this.repo.updateNodeShopData(node.id, JSON.stringify(shopInventory), lastRestockDay, nextTradeRestockDay);
                        }

                        shopItems = shopInventory;
                    }
                }

                const resources = this.repo.getResources();
                const enrichedInventory = this._getEnrichedInventory(sellMod);

                app.events.broadcast("receiveMarketData", { 
                    gold: resources.gold,
                    inventory: enrichedInventory,
                    shopItems: shopItems
                });
            } catch(e) { 
                console.error("❌ Error fetching market data:", e); 
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
                    const repGain = Math.max(1, Math.floor(payload.cost / 100));
                    this.repo.updateNodeReputation(payload.nodeId, repGain);
                }
                
                app.events.broadcast("transactionComplete", { success: true });
            } catch(e) {
                app.events.broadcast("transactionComplete", { success: false, error: e.message });
            }
        });

        app.events.on("sellItem", (payload) => {
            try {
                // Fetch the item info BEFORE deleting it to check if it's a building material
                const itemDb = this.repo.db.prepare('SELECT item_id FROM inventory WHERE id = ?').get(payload.inventoryId);
                const itemId = itemDb ? itemDb.item_id : null;

                this.repo.updateGold(payload.price);
                this.repo.deleteItemFromInventory(payload.inventoryId);
                
                if (payload.nodeId) {
                    const repGain = Math.max(1, Math.floor(payload.price / 100));
                    this.repo.updateNodeReputation(payload.nodeId, repGain);

                    // --- SETTLEMENT EXPANSION LOGIC ---
                    if (itemId) {
                        const node = this.repo.getNodeById(payload.nodeId);
                        const isBuildingMat = BUILDING_MATERIALS.includes(itemId);
                        
                        if (isBuildingMat) {
                            if (node.current_event === 'building_boom') {
                                let newProgress = (node.development_progress || 0) + 1;
                                let newType = node.type;
                                let newEvent = node.current_event;
                                let buyMod = node.buy_modifier;
                                let sellMod = node.sell_modifier;
                                
                                const nextTier = SETTLEMENT_UPGRADE_PATH[node.type];
                                let upgraded = false;
                                
                                if (newProgress >= MAX_DEVELOPMENT_PROGRESS && nextTier) {
                                    newType = nextTier;
                                    newProgress = 0;
                                    newEvent = null;
                                    upgraded = true;
    
                                    const tierInfo = SETTLEMENT_TIERS[nextTier];
                                    if (tierInfo) {
                                        buyMod = tierInfo.buyMult;
                                        sellMod = tierInfo.sellMult;
                                    }
                                }
                                
                                this.repo.updateNodeDevelopment(node.id, newProgress, newType, newEvent, buyMod, sellMod);
                                
                                if (upgraded) {
                                    this.repo.logNodeHistory(node.id, `The construction finished! The settlement has grown into a ${newType}.`, 'world');
                                }
                            } else if (node.current_event === 'settlement_expansion') {
                                let newProgress = (node.development_progress || 0) + 1;
                                
                                if (newProgress >= MAX_DEVELOPMENT_PROGRESS) {
                                    let newSpec = null;
                                    if (itemId === 'quality_wood') newSpec = 'Lumber Camp';
                                    if (itemId === 'peat_bricks') newSpec = 'Peat Pit';
                                    if (itemId === 'copper_ingots') newSpec = 'Copper Mine';
    
                                    this.repo.updateNodeDevelopment(node.id, 0, node.type, null, node.buy_modifier, node.sell_modifier);
                                    this.repo.logNodeHistory(node.id, `The construction finished! ${node.name} has expanded its borders.`, 'world');
                                    
                                    const spawnedNode = this.repo.spawnColony(node, newSpec);
                                    
                                    if (spawnedNode) {
                                         this.repo.logNodeHistory(node.id, `Established the new settlement of ${spawnedNode.name} with a ${newSpec ? 'focus on ' + newSpec : 'focus on local resources'}.`, 'world');
                                         this.repo.logNodeHistory(spawnedNode.id, `Founded as a colony by ${node.name}.`, 'world');
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
        const inventory = this._getEnrichedInventory();
        
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