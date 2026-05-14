import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';
import { ItemFactory } from '../../../factories/ItemFactory.mjs';

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

            damageMercenary: this.db.prepare(`UPDATE mercenaries SET current_hp = MAX(0, current_hp - @damage) WHERE id = @id`),
            getWages: this.db.prepare(`SELECT SUM(daily_wage) as total FROM mercenaries`),
            insertLedger: this.db.prepare(`INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)`),

            insertNode: this.db.prepare(`
                INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier, specialization) 
                VALUES (@type, @name, @x, @y, @faction_id, 0, @buy_modifier, @sell_modifier, @specialization)
            `),
            getAllNodes: this.db.prepare(`SELECT * FROM world_nodes`),

            getNodeById: this.db.prepare(`SELECT * FROM world_nodes WHERE id = ?`),

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
            deleteItem: this.db.prepare(`DELETE FROM inventory WHERE id = ?`)
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

    // --- INVENTORY ---
    getInventory() {
        this.ensureConnection();
        return this.statements.getInventory.all();
    }

    deleteItemFromInventory(inventoryId) {
        this.ensureConnection();
        return this.statements.deleteItem.run(inventoryId);
    }

    // --- REPUTATION ---
    updateNodeReputation(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateReputation.run(amount, nodeId);
    }

    // --- WORLD MAP & POSITION ---
    getNodeById(id) {
        this.ensureConnection();
        return this.statements.getNodeById.get(id);
    }

    getWorldState() {
        this.ensureConnection();
        const nodes = this.statements.getAllNodes.all();

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

        const xpAmount = Math.floor(focusMinutes * 10 * ratio);
        const fatigueCost = Math.floor(focusMinutes / 5);

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

        // --- IN-GAME TIME PROGRESSION ---
        let daysPassed = 0;
        const MINUTES_PER_DAY = 30; // 1m 45s real-time = 1.75 minutes = 1 in-game day

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
            const activeMercs = this.statements.getAll.all();

            if (activeContract) {
                this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });

                if (Math.random() < 0.3) {
                    logs.push(`🏕️ The party encountered travelers on the road during the contract.`);
                }

                activeMercs.forEach(merc => {
                    if (Math.random() < 0.20) {
                        const dmg = Math.floor(Math.random() * 8 * ratio) + 2;
                        this.statements.damageMercenary.run({ damage: dmg, id: merc.id });
                        logs.push(`⚔️ ${merc.name} took ${dmg} damage fending off a wandering beast.`);
                    }
                });

                const lootChance = 0.15 * (focusMinutes / 25);
                rollForLoot(lootChance);

                if (logs.length === 0 && daysPassed === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
                const goldFound = Math.floor(focusMinutes * ratio * 2.0);
                this.updateGold(goldFound);
                this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });

                if (focusMinutes >= 1) {
                    logs.push(`🕳️ The party delved into the dungeon for ${Math.round(focusMinutes)} minutes.`);
                    logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                }

                // --- NEW: SQUAD POWER & THREAT LOGIC ---
                const partySize = activeMercs.length;

                // 1. Calculate Total Party Power (Stats + Bonus for certain roles)
                let totalPartyPower = 0;
                let tankCount = 0;

                activeMercs.forEach(merc => {
                    let mercPower = (merc.str || 10) + (merc.spd || 10) + (merc.int || 10);
                    // Tanks help mitigate overall party danger
                    if (['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                        tankCount++;
                        mercPower *= 1.2;
                    }
                    totalPartyPower += mercPower;
                });

                // 2. Calculate Dungeon Threat (Longer focus = Deeper dungeon = Higher threat)
                const baseThreatPerMinute = 5;
                const dungeonThreat = focusMinutes * baseThreatPerMinute * ratio;

                // 3. Compare Power to Threat to establish a Danger Multiplier (Lower is safer)
                // A massive party will push this multiplier close to 0.1. A weak party will push it over 1.0.
                const dangerMultiplier = Math.max(0.1, dungeonThreat / Math.max(1, totalPartyPower));

                // 4. Calculate Event Chances based on Danger
                const BASE_DAMAGE_CHANCE = 0.40;
                const adjustedDamageChance = Math.min(0.80, BASE_DAMAGE_CHANCE * dangerMultiplier);

                // Tanks reduce the chance of non-tanks getting hit by 10% per tank
                const tankProtectionBonus = tankCount * 0.10;

                activeMercs.forEach(merc => {
                    let personalHitChance = adjustedDamageChance;

                    // Apply tank protection if this merc is NOT a tank
                    if (!['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                        personalHitChance = Math.max(0.05, personalHitChance - tankProtectionBonus);
                    } else {
                        // Tanks are slightly more likely to get hit (they are drawing aggro)
                        personalHitChance = Math.min(0.90, personalHitChance + 0.15);
                    }

                    if (Math.random() < personalHitChance) {
                        // Damage scales with difficulty (ratio) but is mitigated by the merc's own strength/level
                        const rawDamage = Math.floor(Math.random() * 15 * ratio) + 5;
                        const defenseMitigation = Math.floor((merc.str + merc.level) / 4);
                        const finalDamage = Math.max(1, rawDamage - defenseMitigation);

                        this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });

                        // Flavorful logs based on damage taken
                        if (finalDamage > 10) {
                            logs.push(`🩸 ${merc.name} took a vicious blow for ${finalDamage} damage!`);
                        } else {
                            logs.push(`⚔️ ${merc.name} suffered ${finalDamage} damage in a skirmish.`);
                        }
                    }
                });

                // --- LOOT LOGIC (Deeper = Better Loot) ---
                // Base chance is 15%, plus 1% for every 2 minutes focused
                const depthLootBonus = (focusMinutes / 2) * 0.01;
                const lootChance = 0.15 + depthLootBonus;

                rollForLoot(lootChance);

                // Deep work milestone (e.g., fighting a mini-boss)
                if (focusMinutes >= 45) {
                    logs.push(`👑 Survived a deep floor! Extra loot granted.`);
                    rollForLoot(0.30 + depthLootBonus);
                }
            }

        } else {
            this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });
        }

        return { xp: xpAmount, fatigue: fatigueCost, logs: logs, loot: foundLoot };
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

            // Heal ALL Mercenaries, removing the active/rest requirement
            const allMercs = this.db.prepare('SELECT * FROM mercenaries').all();
            let medicineUsed = 0;
            let totalHealed = 0;

            for (const merc of allMercs) {
                let healAmount = 5; // Base natural healing without meds

                if (merc.current_hp < merc.max_hp) {
                    if (currentMedicine >= 1) { // 1 med per merc per day
                        currentMedicine -= 1;
                        medicineUsed += 1;
                        healAmount = 25; // Medicated healing
                    }
                    const newHp = Math.min(merc.max_hp, merc.current_hp + healAmount);
                    totalHealed += (newHp - merc.current_hp);
                    this.db.prepare('UPDATE mercenaries SET current_hp = ? WHERE id = ?').run(newHp, merc.id);
                }

                // Fatigue heals normally without resources
                this.db.prepare('UPDATE mercenaries SET fatigue = MAX(0, fatigue - 25) WHERE id = ?').run(merc.id);
            }

            // --- SPOILAGE LOGIC ---
            const allInventory = this.db.prepare('SELECT * FROM inventory').all();
            let spoiledCount = 0;
            
            for (const inv of allInventory) {
                const template = ItemFactory.createItem(inv.item_id);
                if (template.stats && template.stats.spoil_days) {
                    const newDurability = inv.durability - 1;
                    if (newDurability <= 0) {
                        this.db.prepare('DELETE FROM inventory WHERE id = ?').run(inv.id);
                        spoiledCount++;
                    } else {
                        this.db.prepare('UPDATE inventory SET durability = ? WHERE id = ?').run(newDurability, inv.id);
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
            faction_id: node.faction_id || null,
            buy_modifier: node.buy_modifier || 1.0,
            sell_modifier: node.sell_modifier || 0.5,
            specialization: node.specialization || null
        });
    }

    getWorldNodes() {
        this.ensureConnection();
        return this.statements.getAllNodes.all();
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

        return { gold, renown, provisions, tools, ammo, medicine, dailyWages: totalWages, foodPerDay };
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
}