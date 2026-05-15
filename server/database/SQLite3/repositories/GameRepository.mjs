import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';
import { ItemFactory } from '../../../factories/ItemFactory.mjs';
import { SETTLEMENT_EVENTS, SETTLEMENT_NAMES } from '../../../data/GameDataConstants.mjs';

const WORLD_NODE_SELECT = `
    SELECT 
        world_nodes.*,
        factions.name AS faction_name,
        factions.color AS faction_color,
        factions.archetype AS faction_archetype,
        factions.motto AS faction_motto
    FROM world_nodes
    LEFT JOIN factions ON factions.id = world_nodes.faction_id
`;

export class GameRepository {
    constructor() {
        this.db = null;
        this.statements = {};
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

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM mercenaries WHERE is_active = 1'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare(`
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd, daily_wage, is_active, max_hp, current_hp) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd, @wage, 1, @max_hp, @current_hp)
            `),
            addXp: this.db.prepare(`UPDATE mercenaries SET xp = xp + @amount, fatigue = fatigue + @fatigue WHERE is_active = 1`),
            
            // NEW: Apply individual XP and Fatigue to account for gear penalties
            updateMercXpFatigue: this.db.prepare(`UPDATE mercenaries SET xp = xp + @amount, fatigue = fatigue + @fatigue WHERE id = @id`),

            damageMercenary: this.db.prepare(`UPDATE mercenaries SET current_hp = MAX(0, current_hp - @damage) WHERE id = @id`),
            getWages: this.db.prepare(`SELECT SUM(daily_wage) as total FROM mercenaries`),
            insertLedger: this.db.prepare(`INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)`),

            insertNode: this.db.prepare(`
                INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier, specialization) 
                VALUES (@type, @name, @x, @y, @faction_id, 0, @buy_modifier, @sell_modifier, @specialization)
            `),
            getAllNodes: this.db.prepare(WORLD_NODE_SELECT),

            getNodeById: this.db.prepare(`${WORLD_NODE_SELECT} WHERE world_nodes.id = ?`),
            updateNodeShop: this.db.prepare(`UPDATE world_nodes SET shop_inventory = @inv, last_restock_day = @lastRestock, next_trade_restock_day = @nextTrade WHERE id = @id`),

            updateReputation: this.db.prepare(`UPDATE world_nodes SET reputation = COALESCE(reputation, 0) + ? WHERE id = ?`),

            togglePin: this.db.prepare(`UPDATE world_nodes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?`),
            getNodeHistory: this.db.prepare(`SELECT * FROM node_history WHERE node_id = ? ORDER BY day DESC, id DESC`),
            insertNodeHistory: this.db.prepare(`INSERT INTO node_history (node_id, day, event_text, event_type) VALUES (@node_id, @day, @text, @type)`),

            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`),
            updateSetting: this.db.prepare(`UPDATE campaign_settings SET value = @value WHERE key = @key`),

            getActiveContract: this.db.prepare(`SELECT * FROM contracts WHERE is_active = 1 LIMIT 1`),
            getNodeContracts: this.db.prepare(`SELECT * FROM contracts WHERE node_id = ? AND is_completed = 0`),
            insertContract: this.db.prepare(`
                INSERT INTO contracts (node_id, title, description, required_minutes, gold_reward) 
                VALUES (@node_id, @title, @desc, @req_mins, @gold)
            `),
            setActiveContract: this.db.prepare(`UPDATE contracts SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END`),
            addContractProgress: this.db.prepare(`UPDATE contracts SET progress_minutes = progress_minutes + @progress WHERE id = @id`),
            completeContract: this.db.prepare(`UPDATE contracts SET is_completed = 1, is_active = 0 WHERE id = @id`),
            abortContract: this.db.prepare(`DELETE FROM contracts WHERE id = ?`),

            getInventory: this.db.prepare(`SELECT * FROM inventory`),
            deleteItem: this.db.prepare(`DELETE FROM inventory WHERE id = ?`),

            insertFaction: this.db.prepare(`
                INSERT INTO factions (name, color, archetype, motto)
                VALUES (@name, @color, @archetype, @motto)
            `),
            getAllFactions: this.db.prepare(`SELECT * FROM factions ORDER BY name`)
        };

        this.statements.insertSetting = this.db.prepare(`
            INSERT OR REPLACE INTO campaign_settings (key, value) VALUES (@key, @value)
        `);

        this.statements.insertItem = this.db.prepare(`
            INSERT INTO inventory (item_id, mercenary_id, durability, stash_slot) 
            VALUES (@itemId, @mercId, @durability, @stashSlot)
        `);

        this.statements.updateItemSlot = this.db.prepare(`
            UPDATE inventory SET stash_slot = @slot WHERE id = @id
        `);
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

    logNodeHistory(nodeId, text, type = 'world') {
        this.ensureConnection();
        const currentDay = parseInt(this.statements.getSetting.get('day').value) || 1;
        this.statements.insertNodeHistory.run({ node_id: nodeId, day: currentDay, text: text, type: type });
    }

    // --- CONTRACT GENERATION ---
    getOrGenerateContracts(nodeId, minMins = 10, maxMins = 120) {
        this.ensureConnection();
        let contracts = this.statements.getNodeContracts.all(nodeId);

        if (contracts.length === 0) {
            const titles = ["Clear the Rat Cellar", "Hunt the Goblin Raiders", "Escort the Merchant", "Explore the Ruined Tower", "Guard the Caravan"];
            const descs = [
                "A simple task, but honest pay.",
                "They have been harassing the local trade routes.",
                "The road is dangerous, keep them safe.",
                "Ancient secrets and hidden dangers await.",
                "Protect the goods at all costs."
            ];

            let possibleMins = [];
            for (let m = minMins; m <= maxMins; m += 5) {
                possibleMins.push(m);
            }
            if (possibleMins.length === 0) possibleMins = [minMins];

            for (let i = 0; i < 3; i++) {
                const reqMins = possibleMins[Math.floor(Math.random() * possibleMins.length)];
                const gold = Math.floor(reqMins * 2.5 * (0.8 + Math.random() * 0.4));

                this.statements.insertContract.run({
                    node_id: nodeId,
                    title: titles[Math.floor(Math.random() * titles.length)],
                    desc: descs[Math.floor(Math.random() * descs.length)],
                    req_mins: reqMins,
                    gold: gold
                });
            }
            contracts = this.statements.getNodeContracts.all(nodeId);
        }
        return contracts;
    }

    acceptContract(contractId) {
        this.ensureConnection();
        this.statements.setActiveContract.run(contractId);

        // Force the party out of Delve Mode when accepting a strict contract
        this.setCampaignSetting('is_delving', 'false');
    }

    getActiveContract() {
        this.ensureConnection();
        return this.statements.getActiveContract.get();
    }

    cancelContract(contractId) {
        this.ensureConnection();
        this.statements.abortContract.run(contractId);
    }

    // Real-Time Contract Completion
    completeActiveContract() {
        this.ensureConnection();
        const activeContract = this.getActiveContract();
        if (!activeContract) return null;

        this.statements.completeContract.run({ id: activeContract.id });
        this.updateGold(activeContract.gold_reward);

        const contractRepReward = 15;
        this.updateNodeReputation(activeContract.node_id, contractRepReward);

        const companyName = this.statements.getSetting.get('company_name')?.value || "The Company";

        this.logNodeHistory(activeContract.node_id, `${companyName} completed a contract: "${activeContract.title}".`, 'player');

        const logs = [
            `📜 Contract Completed: ${activeContract.title}`,
            `💰 Earned ${activeContract.gold_reward} crowns!`,
            `🤝 Reputation with settlement increased by ${contractRepReward}.`
        ];

        // --- LOOT LOGIC ---
        const foundLoot = [];
        let lootChance = 0.20;
        const titleLower = activeContract.title.toLowerCase();

        if (titleLower.includes('hunt') || titleLower.includes('clear') || titleLower.includes('explore')) {
            lootChance = 0.65;
        }

        const rolls = Math.max(1, Math.floor(activeContract.required_minutes / 25));
        for (let i = 0; i < rolls; i++) {
            if (Math.random() < lootChance) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ You recovered loot: ${newItem.name}`);
            }
        }

        return { contract: activeContract, logs, loot: foundLoot };
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
            // 1. Check if the slot is currently occupied
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id = ? AND equip_slot = ?').get(mercenaryId, equipSlot);
            
            // 2. Un-equip existing item back to stash
            if (existing) {
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = 0;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            // 3. Equip the new item
            db.prepare('UPDATE inventory SET mercenary_id = ?, equip_slot = ?, stash_slot = NULL WHERE id = ?').run(mercenaryId, equipSlot, inventoryId);
        })();
    }

    unequipItem(inventoryId, targetStashSlot) {
        this.ensureConnection();
        const db = this.db;
        
        return db.transaction(() => {
            // If dropping on a slot that's already occupied in stash
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id IS NULL AND stash_slot = ?').get(targetStashSlot);
            if (existing) {
                // Find next free slot for the item that was already in stash
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = 0;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            // Move item to stash
            db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(targetStashSlot, inventoryId);
        })();
    }

    // --- REPUTATION ---
    updateNodeReputation(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateReputation.run(amount, nodeId);
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

        const px = this.statements.getSetting.get('player_x')?.value || '400';
        const py = this.statements.getSetting.get('player_y')?.value || '300';

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

        const baseXpAmount = Math.floor(focusMinutes * 10 * ratio);

        const logs = [];
        const foundLoot = [];

        const rollForLoot = (chancePercentage) => {
            if (Math.random() < chancePercentage) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ Found loot: ${newItem.name}`);
            }
        };

        // --- FETCH MERCS AND EQUIPMENT ---
        const activeMercs = this.statements.getAll.all();
        const equippedRaw = this.db.prepare('SELECT * FROM inventory WHERE mercenary_id IS NOT NULL AND equip_slot IS NOT NULL').all();

        let partyTotalAttack = 0;
        let tankCount = 0;
        let totalPartyPower = 0;

        // Process Equipment Modifiers
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
                
                // Light gear degradation in dangerous areas
                if (origin === 'dungeon' && gameVersion === 'barebones' && Math.random() < 0.25) {
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

        // --- IN-GAME TIME PROGRESSION ---
        let daysPassed = 0;
        const MINUTES_PER_DAY = 30; // 1m 45s real-time = 1 in-game day

        const currentAccumulated = parseFloat(this.statements.getSetting.get('accumulated_time')?.value || '0');
        let newAccumulated = currentAccumulated + focusMinutes;

        while (newAccumulated >= MINUTES_PER_DAY) {
            newAccumulated -= MINUTES_PER_DAY;
            daysPassed++;
            const dayResult = this.processDayEnd();

            logs.push(`🌙 A day passed. Paid ${dayResult.wagesPaid}g in wages.`);
            if (dayResult.medicineUsed > 0 || dayResult.totalHealed > 0) {
                logs.push(`⚕️ Recovered ${dayResult.totalHealed} HP using ${dayResult.medicineUsed} meds.`);
            }
            if (dayResult.spoiledCount > 0) {
                logs.push(`🍞 ${dayResult.spoiledCount} food item(s) spoiled!`);
            }
        }
        this.setCampaignSetting('accumulated_time', newAccumulated);

        // --- XP & DUNGEON LOGIC ---
        if (origin === 'dungeon' && gameVersion === 'barebones') {
            const activeContract = this.getActiveContract();
            const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';

            if (activeContract) {
                // Apply Contract XP & Fatigue Individually
                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    if (Math.random() < 0.20) {
                        const rawDamage = Math.floor(Math.random() * 8 * ratio) + 2;
                        const defMitigation = Math.floor(merc.totalDefense / 4); // Low mitigation for minor events
                        const finalDamage = Math.max(0, rawDamage - defMitigation);
                        
                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            logs.push(`⚔️ ${merc.name} took ${finalDamage} damage fending off a wandering beast.`);
                        }
                    }
                });

                if (Math.random() < 0.3) {
                    logs.push(`🏕️ The party encountered travelers on the road during the contract.`);
                }

                const attackLootBonus = (partyTotalAttack / 100) * 0.10; // Every 10 atk gives +1% loot chance
                const lootChance = 0.15 * (focusMinutes / 25) + attackLootBonus;
                rollForLoot(lootChance);

                if (logs.length === 0 && daysPassed === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
                // Apply Delving Bonus Multipliers
                const attackGoldMultiplier = 1 + (partyTotalAttack / 100); 
                const goldFound = Math.floor(focusMinutes * ratio * 2.0 * attackGoldMultiplier);
                
                this.updateGold(goldFound);
                
                if (focusMinutes >= 1) {
                    logs.push(`🕳️ The party delved into the dungeon for ${Math.round(focusMinutes)} minutes.`);
                    logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                }

                // Calculate Danger based on Party Power
                const baseThreatPerMinute = 5;
                const dungeonThreat = focusMinutes * baseThreatPerMinute * ratio;
                const dangerMultiplier = Math.max(0.1, dungeonThreat / Math.max(1, totalPartyPower));
                
                const BASE_DAMAGE_CHANCE = 0.40;
                const adjustedDamageChance = Math.min(0.80, BASE_DAMAGE_CHANCE * dangerMultiplier);
                const tankProtectionBonus = tankCount * 0.10;

                activeMercs.forEach(merc => {
                    // Award Individual XP & Fatigue
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    let personalHitChance = adjustedDamageChance;
                    if (!['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                        personalHitChance = Math.max(0.05, personalHitChance - tankProtectionBonus);
                    } else {
                        personalHitChance = Math.min(0.90, personalHitChance + 0.15); // Tanks draw aggro
                    }

                    if (Math.random() < personalHitChance) {
                        const rawDamage = Math.floor(Math.random() * 15 * ratio) + 5;
                        const defenseMitigation = Math.floor((merc.str + merc.level) / 4) + Math.floor(merc.totalDefense / 2);
                        const finalDamage = Math.max(0, rawDamage - defenseMitigation);

                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            if (finalDamage > 10) {
                                logs.push(`🩸 ${merc.name} took a vicious blow for ${finalDamage} damage!`);
                            } else {
                                logs.push(`⚔️ ${merc.name} suffered ${finalDamage} damage in a skirmish.`);
                            }
                        } else {
                            logs.push(`🛡️ ${merc.name}'s armor completely deflected an attack!`);
                        }
                    }
                });

                // --- LOOT LOGIC (Scales with attack power & depth) ---
                const depthLootBonus = (focusMinutes / 2) * 0.01;
                const attackLootBonus = (partyTotalAttack / 100) * 0.05; // 5% flat per 100 atk
                const lootChance = 0.15 + depthLootBonus + attackLootBonus;

                rollForLoot(lootChance);

                if (focusMinutes >= 45) {
                    logs.push(`👑 Survived a deep floor! Extra loot granted.`);
                    rollForLoot(0.30 + depthLootBonus + attackLootBonus);
                }
            } else {
                 activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });
                });
            }

        } else {
            // Standard Game Modes
            activeMercs.forEach(merc => {
                const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });
            });
        }

        const totalXpGranted = activeMercs.reduce((sum, m) => sum + Math.floor(baseXpAmount * (1 + m.xpBonus)), 0);

        return { xp: Math.floor(totalXpGranted/Math.max(1, activeMercs.length)), logs: logs, loot: foundLoot };
    }

    processDayEnd() {
        this.ensureConnection();

        const db = this.db;
        const result = db.transaction(() => {
            const currentDay = parseInt(this.statements.getSetting.get('day').value);
            const currentGold = parseInt(this.statements.getSetting.get('gold').value);
            let currentMedicine = parseInt(this.statements.getSetting.get('medicine').value || '0');
            const totalWages = this.statements.getWages.get().total || 0;

            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            // Heal ALL Mercenaries
            const allMercs = this.db.prepare('SELECT * FROM mercenaries').all();
            let medicineUsed = 0;
            let totalHealed = 0;

            // ... (keep existing healing logic) ...
            
            // --- SPOILAGE LOGIC ---
            // ... (keep existing spoilage logic) ...

            // --- WORLD EVENTS SIMULATION (NEW LOGIC) ---
            const allNodes = this.db.prepare('SELECT id, current_event, event_expiration FROM world_nodes').all();
            const eventKeys = Object.keys(SETTLEMENT_EVENTS);

            for (const n of allNodes) {
                if (n.current_event) {
                    // Decay active events
                    const newExp = n.event_expiration - 1;
                    if (newExp <= 0) {
                        this.db.prepare('UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?').run(n.id);
                        this.logNodeHistory(n.id, `The local situation has stabilized. Things return to normal.`, 'world');
                    } else {
                        this.db.prepare('UPDATE world_nodes SET event_expiration = ? WHERE id = ?').run(newExp, n.id);
                    }
                } else {
                    // 5% chance per day for an idle settlement to get a new event
                    if (Math.random() < 0.05) {
                        const randomEvent = eventKeys[Math.floor(Math.random() * eventKeys.length)];
                        const duration = Math.floor(Math.random() * 5) + 3; // Lasts 3 to 7 days
                        this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ? WHERE id = ?').run(randomEvent, duration, n.id);
                        
                        const eventName = SETTLEMENT_EVENTS[randomEvent].name;
                        this.logNodeHistory(n.id, `Rumors spread of: ${eventName}.`, 'world');
                    }
                }
            }

            this.statements.updateSetting.run({ key: 'medicine', value: currentMedicine });
            this.statements.updateSetting.run({ key: 'day', value: currentDay + 1 });

            return { newGold, day: currentDay + 1, wagesPaid: totalWages, medicineUsed, totalHealed, spoiledCount };
        })();

        return result;
    }

    setCampaignSetting(key, value) {
        this.ensureConnection();
        return this.statements.insertSetting.run({ key, value: String(value) });
    }

    addItemToInventory(itemId, mercId = null) {
        this.ensureConnection();
        let stashSlot = null;
        if (mercId === null) {
            const currentItems = this.statements.getInventory.all().filter(i => i.mercenary_id === null && i.stash_slot !== null);
            const occupied = new Set(currentItems.map(i => i.stash_slot));
            stashSlot = 0;
            while (occupied.has(stashSlot)) stashSlot++;
        }

        const template = ItemFactory.createItem(itemId);
        let dur = 100;
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
        return this.statements.insertNode.run({
            type: node.type,
            name: node.name,
            x: node.x,
            y: node.y,
            faction_id: node.faction_id ?? null,
            buy_modifier: node.buy_modifier ?? 1.0,
            sell_modifier: node.sell_modifier ?? 0.5,
            specialization: node.specialization ?? null
        });
    }

    createFaction(faction) {
        this.ensureConnection();
        return this.statements.insertFaction.run({
            name: faction.name,
            color: faction.color,
            archetype: faction.archetype,
            motto: faction.motto ?? null
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

        const gold = getSet('gold', 0);
        const renown = getSet('renown', 0);
        let provisions = getSet('provisions', 50);
        const tools = getSet('tools', 20);
        const ammo = getSet('ammo', 100);
        const medicine = getSet('medicine', 15);

        // Fetch day and time progression
        const day = getSet('day', 1);
        const accumulated_time = parseFloat(this.statements.getSetting.get('accumulated_time')?.value || '0');

        // Add provisions from inventory items (e.g. Wine)
        const inventoryItems = this.statements.getInventory.all();
        inventoryItems.forEach(inv => {
            const template = ItemFactory.createItem(inv.item_id);
            if (template.stats && template.stats.provisions) {
                provisions += template.stats.provisions;
            }
        });

        const totalWages = this.statements.getWages.get().total || 0;
        const mercCount = this.statements.getAll.all().length;
        const foodPerDay = mercCount * 2;

        return { gold, renown, provisions, tools, ammo, medicine, dailyWages: totalWages, foodPerDay, day, accumulated_time };
    }

    updateGold(amount) {
        this.ensureConnection();
        const current = this.getResources().gold;
        const newAmount = current + amount;
        if (newAmount < 0) throw new Error("Insufficient Gold");

        this.statements.updateSetting.run({ key: 'gold', value: newAmount });
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
            role: merc.role || 'Recruit',
            level: merc.level || 1,
            str: merc.str || 10,
            int: merc.int || 10,
            spd: merc.spd || 10,
            max_hp: merc.max_hp || 100,
            current_hp: merc.current_hp || 100,
            wage: merc.wage || 10
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

        return node;
    }

    updateNodeDevelopment(nodeId, progress, newType, newEvent, buyMod, sellMod) {
        this.ensureConnection();
        this.db.prepare(`
            UPDATE world_nodes 
            SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?
            WHERE id = ?
        `).run(progress, newType, newEvent, buyMod, sellMod, nodeId);
    }

    spawnColony(parentNode) {
        this.ensureConnection();
        const allNodes = this.statements.getAllNodes.all();
        
        // 1. Find a valid X/Y position near the parent settlement
        const radius = 150;
        let attempt = 0;
        let newX, newY;
        let valid = false;
        
        while(attempt < 50 && !valid) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * radius; // Between 80px and 230px away
            newX = parentNode.x + Math.cos(angle) * dist;
            newY = parentNode.y + Math.sin(angle) * dist;
            
            // Map bounds check (Keep it inside the playable area)
            if (newX < 50 || newX > 1950 || newY < 50 || newY > 1450) {
                attempt++;
                continue;
            }
            
            // Collision check (Don't spawn too close to existing settlements)
            valid = true;
            for (const n of allNodes) {
                const d = Math.hypot(n.x - newX, n.y - newY);
                if (d < 70) { 
                    valid = false;
                    break;
                }
            }
            attempt++;
        }
        
        if (!valid) return null; // No space to expand in this area
        
        // 2. Pick a name for the new colony
        const usedNames = new Set(allNodes.map(n => n.name));
        const availableNames = SETTLEMENT_NAMES.filter(n => !usedNames.has(n));
        
        let newName;
        if (availableNames.length > 0) {
            newName = availableNames[Math.floor(Math.random() * availableNames.length)];
        } else {
            // Fallback if we run out of unique names
            const prefixes = ['New', 'North', 'South', 'East', 'West'];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            newName = `${prefix} ${parentNode.name}`;
        }
        
        // 3. Insert the new Hamlet into the database
        const info = this.statements.insertNode.run({
            type: 'Hamlet',
            name: newName,
            x: Math.round(newX),
            y: Math.round(newY),
            faction_id: parentNode.faction_id,
            buy_modifier: 1.2, // Default Hamlet economy
            sell_modifier: 0.3,
            specialization: null
        });
        
        return { id: info.lastInsertRowid, name: newName };
    }
}