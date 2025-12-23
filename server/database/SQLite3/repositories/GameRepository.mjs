// Mercenaries, stats, and equipment
import database from '../connection.mjs';

export class GameRepository {
    constructor() {
        this.statements = {
            getAll: database.prepare('SELECT * FROM mercenaries'),
            getById: database.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: database.prepare('INSERT INTO mercenaries (name, role, level) VALUES (@name, @role, @level)'),
            delete: database.prepare('DELETE FROM mercenaries WHERE id = ?')
        };
    }

    getAllMercenaries() {
        return this.statements.getAll.all();
    }

    getMercenary(id) {
        return this.statements.getById.get(id);
    }

    addMercenary(mercenary) {
        // .run returns info about the operation (changes, lastInsertRowid)
        return this.statements.insert.run(mercenary);
    }

    removeMercenary(id) {
        return this.statements.delete.run(id);
    }
}