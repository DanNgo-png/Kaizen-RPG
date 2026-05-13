import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";
import { ItemFactory } from "../factories/ItemFactory.mjs";

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
                name: itemInstance.name,
                icon: itemInstance.icon,
                type: itemInstance.type,
                rarity: itemInstance.rarity,
                count: 1, 
                sellPrice: Math.max(1, Math.floor(itemInstance.cost * sellModifier)) 
            };
        });
    }

    register(app) {
        app.events.on("getWorldData", () => {
            try {
                const resources = this.repo.getResources();
                const worldState = this.repo.getWorldState();

                app.events.broadcast("receiveWorldData", { 
                    resources: resources,
                    nodes: worldState.nodes,
                    player: worldState.player, 
                    origin: worldState.origin,
                    gameVersion: worldState.gameVersion,
                    isDelving: worldState.isDelving // Broadcast back to UI
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
                console.error("Failed to move item:", e);
            }
        });

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

                // Look up specific economy via Database Node lookup
                if (payload.nodeId) {
                    const node = this.repo.getNodeById(payload.nodeId);
                    if (node) {
                        buyMod = node.buy_modifier || 1.0;
                        sellMod = node.sell_modifier || 0.5;
                        nodeType = node.type;
                    }
                }

                const resources = this.repo.getResources();
                const enrichedInventory = this._getEnrichedInventory(sellMod);
                const shopItems = ItemFactory.getShopInventory(nodeType, buyMod);

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
                this.repo.updateGold(-payload.cost);
                
                // Intercept 'Resource' items (like medicine, ammo) so they go to the top bar, not the stash
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
                this.repo.updateGold(payload.price);
                this.repo.deleteItemFromInventory(payload.inventoryId);
                
                if (payload.nodeId) {
                    const repGain = Math.max(1, Math.floor(payload.price / 100));
                    this.repo.updateNodeReputation(payload.nodeId, repGain);
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
        app.events.broadcast("receivePartyData", { mercenaries: mercs, resources, inventory });
    }
}