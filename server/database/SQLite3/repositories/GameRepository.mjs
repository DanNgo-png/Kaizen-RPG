import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';

export class GameRepository {
    constructor() {
        this.db = null;
        this.statements = {};
    }

    // Called by SaveController when explicitly loading/creating a specific slot
    initialize(slotId) {
        this.db = loadGameDatabase(slotId);
        this._prepareStatements();
    }

    // Called by MercenaryController (and others) to ensure they use the currently active game
    ensureConnection() {
        // 1. Get the globally active connection (throws if none)
        const activeDB = getActiveGameDB();

        // 2. Check if our local reference is stale or null
        if (this.db !== activeDB) {
            // console.log("🔄 GameRepository: Syncing to active save connection.");
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
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd, daily_wage, is_active) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd, @wage, 1)
            `),
            addXp: this.db.prepare(`UPDATE mercenaries SET xp = xp + @amount, fatigue = fatigue + @fatigue WHERE is_active = 1`),
            restMercenaries: this.db.prepare(`
                UPDATE mercenaries 
                SET fatigue = MAX(0, fatigue - 20), 
                    current_hp = MIN(max_hp, current_hp + 10) 
                WHERE is_active = 0
            `),
            getWages: this.db.prepare(`SELECT SUM(daily_wage) as total FROM mercenaries`),
            insertLedger: this.db.prepare(`INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)`),

            // World Map Statements
            insertNode: this.db.prepare(`
                INSERT INTO world_nodes (type, name, x, y, faction_id) 
                VALUES (@type, @name, @x, @y, @faction_id)
            `),
            getAllNodes: this.db.prepare(`SELECT * FROM world_nodes`),

            // Settings / Resources
            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`),
            updateSetting: this.db.prepare(`UPDATE campaign_settings SET value = @value WHERE key = @key`)
        };

        this.statements.insertSetting = this.db.prepare(`
            INSERT OR REPLACE INTO campaign_settings (key, value) VALUES (@key, @value)
        `);

        this.statements.insertItem = this.db.prepare(`
            INSERT INTO inventory (item_id, mercenary_id, durability) VALUES (@itemId, @mercId, 100)
        `);
    }

    distributeSessionXP(focusMinutes) {
        this.ensureConnection();
        // Formula: 1 Minute = 10 XP. 
        const xpAmount = Math.floor(focusMinutes * 10);
        const fatigueCost = Math.floor(focusMinutes / 5); // 5 fatigue per 25 mins

        this.statements.addXp.run({ amount: xpAmount, fatigue: fatigueCost });
        return { xp: xpAmount, fatigue: fatigueCost };
    }

    processDayEnd() {
        this.ensureConnection();
        
        const db = this.db;
        const result = db.transaction(() => {
            // 1. Get Current Day & Gold
            const currentDay = parseInt(this.statements.getSetting.get('day').value);
            const currentGold = parseInt(this.statements.getSetting.get('gold').value);
            
            // 2. Calculate Wages
            const totalWages = this.statements.getWages.get().total || 0;
            
            // 3. Deduct Gold
            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            // 4. Heal Reserves
            this.statements.restMercenaries.run();

            // 5. Increment Day
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
        return this.statements.insertItem.run({ itemId, mercId });
    }

    createWorldNode(node) {
        this.ensureConnection();
        return this.statements.insertNode.run({
            type: node.type,
            name: node.name,
            x: node.x,
            y: node.y,
            faction_id: node.faction_id || null
        });
    }

    getWorldNodes() {
        this.ensureConnection();
        return this.statements.getAllNodes.all();
    }

    // --- RESOURCE MANAGEMENT ---
    getResources() {
        this.ensureConnection();
        const gold = parseInt(this.statements.getSetting.get('gold')?.value || 0);
        const renown = parseInt(this.statements.getSetting.get('renown')?.value || 0);
        return { gold, renown };
    }

    updateGold(amount) {
        this.ensureConnection();
        const current = this.getResources().gold;
        const newAmount = current + amount;
        if (newAmount < 0) throw new Error("Insufficient Gold");
        
        this.statements.updateSetting.run({ key: 'gold', value: newAmount });
        return newAmount;
    }

    // --- MERCENARY MANAGEMENT ---
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
            wage: merc.wage || 10
        });
    }
}