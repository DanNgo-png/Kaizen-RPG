import { ItemFactory } from "../factories/ItemFactory.mjs";
import { internalEventBus } from "../utils/InternalEventBus.mjs";

const SECONDS_PER_MINUTE = 60;
const ROSTER_SIZE_LIMIT = 12;
const DEFAULT_HIRE_COST = 100;
const MIN_RECOVERY_LOG_DURATION_MINS = 5;

export class PartyService {
    constructor(repo, settingsRepo) {
        this.repo = repo;
        this.settingsRepo = settingsRepo;
    }

    getPartyData(marketService, app) {
        try {
            const mercs = this.repo.getAllMercenaries();
            const resources = this.repo.getResources();
            const inventory = marketService._getEnrichedInventory(null);
            
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
    }

    processDayEnd(marketService, app) {
        try {
            const result = this.repo.processDayEnd();
            app.events.broadcast("dayEnded", { success: true, ...result });
            this._refreshParty(marketService, app); 
        } catch (error) {
            app.events.broadcast("dayEnded", { success: false, error: error.message });
        }
    }

    setupXpListeners(marketService, app) {
        internalEventBus.removeAllListeners("sessionCompleted");
        
        internalEventBus.on("sessionCompleted", (payload) => {
            try {
                const { focusSeconds, breakSeconds, ratio } = payload;
                const focusMinutes = focusSeconds / SECONDS_PER_MINUTE;
                const result = this.repo.distributeSessionXP(focusMinutes, ratio);

                const breakMinutes = (breakSeconds || 0) / SECONDS_PER_MINUTE;
                const fatigueRecovered = this.repo.distributeBreakFatigueRecovery(breakMinutes);
                result.fatigueRecovered = fatigueRecovered;

                app.events.broadcast("xpGained", result); 
            } catch (e) {
                if (!e.message.includes("No game save is currently loaded")) {
                    console.error("XP Distribution failed", e);
                }
            }
        });
    }

    hireMercenary(payload, marketService, app) {
        try {
            const cost = payload.cost || DEFAULT_HIRE_COST; 
            const currentRoster = this.repo.getAllMercenaries();
            if (currentRoster.length >= ROSTER_SIZE_LIMIT) {
                throw new Error(`Roster is full (${ROSTER_SIZE_LIMIT}/${ROSTER_SIZE_LIMIT}).`);
            }

            const newGoldBalance = this.repo.updateGold(-cost);
            const result = this.repo.addMercenary(payload.mercData);

            app.events.broadcast("mercenaryHired", {
                success: true,
                newGold: newGoldBalance,
                merc: { id: result.lastInsertRowid, ...payload.mercData }
            });

            this._refreshParty(marketService, app);
        } catch (error) {
            app.events.broadcast("mercenaryHired", { success: false, error: error.message });
        }
    }

    moveInventoryItem(payload, marketService, app) {
        try {
            this.repo.moveItemInStash(payload.inventoryId, payload.newSlotIndex);
            this._refreshParty(marketService, app);
        } catch(e) {
            if (!e.message.includes("No game save is currently loaded")) console.error("Failed to move item:", e);
        }
    }

    equipItem(payload, marketService, app) {
        try {
            this.repo.equipItem(payload.inventoryId, payload.mercenaryId, payload.equipSlot);
            this._refreshParty(marketService, app);
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) console.error("Failed to equip item:", e); 
        }
    }

    unequipItem(payload, marketService, app) {
        try {
            this.repo.unequipItem(payload.inventoryId, payload.stashSlotIndex);
            this._refreshParty(marketService, app);
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) console.error("Failed to unequip item:", e); 
        }
    }

    _refreshParty(marketService, app) {
        const mercs = this.repo.getAllMercenaries();
        const resources = this.repo.getResources();
        const inventory = marketService._getEnrichedInventory(null);
        
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