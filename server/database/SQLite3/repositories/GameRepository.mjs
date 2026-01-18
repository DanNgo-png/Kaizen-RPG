import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';

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
        if (!this.db) {
            try {
                this.db = getActiveGameDB();
                this._prepareStatements();
            } catch (e) {
                throw new Error("GameRepository: No active save slot loaded.");
            }
        }
    }

    _prepareStatements() {
        this.statements = {
            getAll: this.db.prepare('SELECT * FROM mercenaries WHERE is_active = 1'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare(`
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd, daily_wage, is_active) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd, @wage, 1)
            `),
            // Settings / Resources
            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`),
            updateSetting: this.db.prepare(`UPDATE campaign_settings SET value = @value WHERE key = @key`)
        };
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