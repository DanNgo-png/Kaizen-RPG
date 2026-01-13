import { getDatabase } from '../connection.mjs';

export class GameRepository {
    constructor() {
        this.db = getDatabase('game_data');

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM mercenaries'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare(`
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd)
            `),
            delete: this.db.prepare('DELETE FROM mercenaries WHERE id = ?'),
            updateXP: this.db.prepare('UPDATE mercenaries SET xp = @xp, level = @level WHERE id = @id')
        };
    }

    getAllMercenaries() { return this.statements.getAll.all(); }
    getMercenary(id) { return this.statements.getById.get(id); }
    addMercenary(mercenary) {
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