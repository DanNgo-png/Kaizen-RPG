import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';
import { ItemFactory } from '../../../factories/ItemFactory.mjs';
import {
    formatSpecializations,
    normalizeSpecializations,
    serializeSpecializations
} from '../../../data/GameDataConstants.mjs';
import { ContractService } from '../../../services/contracts/ContractService.mjs';
import { SettlementDevelopmentService } from '../../../services/simulation/SettlementDevelopmentService.mjs';
import { WorldSimulator } from '../../../services/simulation/WorldSimulator.mjs';
import { prepareGameStatements } from './game/GameStatementFactory.mjs';
import {
    CONTRACT_INFLUENCE_TERM_BY_ID,
    CONTRACT_SESSION_RISK,
    DAILY_CAMP_UPKEEP,
    DUNGEON_DELVE_SESSION,
    IDLE_SESSION_CONFIG,
    INVENTORY_DEFAULTS,
    MERCENARY_DEFAULTS,
    MIN_GOLD_BALANCE,
    NO_GOLD_DELTA,
    PARTY_STRENGTH,
    RANDOM_SESSION_EVENT,
    RESOURCE_DEFAULTS,
    SESSION_TIMING,
    TIME_PROGRESSION,
    WORLD_NODE_DEFAULTS
} from './game/GameRepositoryConstants.mjs';

export class GameRepository {
    constructor() {
        this.db = null;
        this.statements = {};
        this.contracts = new ContractService(this);
        this.settlementDevelopment = new SettlementDevelopmentService(this);
    }

    initialize(slotId) {
        this.db = loadGameDatabase(slotId);
        this._prepareStatements();
    }

    ensureConnection() {
        const activeDB = getActiveGameDB();
        if (this.db !== activeDB) {
            this.db = activeDB;
            this._prepareStatements();
        }
    }

    _prepareStatements() {
        if (!this.db) return;

        this.statements = prepareGameStatements(this.db);
    }

    // --- NODE HISTORY & PINNING ---
    toggleNodePin(nodeId) {
        this.ensureConnection();
        this.statements.togglePin.run(nodeId);
    }

    getNodeHistory(nodeId) {
        this.ensureConnection();
        return this.statements.getNodeHistory.all(nodeId);
    }

    getAllHistory() {
        this.ensureConnection();
        return this.statements.getAllHistory.all();
    }

    logNodeHistory(nodeId, text, type = 'world') {
        this.ensureConnection();
        const currentDay = parseInt(
            this.statements.getSetting.get('day')?.value || String(RESOURCE_DEFAULTS.DAY)
        );
        this.statements.insertNodeHistory.run({ node_id: nodeId, day: currentDay, text: text, type: type });
    }

    // --- CONTRACTS ---
    getOrGenerateContracts(...args) {
        return this.contracts.getOrGenerateContracts(...args);
    }

    acceptContract(...args) {
        return this.contracts.acceptContract(...args);
    }

    negotiateContractTerm(...args) {
        return this.contracts.negotiateContractTerm(...args);
    }

    startHostileSettlementClearing(...args) {
        return this.contracts.startHostileSettlementClearing(...args);
    }

    getActiveContract(...args) {
        return this.contracts.getActiveContract(...args);
    }

    cancelContract(...args) {
        return this.contracts.cancelContract(...args);
    }

    updateContractProgress(...args) {
        return this.contracts.updateContractProgress(...args);
    }

    completeActiveContract(...args) {
        return this.contracts.completeActiveContract(...args);
    }

    _contractHasTerm(...args) {
        return this.contracts._contractHasTerm(...args);
    }

    // --- INVENTORY & EQUIPPING ---
    getInventory() {
        this.ensureConnection();
        return this.statements.getInventory.all();
    }

    deleteItemFromInventory(inventoryId) {
        this.ensureConnection();
        return this.statements.deleteItem.run(inventoryId);
    }

    equipItem(inventoryId, mercenaryId, equipSlot) {
        this.ensureConnection();
        const db = this.db;
        
        return db.transaction(() => {
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id = ? AND equip_slot = ?').get(mercenaryId, equipSlot);
            
            if (existing) {
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = INVENTORY_DEFAULTS.FIRST_STASH_SLOT;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            db.prepare('UPDATE inventory SET mercenary_id = ?, equip_slot = ?, stash_slot = NULL WHERE id = ?').run(mercenaryId, equipSlot, inventoryId);
        })();
    }

    unequipItem(inventoryId, targetStashSlot) {
        this.ensureConnection();
        const db = this.db;
        
        return db.transaction(() => {
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id IS NULL AND stash_slot = ?').get(targetStashSlot);
            if (existing) {
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = INVENTORY_DEFAULTS.FIRST_STASH_SLOT;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(targetStashSlot, inventoryId);
        })();
    }

    // --- REPUTATION ---
    updateNodeReputation(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateReputation.run(amount, nodeId);
    }

    updateNodeInfluence(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateNodeInfluence.run({ id: nodeId, amount });
    }
    
    // --- NODE HISTORY, SHOP, & PINNING ---
    updateNodeShopData(nodeId, inventoryJson, lastRestock, nextTrade) {
        this.ensureConnection();
        this.statements.updateNodeShop.run({
            id: nodeId,
            inv: inventoryJson,
            lastRestock: lastRestock,
            nextTrade: nextTrade
        });
    }

    // --- WORLD MAP & POSITION ---
    getNodeById(id) {
        this.ensureConnection();
        return this._mapWorldNode(this.statements.getNodeById.get(id));
    }

    getWorldState() {
        this.ensureConnection();
        const nodes = this.statements.getAllNodes.all().map((node) => this._mapWorldNode(node));

        const px = this.statements.getSetting.get('player_x')?.value || String(RESOURCE_DEFAULTS.PLAYER_X);
        const py = this.statements.getSetting.get('player_y')?.value || String(RESOURCE_DEFAULTS.PLAYER_Y);

        const origin = this.statements.getSetting.get('origin')?.value || 'sellswords';
        const gameVersion = this.statements.getSetting.get('game_version')?.value || 'standard';
        const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';

        return {
            nodes,
            player: { x: parseFloat(px), y: parseFloat(py) },
            origin,
            gameVersion,
            isDelving
        };
    }

    savePlayerPosition(x, y) {
        this.ensureConnection();
        const db = this.db;
        const insert = this.statements.insertSetting;

        const txn = db.transaction(() => {
            insert.run({ key: 'player_x', value: String(x) });
            insert.run({ key: 'player_y', value: String(y) });
        });
        txn();
    }

    // --- GAMEPLAY LOGIC ---
    distributeSessionXP(focusMinutes, ratio = 1.0) {
        this.ensureConnection();

        const origin = this.statements.getSetting.get('origin')?.value || 'sellswords';
        const gameVersion = this.statements.getSetting.get('game_version')?.value || 'standard';

        const baseXpAmount = Math.floor(focusMinutes * SESSION_TIMING.XP_PER_MINUTE * ratio);

        const logs = [];
        const foundLoot = [];

        const rollForLoot = (chancePercentage, isDeep = false) => {
            if (Math.random() < chancePercentage) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ ${isDeep ? 'Deep floor treasure' : 'Found loot'}: ${newItem.name}`);
                return true;
            }
            return false;
        };

        const activeMercs = this.statements.getAll.all();
        const equippedRaw = this.db.prepare('SELECT * FROM inventory WHERE mercenary_id IS NOT NULL AND equip_slot IS NOT NULL').all();

        let partyTotalAttack = 0;
        let tankCount = 0;
        let totalPartyPower = 0;

        activeMercs.forEach(merc => {
            merc.totalAttack = 0;
            merc.totalDefense = 0;
            merc.fatiguePenalty = 0;
            merc.xpBonus = 0;

            const mercGear = equippedRaw.filter(i => i.mercenary_id === merc.id);
            mercGear.forEach(gear => {
                const template = ItemFactory.createItem(gear.item_id);
                if (template && template.stats) {
                    merc.totalAttack += (template.stats.attack || 0);
                    merc.totalDefense += (template.stats.defense || 0);
                    merc.fatiguePenalty += Math.abs(template.stats.fatigue_penalty || 0);
                    
                    if (template.stats.xp_multiplier) {
                        merc.xpBonus += (template.stats.xp_multiplier - 1);
                    }
                }
                
                if (
                    origin === 'dungeon'
                    && gameVersion === 'barebones'
                    && Math.random() < DUNGEON_DELVE_SESSION.GEAR_DURABILITY_LOSS_CHANCE
                ) {
                    this.db.prepare('UPDATE inventory SET durability = MAX(0, durability - 1) WHERE id = ?').run(gear.id);
                }
            });

            partyTotalAttack += merc.totalAttack;

            let mercPower = (merc.str || 10) + (merc.spd || 10) + (merc.int || 10) + merc.totalAttack + merc.totalDefense;
            if (['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                tankCount++;
                mercPower *= 1.2;
            }
            totalPartyPower += mercPower;
        });

        let daysPassed = 0;

        const currentAccumulated = parseFloat(
            this.statements.getSetting.get('accumulated_time')?.value || String(RESOURCE_DEFAULTS.ACCUMULATED_TIME)
        );
        let newAccumulated = currentAccumulated + focusMinutes;

        while (newAccumulated >= SESSION_TIMING.MINUTES_PER_DAY) {
            newAccumulated -= SESSION_TIMING.MINUTES_PER_DAY;
            daysPassed++;
            const dayResult = this.processDayEnd();

            logs.push(`🌙 Day ${dayResult.day - TIME_PROGRESSION.DAY_INCREMENT} ended. Paid ${dayResult.wagesPaid}g in wages.`);
            if (dayResult.provisionsConsumed > 0) {
                logs.push(`🍞 Consumed ${dayResult.provisionsConsumed} provisions.`);
            }
            if (dayResult.consumedItemsCount > 0) {
                logs.push(`🍴 Ate ${dayResult.consumedItemsCount} food item(s) from stash.`);
            }
            if (dayResult.starvationTriggered) {
                logs.push(`⚠️ STARVATION! The company starved and grew weak.`);
            }
            if (dayResult.medicineUsed > 0 || dayResult.totalHealed > 0) {
                logs.push(`⚕️ Recovered ${dayResult.totalHealed} HP using ${dayResult.medicineUsed} meds.`);
            }
            if (dayResult.spoiledCount > 0) {
                logs.push(`🍞 ${dayResult.spoiledCount} food item(s) spoiled!`);
            }
            if (dayResult.factionLogs && dayResult.factionLogs.length > 0) {
                dayResult.factionLogs.forEach(log => logs.push(`📢 ${log}`));
            }
        }
        this.setCampaignSetting('accumulated_time', newAccumulated);

        if (origin === 'dungeon' && gameVersion === 'barebones') {
            const activeContract = this.getActiveContract();
            const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';

            if (activeContract) {
                const footmenTerm = CONTRACT_INFLUENCE_TERM_BY_ID.get('footmen');
                const hasFootmen = Boolean(footmenTerm && this._contractHasTerm(activeContract, footmenTerm.id));
                const contractDamageChance = hasFootmen
                    ? CONTRACT_SESSION_RISK.BASE_DAMAGE_CHANCE * footmenTerm.damageChanceMultiplier
                    : CONTRACT_SESSION_RISK.BASE_DAMAGE_CHANCE;

                if (hasFootmen) {
                    logs.push("Noble footmen screened the company during the contract, lowering the danger of stray attacks.");
                }

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / CONTRACT_SESSION_RISK.FATIGUE_MINUTES_PER_POINT)
                        + Math.floor(merc.fatiguePenalty / CONTRACT_SESSION_RISK.FATIGUE_GEAR_DIVISOR);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    if (Math.random() < contractDamageChance) {
                        const rawDamage = Math.floor(Math.random() * CONTRACT_SESSION_RISK.DAMAGE_ROLL_RANGE * ratio)
                            + CONTRACT_SESSION_RISK.MIN_DAMAGE;
                        const defMitigation = Math.floor(merc.totalDefense / CONTRACT_SESSION_RISK.DEFENSE_MITIGATION_DIVISOR);
                        const finalDamage = Math.max(0, rawDamage - defMitigation);
                        
                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            logs.push(`⚔️ ${merc.name} took ${finalDamage} damage fending off a wandering beast.`);
                        }
                    }
                });

                if (Math.random() < CONTRACT_SESSION_RISK.TRAVELERS_ENCOUNTER_CHANCE) {
                    logs.push(`🏕️ The party encountered travelers on the road during the contract.`);
                }

                const attackLootBonus = (partyTotalAttack / CONTRACT_SESSION_RISK.ATTACK_LOOT_SCORE_DIVISOR)
                    * CONTRACT_SESSION_RISK.ATTACK_LOOT_BONUS_RATE;
                const lootChance = CONTRACT_SESSION_RISK.BASE_LOOT_CHANCE + attackLootBonus;
                const rolls = Math.max(
                    CONTRACT_SESSION_RISK.MIN_LOOT_ROLLS,
                    Math.floor(focusMinutes / CONTRACT_SESSION_RISK.MINUTES_PER_LOOT_ROLL)
                );

                for(let i=0; i<rolls; i++) rollForLoot(lootChance);

                if (logs.length === 0 && daysPassed === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
                const attackGoldMultiplier = 1 + (partyTotalAttack / DUNGEON_DELVE_SESSION.ATTACK_GOLD_SCORE_DIVISOR);
                const goldFound = Math.floor(focusMinutes * ratio * DUNGEON_DELVE_SESSION.GOLD_PER_MINUTE * attackGoldMultiplier);
                
                this.updateGold(goldFound);
                
                if (focusMinutes >= DUNGEON_DELVE_SESSION.MIN_LOOT_ROLLS) {
                    logs.push(`🕳️ The party delved into the dungeon for ${Math.round(focusMinutes)} minutes.`);
                    logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                } else {
                    logs.push(`🕳️ The party briefly scouted the dungeon entrance.`);
                    if (goldFound > 0) logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                }

                // Calculate threat and damage chances dynamically based on session time & party power
                const dungeonThreat = focusMinutes * DUNGEON_DELVE_SESSION.BASE_THREAT_PER_MINUTE * ratio;
                const dangerMultiplier = Math.max(
                    DUNGEON_DELVE_SESSION.MIN_DANGER_MULTIPLIER,
                    dungeonThreat / Math.max(PARTY_STRENGTH.MIN_MAX_HP, totalPartyPower)
                );
                const adjustedDamageChance = Math.min(
                    DUNGEON_DELVE_SESSION.MAX_DAMAGE_CHANCE,
                    DUNGEON_DELVE_SESSION.BASE_DAMAGE_CHANCE * dangerMultiplier
                );
                const tankProtectionBonus = tankCount * DUNGEON_DELVE_SESSION.TANK_PROTECTION_RATE;

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / DUNGEON_DELVE_SESSION.FATIGUE_MINUTES_PER_POINT)
                        + Math.floor(merc.fatiguePenalty / DUNGEON_DELVE_SESSION.FATIGUE_GEAR_DIVISOR);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    // Tanks (Vanguards/Hedge Knights) absorb blows, lowering the hit chance for squishier roles
                    let personalHitChance = adjustedDamageChance;
                    if (!['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                        personalHitChance = Math.max(DUNGEON_DELVE_SESSION.NON_TANK_MIN_HIT_CHANCE, personalHitChance - tankProtectionBonus);
                    } else {
                        personalHitChance = Math.min(
                            DUNGEON_DELVE_SESSION.TANK_MAX_HIT_CHANCE,
                            personalHitChance + DUNGEON_DELVE_SESSION.TANK_HIT_CHANCE_BONUS
                        );
                    }

                    if (Math.random() < personalHitChance) {
                        const rawDamage = Math.floor(Math.random() * DUNGEON_DELVE_SESSION.DAMAGE_ROLL_RANGE * ratio)
                            + DUNGEON_DELVE_SESSION.MIN_DAMAGE;
                        const defenseMitigation = Math.floor((merc.str + merc.level) / DUNGEON_DELVE_SESSION.DEFENSE_ATTRIBUTE_DIVISOR)
                            + Math.floor(merc.totalDefense / DUNGEON_DELVE_SESSION.DEFENSE_GEAR_DIVISOR);
                        const finalDamage = Math.max(0, rawDamage - defenseMitigation);

                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            if (finalDamage > DUNGEON_DELVE_SESSION.SEVERE_DAMAGE_THRESHOLD) {
                                logs.push(`🩸 ${merc.name} took a vicious blow for ${finalDamage} damage!`);
                            } else {
                                logs.push(`⚔️ ${merc.name} suffered ${finalDamage} damage in a skirmish.`);
                            }
                        } else {
                            logs.push(`🛡️ ${merc.name}'s armor completely deflected an attack!`);
                        }
                    }
                });

                const depthLootBonus = focusMinutes * DUNGEON_DELVE_SESSION.DEPTH_LOOT_BONUS_PER_MINUTE;
                const attackLootBonus = (partyTotalAttack / DUNGEON_DELVE_SESSION.ATTACK_LOOT_SCORE_DIVISOR)
                    * DUNGEON_DELVE_SESSION.ATTACK_LOOT_BONUS_RATE;
                const baseLootChance = DUNGEON_DELVE_SESSION.BASE_LOOT_CHANCE + depthLootBonus + attackLootBonus;
                
                const lootRolls = Math.max(
                    DUNGEON_DELVE_SESSION.MIN_LOOT_ROLLS,
                    Math.floor(focusMinutes / DUNGEON_DELVE_SESSION.MINUTES_PER_LOOT_ROLL)
                );
                let itemsLooted = 0;

                for (let i = 0; i < lootRolls; i++) {
                    if (rollForLoot(baseLootChance)) itemsLooted++; // Ensure internal call references this
                }

                if (focusMinutes >= DUNGEON_DELVE_SESSION.GUARANTEED_LOOT_MIN_MINUTES && itemsLooted === 0) {
                    rollForLoot(1.0);
                }

                if (focusMinutes >= DUNGEON_DELVE_SESSION.DEEP_FLOOR_MIN_MINUTES) {
                    logs.push(`👑 Survived a deep floor! Extra loot granted.`);
                    rollForLoot(DUNGEON_DELVE_SESSION.DEEP_FLOOR_LOOT_CHANCE + depthLootBonus + attackLootBonus);
                    rollForLoot(1.0, true);
                }
            } else {
                // --- NEW IDLE / RESTING STATE (Dungeon Barebones) ---
                const recoveryAmount = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.FATIGUE_RECOVERY_PER_MINUTE);
                const trainingXp = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.XP_PER_MINUTE * ratio);

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(trainingXp * (1 + merc.xpBonus));
                    // Passing negative value to decrease fatigue (Sql clamp MAX(0, fatigue + @fatigue) handles bounds)
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: -recoveryAmount, id: merc.id });
                });

                if (focusMinutes >= IDLE_SESSION_CONFIG.MIN_MINUTES_FOR_LOG) {
                    logs.push(`💤 The company rested in camp, recovering up to ${recoveryAmount} fatigue.`);
                    logs.push(`🛡️ The mercenaries spent the downtime training, earning light experience (+${trainingXp} XP).`);
                }
            }

        } else {
            // Standard map campaign mode checks
            const activeContract = this.getActiveContract();

            if (activeContract) {
                // On duty
                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / CONTRACT_SESSION_RISK.FATIGUE_MINUTES_PER_POINT)
                        + Math.floor(merc.fatiguePenalty / CONTRACT_SESSION_RISK.FATIGUE_GEAR_DIVISOR);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });
                });
            } else {
                // --- IDLE / RESTING STATE (Standard Campaign) ---
                const recoveryAmount = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.FATIGUE_RECOVERY_PER_MINUTE);
                const trainingXp = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.XP_PER_MINUTE * ratio);

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(trainingXp * (1 + merc.xpBonus));
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: -recoveryAmount, id: merc.id });
                });

                if (focusMinutes >= IDLE_SESSION_CONFIG.MIN_MINUTES_FOR_LOG) {
                    logs.push(`💤 The company paused on the road to rest, recovering up to ${recoveryAmount} fatigue.`);
                    logs.push(`🛡️ The mercenaries drilled during the halt, earning light experience (+${trainingXp} XP).`);
                }
            }
        }

        // --- TRIGGER RANDOM SESSION EVENT ---
        this._triggerRandomSessionEvent(focusMinutes, logs, foundLoot, activeMercs, ratio);

        const totalXpGranted = activeMercs.reduce((sum, m) => sum + Math.floor(baseXpAmount * (1 + m.xpBonus)), 0);

        return { xp: Math.floor(totalXpGranted/Math.max(1, activeMercs.length)), logs: logs, loot: foundLoot };
    }

    /**
     * Reduces active mercenaries' fatigue based on break time taken.
     * Rate: 1 fatigue point per 5 minutes of break (mirrors the gain rate).
     * Fatigue is clamped to a minimum of 0 (handled by SQL MAX(0, ...)).
     * @param {number} breakMinutes - Total break minutes from the session.
     * @returns {number} Amount of fatigue recovered per merc.
     */
    distributeBreakFatigueRecovery(breakMinutes) {
        this.ensureConnection();
        if (!breakMinutes || breakMinutes <= 0) return 0;

        const fatigueRecovery = Math.floor(breakMinutes / CONTRACT_SESSION_RISK.FATIGUE_MINUTES_PER_POINT);
        if (fatigueRecovery <= 0) return 0;

        this.statements.reduceFatigue.run({ amount: fatigueRecovery });
        console.log(`😴 Break recovery: -${fatigueRecovery} fatigue to all active mercs (${Math.round(breakMinutes)}m break).`);
        return fatigueRecovery;
    }

    processDayEnd() {
        this.ensureConnection();

        const db = this.db;
        const result = db.transaction(() => {
            const currentDay = parseInt(this.statements.getSetting.get('day')?.value || String(RESOURCE_DEFAULTS.DAY));
            const currentGold = parseInt(this.statements.getSetting.get('gold')?.value || String(RESOURCE_DEFAULTS.GOLD));
            let currentMedicine = parseInt(
                this.statements.getSetting.get('medicine')?.value || String(RESOURCE_DEFAULTS.MEDICINE)
            );
            const totalWages = this.statements.getWages.get().total || 0;

            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            const allMercs = this.db.prepare('SELECT * FROM mercenaries').all();

            // --- PROVISIONS CONSUMPTION ---
            let looseProvisions = parseInt(
                db.prepare("SELECT value FROM campaign_settings WHERE key = 'provisions'").get()?.value
                    || String(DAILY_CAMP_UPKEEP.DEFAULT_PROVISIONS)
            );
            const totalMercCount = allMercs.length;
            const originalFoodNeeded = totalMercCount * DAILY_CAMP_UPKEEP.PROVISIONS_CONSUMED_PER_MERC;
            let foodNeeded = originalFoodNeeded;
            let consumedItemsCount = 0;
            let starvationTriggered = false;

            if (foodNeeded > 0) {
                if (looseProvisions >= foodNeeded) {
                    looseProvisions -= foodNeeded;
                    foodNeeded = 0;
                } else {
                    foodNeeded -= looseProvisions;
                    looseProvisions = 0;

                    // Grab items currently stored in the stash
                    const stashItems = db.prepare(`
                        SELECT id, item_id 
                        FROM inventory 
                        WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL
                    `).all();

                    const foodItems = [];
                    stashItems.forEach(item => {
                        const template = ItemFactory.createItem(item.item_id);
                        if (template && template.type === 'Provision') {
                            foodItems.push({ id: item.id, template });
                        }
                    });

                    // Consume physical food items one by one until the hunger is satisfied
                    for (const food of foodItems) {
                        if (foodNeeded <= 0) break;

                        const itemProvisions = food.template.stats?.provisions || DAILY_CAMP_UPKEEP.DEFAULT_ITEM_PROVISIONS;
                        db.prepare('DELETE FROM inventory WHERE id = ?').run(food.id);
                        consumedItemsCount++;

                        if (itemProvisions >= foodNeeded) {
                            looseProvisions = itemProvisions - foodNeeded;
                            foodNeeded = 0;
                        } else {
                            foodNeeded -= itemProvisions;
                        }
                    }

                    if (foodNeeded > 0) {
                        starvationTriggered = true;
                    }
                }
            }

            // Save modified loose provisions back to settings
            this.statements.updateSetting.run({ key: 'provisions', value: String(looseProvisions) });

            let medicineUsed = 0;
            let totalHealed = 0;

            allMercs.forEach(m => {
                let fatigueDecrease = m.is_active
                    ? DAILY_CAMP_UPKEEP.FATIGUE_RECOVERY_ACTIVE
                    : DAILY_CAMP_UPKEEP.FATIGUE_RECOVERY_RESTING;
                let newFatigue = Math.max(0, m.fatigue - fatigueDecrease);

                // Apply starvation penalties if no food was available
                let hpPenalty = 0;
                if (starvationTriggered) {
                    hpPenalty = DAILY_CAMP_UPKEEP.STARVATION_HP_DAMAGE;
                    newFatigue = Math.min(PARTY_STRENGTH.FATIGUE_MAX, newFatigue + DAILY_CAMP_UPKEEP.STARVATION_FATIGUE_GAIN);
                }

                // Apply natural HP recovery
                let hpToHeal = 0;
                if (m.current_hp < m.max_hp) {
                    if (currentMedicine > 0) {
                        hpToHeal = Math.min(DAILY_CAMP_UPKEEP.BASE_HEAL_MEDS, m.max_hp - m.current_hp);
                        currentMedicine--;
                        medicineUsed++;
                    } else {
                        hpToHeal = Math.min(DAILY_CAMP_UPKEEP.BASE_HEAL_NO_MEDS, m.max_hp - m.current_hp);
                    }
                }
                
                totalHealed += hpToHeal;
                // Calculate final HP; clamp to 1 HP during sleep starvation so they don't die instantly
                const finalHp = Math.max(DAILY_CAMP_UPKEEP.MIN_SLEEP_HP, m.current_hp + hpToHeal - hpPenalty);
                
                this.db.prepare(`
                    UPDATE mercenaries 
                    SET current_hp = ?, fatigue = ?
                    WHERE id = ?
                `).run(finalHp, newFatigue, m.id);
            });

            let spoiledCount = 0;
            const perishableItems = this.db.prepare(`
                SELECT i.id, i.item_id, i.durability 
                FROM inventory i 
                WHERE i.mercenary_id IS NULL AND i.stash_slot IS NOT NULL
            `).all();

            perishableItems.forEach(invItem => {
                const template = ItemFactory.createItem(invItem.item_id);
                if (template.stats && template.stats.spoil_days) {
                    const newDurability = invItem.durability - 1;
                    if (newDurability <= 0) {
                        this.db.prepare('DELETE FROM inventory WHERE id = ?').run(invItem.id);
                        spoiledCount++;
                    } else {
                        this.db.prepare('UPDATE inventory SET durability = ? WHERE id = ?').run(newDurability, invItem.id);
                    }
                }
            });

            // ============================================
            // FACTION TICK SYSTEM 
            // ============================================
            const simulator = new WorldSimulator(this);
            const factionLogs = simulator.processDayEnd(currentDay);

            this.statements.updateSetting.run({ key: 'medicine', value: currentMedicine });
            this.statements.updateSetting.run({ key: 'day', value: currentDay + TIME_PROGRESSION.DAY_INCREMENT });

            return { 
                newGold, 
                day: currentDay + TIME_PROGRESSION.DAY_INCREMENT,
                wagesPaid: totalWages, 
                medicineUsed, 
                totalHealed, 
                spoiledCount, 
                factionLogs,
                provisionsConsumed: originalFoodNeeded - foodNeeded,
                starvationTriggered,
                consumedItemsCount
            };
        })();

        return result;
    }

    setCampaignSetting(key, value) {
        this.ensureConnection();
        return this.statements.insertSetting.run({ key, value: String(value) });
    }

    createFaction(faction) {
        this.ensureConnection();
        return this.statements.insertFaction.run({
            name: faction.name,
            color: faction.color,
            archetype: faction.archetype,
            motto: faction.motto ?? null,
            type: faction.type ?? 'noble' 
        });
    }

    addItemToInventory(itemId, mercId = null) {
        this.ensureConnection();
        let stashSlot = null;
        if (mercId === null) {
            const currentItems = this.statements.getInventory.all().filter(i => i.mercenary_id === null && i.stash_slot !== null);
            const occupied = new Set(currentItems.map(i => i.stash_slot));
            stashSlot = INVENTORY_DEFAULTS.FIRST_STASH_SLOT;
            while (occupied.has(stashSlot)) stashSlot++;
        }

        const template = ItemFactory.createItem(itemId);
        let dur = INVENTORY_DEFAULTS.FULL_DURABILITY;
        if (template.stats && template.stats.spoil_days) {
            dur = template.stats.spoil_days;
        }

        return this.statements.insertItem.run({ itemId, mercId, durability: dur, stashSlot });
    }

    moveItemInStash(inventoryId, newSlot) {
        this.ensureConnection();
        const draggedItem = this.db.prepare('SELECT stash_slot FROM inventory WHERE id = ?').get(inventoryId);
        if (!draggedItem) return;

        const existingItem = this.db.prepare('SELECT id FROM inventory WHERE stash_slot = ? AND mercenary_id IS NULL').get(newSlot);

        const db = this.db;
        const txn = db.transaction(() => {
            if (existingItem) {
                this.statements.updateItemSlot.run({ slot: draggedItem.stash_slot, id: existingItem.id });
            }
            this.statements.updateItemSlot.run({ slot: newSlot, id: inventoryId });
        });
        txn();
    }

    createWorldNode(node) {
        this.ensureConnection();
        const specialization = node.specializations ?? node.specialization;

        return this.statements.insertNode.run({
            type: node.type,
            name: node.name,
            x: node.x,
            y: node.y,
            faction_id: node.faction_id ?? null,
            reputation: node.reputation ?? WORLD_NODE_DEFAULTS.REPUTATION,
            buy_modifier: node.buy_modifier ?? WORLD_NODE_DEFAULTS.BUY_MODIFIER,
            sell_modifier: node.sell_modifier ?? WORLD_NODE_DEFAULTS.SELL_MODIFIER,
            specialization: serializeSpecializations(specialization),
            attachments: node.attachments ?? WORLD_NODE_DEFAULTS.ATTACHMENTS,
            influence: node.influence ?? WORLD_NODE_DEFAULTS.INFLUENCE
        });
    }

    updateNodeSpecialization(nodeId, specializations) {
        this.ensureConnection();
        return this.statements.updateNodeSpecialization.run({
            id: nodeId,
            specialization: serializeSpecializations(specializations)
        });
    }

    getFactions() {
        this.ensureConnection();
        return this.statements.getAllFactions.all();
    }

    getWorldNodes() {
        this.ensureConnection();
        return this.statements.getAllNodes.all().map((node) => this._mapWorldNode(node));
    }

    getResources() {
        this.ensureConnection();
        const getSet = (k, def) => parseInt(this.statements.getSetting.get(k)?.value || def);

        const gold = getSet('gold', RESOURCE_DEFAULTS.GOLD);
        const renown = getSet('renown', RESOURCE_DEFAULTS.RENOWN);
        let provisions = getSet('provisions', RESOURCE_DEFAULTS.PROVISIONS);
        const tools = getSet('tools', RESOURCE_DEFAULTS.TOOLS);
        const ammo = getSet('ammo', RESOURCE_DEFAULTS.AMMO);
        const medicine = getSet('medicine', RESOURCE_DEFAULTS.MEDICINE);

        const day = getSet('day', RESOURCE_DEFAULTS.DAY);
        const accumulated_time = parseFloat(
            this.statements.getSetting.get('accumulated_time')?.value || String(RESOURCE_DEFAULTS.ACCUMULATED_TIME)
        );

        const inventoryItems = this.statements.getInventory.all();
        inventoryItems.forEach(inv => {
            const template = ItemFactory.createItem(inv.item_id);
            if (template.stats && template.stats.provisions) {
                provisions += template.stats.provisions;
            }
        });

        const totalWages = this.statements.getWages.get().total || 0;
        const mercCount = this.statements.getAll.all().length;
        const foodPerDay = mercCount * DAILY_CAMP_UPKEEP.PROVISIONS_CONSUMED_PER_MERC;
        const partyStrength = this.getPartyStrengthSummary();

        return { gold, renown, provisions, tools, ammo, medicine, dailyWages: totalWages, foodPerDay, day, accumulated_time, partyStrength };
    }

    getPartyStrengthSummary() {
        this.ensureConnection();
        const mercenaries = this.statements.getAll.all();
        const equipmentStatsByMercenary = this._getEquipmentStatsByMercenary();
        const score = mercenaries.reduce((sum, mercenary) => {
            return sum + this._calculateMercenaryStrength(mercenary, equipmentStatsByMercenary.get(mercenary.id));
        }, 0);

        const rating = PARTY_STRENGTH.RATINGS.find((item) => score >= item.minScore) || PARTY_STRENGTH.RATINGS.at(-1);
        const progressPercent = Math.min(
            Math.round((score / PARTY_STRENGTH.PROGRESS_SCORE_CAP) * PARTY_STRENGTH.PROGRESS_PERCENT_MAX),
            PARTY_STRENGTH.PROGRESS_PERCENT_MAX
        );

        return {
            score,
            rating: rating.label,
            progressPercent,
            activeCount: mercenaries.length
        };
    }

    _getEquipmentStatsByMercenary() {
        const equippedItems = this.db.prepare('SELECT * FROM inventory WHERE mercenary_id IS NOT NULL AND equip_slot IS NOT NULL').all();
        const statsByMercenary = new Map();

        equippedItems.forEach((inventoryItem) => {
            const template = ItemFactory.createItem(inventoryItem.item_id);
            const currentStats = statsByMercenary.get(inventoryItem.mercenary_id) || { attack: 0, defense: 0 };

            currentStats.attack += template.stats?.attack || 0;
            currentStats.defense += template.stats?.defense || 0;

            statsByMercenary.set(inventoryItem.mercenary_id, currentStats);
        });

        return statsByMercenary;
    }

    _calculateMercenaryStrength(mercenary, equipmentStats = { attack: 0, defense: 0 }) {
        const levelScore = (mercenary.level || PARTY_STRENGTH.DEFAULT_LEVEL) * PARTY_STRENGTH.LEVEL_WEIGHT;
        const attributeScore =
            (mercenary.str || PARTY_STRENGTH.DEFAULT_ATTRIBUTE)
            + (mercenary.int || PARTY_STRENGTH.DEFAULT_ATTRIBUTE)
            + (mercenary.spd || PARTY_STRENGTH.DEFAULT_ATTRIBUTE);
        const rawScore = levelScore + attributeScore + equipmentStats.attack + equipmentStats.defense;

        const maxHp = Math.max(mercenary.max_hp || PARTY_STRENGTH.DEFAULT_MAX_HP, PARTY_STRENGTH.MIN_MAX_HP);
        const currentHp = Math.max(0, mercenary.current_hp ?? maxHp);
        const healthPenaltyRatio = (1 - Math.min(currentHp / maxHp, 1)) * PARTY_STRENGTH.HEALTH_PENALTY_MAX_RATIO;
        const fatigueRatio = Math.min((mercenary.fatigue || 0) / PARTY_STRENGTH.FATIGUE_MAX, 1);
        const fatiguePenaltyRatio = fatigueRatio * PARTY_STRENGTH.FATIGUE_PENALTY_MAX_RATIO;
        const readinessRatio = Math.max(
            PARTY_STRENGTH.MIN_READINESS_RATIO,
            1 - healthPenaltyRatio - fatiguePenaltyRatio
        );

        return Math.round(rawScore * readinessRatio);
    }

    updateGold(amount) {
        this.ensureConnection();
        const delta = Number(amount);
        if (!Number.isFinite(delta)) throw new Error("Invalid Gold Amount");

        const current = this.getResources().gold;
        const newAmount = current + delta;
        if (delta < NO_GOLD_DELTA && newAmount < MIN_GOLD_BALANCE) {
            throw new Error("Insufficient Gold");
        }

        this.statements.updateSetting.run({ key: 'gold', value: newAmount });
        return newAmount;
    }

    updateRenown(amount) {
        this.ensureConnection();
        const delta = Number(amount);
        if (!Number.isFinite(delta)) throw new Error("Invalid Renown Amount");

        const current = this.getResources().renown;
        const newAmount = Math.max(0, current + delta);
        this.statements.updateSetting.run({ key: 'renown', value: newAmount });
        return newAmount;
    }

    getAllMercenaries() {
        this.ensureConnection();
        return this.statements.getAll.all();
    }

    addMercenary(merc) {
        this.ensureConnection();
        return this.statements.insert.run({
            name: merc.name,
            role: merc.role || MERCENARY_DEFAULTS.ROLE,
            level: merc.level || MERCENARY_DEFAULTS.LEVEL,
            str: merc.str || MERCENARY_DEFAULTS.ATTRIBUTE,
            int: merc.int || MERCENARY_DEFAULTS.ATTRIBUTE,
            spd: merc.spd || MERCENARY_DEFAULTS.ATTRIBUTE,
            max_hp: merc.max_hp || MERCENARY_DEFAULTS.MAX_HP,
            current_hp: merc.current_hp || MERCENARY_DEFAULTS.CURRENT_HP,
            wage: merc.wage || MERCENARY_DEFAULTS.WAGE
        });
    }

    _mapWorldNode(row) {
        if (!row) return row;

        const {
            faction_name,
            faction_color,
            faction_archetype,
            faction_motto,
            ...node
        } = row;

        node.faction = faction_name
            ? {
                id: node.faction_id,
                name: faction_name,
                color: faction_color,
                archetype: faction_archetype,
                motto: faction_motto
            }
            : null;

        node.specializations = normalizeSpecializations(node.specialization);
        node.specialization = formatSpecializations(node.specializations);
        node.influence = Number(node.influence) || 0;

        return node;
    }

    // --- SETTLEMENT DEVELOPMENT ---
    _trackSettlementContractGrowth(...args) {
        return this.settlementDevelopment.trackSettlementContractGrowth(...args);
    }

    updateNodeDevelopment(...args) {
        return this.settlementDevelopment.updateNodeDevelopment(...args);
    }

    spawnColony(...args) {
        return this.settlementDevelopment.spawnColony(...args);
    }

    logTradeVolume(...args) {
        return this.settlementDevelopment.logTradeVolume(...args);
    }

    _triggerRandomSessionEvent(focusMinutes, logs, foundLoot, activeMercs, ratio) {
        if (focusMinutes < RANDOM_SESSION_EVENT.MIN_DURATION_MINS || activeMercs.length === 0) return;

        if (Math.random() > RANDOM_SESSION_EVENT.TRIGGER_CHANCE) return;

        const events = [
            // Event 1: Abandoned Carriage
            () => {
                const goldFound = Math.floor(
                    RANDOM_SESSION_EVENT.CARRIAGE_GOLD_MIN
                    + Math.random() * RANDOM_SESSION_EVENT.CARRIAGE_GOLD_RANGE
                );
                this.updateGold(goldFound);
                
                const tools = parseInt(
                    this.statements.getSetting.get('tools')?.value || String(RANDOM_SESSION_EVENT.DEFAULT_TOOLS)
                );
                this.setCampaignSetting('tools', tools + RANDOM_SESSION_EVENT.CARRIAGE_TOOLS_REWARD);

                logs.push(`📦 [Event] You discover an abandoned carriage in a ditch. Inside, you salvage some supplies (+10 Tools) and a coin purse (+${goldFound} crowns).`);
            },
            // Event 2: Travelling Merchant
            () => {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`🎒 [Event] A travelling peddler crosses paths with your company. Impressed by your presence, he gifts you an item: ${newItem.name}`);
            },
            // Event 3: Wandering Priest
            () => {
                activeMercs.forEach(merc => {
                    this.db.prepare('UPDATE mercenaries SET current_hp = MIN(max_hp, current_hp + ?), fatigue = MAX(0, fatigue - ?) WHERE id = ?')
                        .run(RANDOM_SESSION_EVENT.PRIEST_HEAL, RANDOM_SESSION_EVENT.PRIEST_FATIGUE_RECOVERY, merc.id);
                });
                logs.push(`⛪ [Event] A wandering priest blesses your company. All active mercenaries heal 15 HP and recover 20 fatigue.`);
            },
            // Event 4: Local Legend
            () => {
                this.updateRenown(RANDOM_SESSION_EVENT.LOCAL_LEGEND_RENOWN);
                logs.push(`📣 [Event] Word of your company's growing competence spreads. Gained +5 Renown!`);
            },
            // Event 5: Beast Ambush
            () => {
                const targetMerc = activeMercs[Math.floor(Math.random() * activeMercs.length)];
                const damage = Math.floor(
                    RANDOM_SESSION_EVENT.BEAST_DAMAGE_MIN
                    + Math.random() * RANDOM_SESSION_EVENT.BEAST_DAMAGE_RANGE
                );
                this.statements.damageMercenary.run({ damage, id: targetMerc.id });
                
                this.addItemToInventory('strange_meat');
                const strangeMeatItem = ItemFactory.createItem('strange_meat');
                foundLoot.push(strangeMeatItem);

                logs.push(`⚔️ [Event] While breaking camp, a wild beast ambushes the company! ${targetMerc.name} takes ${damage} damage, but the beast is slain. Salvaged: Strange Meat.`);
            },
            // Event 6: Wandering Scholar
            () => {
                activeMercs.forEach(merc => {
                    this.db.prepare('UPDATE mercenaries SET xp = xp + ? WHERE id = ?').run(RANDOM_SESSION_EVENT.SCHOLAR_XP, merc.id);
                });
                logs.push(`📖 [Event] A traveling scholar shares historical maps and tactics with your group. All active mercenaries gain +35 XP!`);
            }
        ];

        // Trigger a random event from the list
        const selectedEvent = events[Math.floor(Math.random() * events.length)];
        selectedEvent();
    }

    _calculateInitialDevelopmentProgress(...args) {
        return this.settlementDevelopment.calculateInitialDevelopmentProgress(...args);
    }

    triggerSettlementGrowthEvent(...args) {
        return this.settlementDevelopment.triggerSettlementGrowthEvent(...args);
    }

    _chooseFirstSpecializationForNode(...args) {
        return this.settlementDevelopment.chooseFirstSpecializationForNode(...args);
    }

    _chooseColonySpecialization(...args) {
        return this.settlementDevelopment.chooseColonySpecialization(...args);
    }

    incrementNodeDevelopment(...args) {
        return this.settlementDevelopment.incrementNodeDevelopment(...args);
    }

    _shouldTriggerExpansion(...args) {
        return this.settlementDevelopment.shouldTriggerExpansion(...args);
    }

}
