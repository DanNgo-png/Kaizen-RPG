import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";

// Helper to generate mock items for the shop
const generateMockShop = (nodeType) => {
    const items = [
        { id: 'iron_sword', name: 'Iron Sword', type: 'Weapon', icon: 'fa-solid fa-khanda', cost: 150, rarity: 'common' },
        { id: 'wooden_shield', name: 'Wooden Shield', type: 'Armor', icon: 'fa-solid fa-shield-halved', cost: 80, rarity: 'common' },
        { id: 'healing_salve', name: 'Healing Salve', type: 'Consumable', icon: 'fa-solid fa-flask', cost: 50, rarity: 'common' },
        { id: 'chainmail', name: 'Chainmail', type: 'Armor', icon: 'fa-solid fa-shirt', cost: 400, rarity: 'uncommon' },
        { id: 'warhammer', name: 'Warhammer', type: 'Weapon', icon: 'fa-solid fa-gavel', cost: 250, rarity: 'rare' }
    ];

    // Strongholds get better gear
    if (nodeType === 'Stronghold') {
        items.push({ id: 'plate_armor', name: 'Heavy Plate', type: 'Armor', icon: 'fa-solid fa-user-shield', cost: 1200, rarity: 'legendary' });
    }
    return items;
};

// MOCK ITEM LOOKUP (To resolve player inventory IDs to readable names/prices)
const getItemDetails = (itemId) => {
    const allItems = generateMockShop('Stronghold');
    const found = allItems.find(i => i.id === itemId);
    if (found) return found;
    // Fallback for unknown loot
    return { id: itemId, name: 'Unknown Loot (' + itemId + ')', type: 'Misc', icon: 'fa-solid fa-sack-dollar', cost: 100, rarity: 'common' };
};

export class MercenaryController {
    constructor() {
        this.repo = new GameRepository();
    }

    /**
     * Maps raw database inventory to rich item objects usable by the UI
     */
    _getEnrichedInventory() {
        const rawInventory = this.repo.getInventory();
        return rawInventory.map(inv => {
            const details = getItemDetails(inv.item_id);
            return {
                id: inv.id,
                inventoryId: inv.id, // Mapped for marketplace selling logic
                itemId: inv.item_id,
                mercenaryId: inv.mercenary_id,
                name: details.name,
                icon: details.icon,
                type: details.type,
                rarity: details.rarity || 'common',
                count: 1, 
                sellPrice: Math.floor((details.cost || 100) * 0.5) // Sell for 50%
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
                    gameVersion: worldState.gameVersion
                });
            } catch (error) {
                app.events.broadcast("receiveWorldData", { nodes: [], player: {x: 400, y: 300}, origin: 'default', gameVersion: 'standard' });
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
                // Ensure ratio is extracted and passed
                const { focusSeconds, ratio } = payload;
                const minutes = focusSeconds / 60;
                
                const result = this.repo.distributeSessionXP(minutes, ratio);
                
                // Notify frontend to show an RPG toast/logs
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

        app.events.on("getContractsForNode", (payload) => {
            try {
                const contracts = this.repo.getOrGenerateContracts(payload.nodeId);
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
                // Delete contract
                this.repo.cancelContract(payload.contractId);
                
                // Issue reputation penalty (-10)
                this.repo.updateNodeReputation(payload.nodeId, -10);
                
                app.events.broadcast("contractAborted", { success: true });
            } catch(e) { console.error(e); }
        });

        app.events.on("getMarketData", (payload) => {
            try {
                const resources = this.repo.getResources();
                const enrichedInventory = this._getEnrichedInventory();
                const shopItems = generateMockShop(payload.nodeType);

                app.events.broadcast("receiveMarketData", { 
                    gold: resources.gold,
                    inventory: enrichedInventory,
                    shopItems: shopItems
                });
            } catch(e) { console.error(e); }
        });

        app.events.on("buyItem", (payload) => {
            try {
                this.repo.updateGold(-payload.cost);
                this.repo.addItemToInventory(payload.itemId);
                
                if (payload.nodeId) {
                    const repGain = Math.max(1, Math.floor(payload.cost / 100)); // Minimum 1 rep, scales with cost
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
    }

    _refreshParty(app) {
        const mercs = this.repo.getAllMercenaries();
        const resources = this.repo.getResources();
        const inventory = this._getEnrichedInventory();
        app.events.broadcast("receivePartyData", { mercenaries: mercs, resources, inventory });
    }
}