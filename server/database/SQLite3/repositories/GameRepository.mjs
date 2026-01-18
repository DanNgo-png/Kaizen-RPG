import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';

export class GameRepository {
    constructor() {
        this.db = null;
        this.statements = {};
    }

    initialize(slotId) {
        // Load the specific file
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
            getAll: this.db.prepare('SELECT * FROM mercenaries'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare(`
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd)
            `),
            // Campaign Settings
            setSetting: this.db.prepare(`INSERT OR REPLACE INTO campaign_settings (key, value) VALUES (@key, @value)`),
            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`)
        };
    }

    getAllMercenaries() { this.ensureConnection(); return this.statements.getAll.all(); }
    getMercenary(id) { return this.statements.getById.get(id); }
    addMercenary(mercenary) {
        this.ensureConnection();
        const data = { // Default stats if not provided
            name: mercenary.name,
            role: mercenary.role || 'Recruit',
            level: mercenary.level || 1,
            str: mercenary.str || 10,
            int: mercenary.int || 10,
            spd: mercenary.spd || 10
        };
        return this.statements.insert.run(data);
    }
    removeMercenary(id) { return this.statements.delete.run(id); }
}