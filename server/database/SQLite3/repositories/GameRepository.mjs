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
            restMercenaries: this.db.prepare(`
                UPDATE mercenaries 
                SET fatigue = MAX(0, fatigue - 20), 
                    current_hp = MIN(max_hp, current_hp + 10) 
                WHERE is_active = 0
            `),
            damageMercenary: this.db.prepare(`UPDATE mercenaries SET current_hp = MAX(0, current_hp - @damage) WHERE id = @id`),
            getWages: this.db.prepare(`SELECT SUM(daily_wage) as total FROM mercenaries`),
            insertLedger: this.db.prepare(`INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)`),

            insertNode: this.db.prepare(`
                INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier) 
                VALUES (@type, @name, @x, @y, @faction_id, 0, @buy_modifier, @sell_modifier)
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
            VALUES (@itemId, @mercId, 100, @stashSlot)
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
            for(let m = minMins; m <= maxMins; m += 5) {
                possibleMins.push(m);
            }
            if (possibleMins.length === 0) possibleMins = [minMins]; 
            
            for(let i=0; i<3; i++) {
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

        return { contract: activeContract, logs };
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
        if(nodeId) this.statements.updateReputation.run(amount, nodeId);
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

        // Helper to roll for loot
        const rollForLoot = (chancePercentage) => {
            if (Math.random() < chancePercentage) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id); // Add to DB stash
                foundLoot.push(newItem); // Send to UI
                logs.push(`✨ Found loot: ${newItem.name}`);
            }
        };

        // --- BAREBONES DUNGEON CRAWLER LOGIC ---
        if (origin === 'dungeon' && gameVersion === 'barebones') {
            const activeContract = this.getActiveContract();
            const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';
            const activeMercs = this.statements.getAll.all();

            if (activeContract) {
                // --- ON A CONTRACT ---
                this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });
                
                // Narrative Events
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

                // Small chance for contract bonus loot (15% per 25 mins)
                const lootChance = 0.15 * (focusMinutes / 25);
                rollForLoot(lootChance);

                if (logs.length === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
                // --- FREE DELVING ---
                const goldFound = Math.floor(focusMinutes * ratio * 2.0); // Slightly boosted passive gold
                this.updateGold(goldFound);
                this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });
                
                logs.push(`🕳️ The party delved into the dungeon for ${Math.round(focusMinutes)} minutes.`);
                logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                
                // High chance of damage
                activeMercs.forEach(merc => {
                    if (Math.random() < 0.40) { 
                        const dmg = Math.floor(Math.random() * 12 * ratio) + 2;
                        this.statements.damageMercenary.run({ damage: dmg, id: merc.id });
                        logs.push(`🩸 ${merc.name} took ${dmg} damage from a trap/monster.`);
                    }
                });

                // High chance for loot (40% per 25 mins)
                const lootChance = 0.40 * (focusMinutes / 25);
                rollForLoot(lootChance);
                // Roll again for a second item if it was a long session
                if (focusMinutes >= 45) rollForLoot(0.20);

            } else {
                // --- IDLE ---
                return { xp: 0, fatigue: 0, logs: [], loot: [] };
            }

        } else {
            // Standard Modes
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
            const totalWages = this.statements.getWages.get().total || 0;
            
            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            this.statements.restMercenaries.run();
            this.statements.updateSetting.run({ key: 'day', value: currentDay + 1 });

            return { newGold, day: currentDay + 1, wagesPaid: totalWages };
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
            while(occupied.has(stashSlot)) stashSlot++; 
        }
        return this.statements.insertItem.run({ itemId, mercId, stashSlot });
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
            sell_modifier: node.sell_modifier || 0.5
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
        const provisions = getSet('provisions', 50);
        const tools = getSet('tools', 20);
        const ammo = getSet('ammo', 100);
        const medicine = getSet('medicine', 15);

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