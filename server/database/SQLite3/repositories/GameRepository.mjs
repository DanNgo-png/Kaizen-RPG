import { getDatabase } from '../connection.mjs';

export class GameRepository {
    constructor() {
        this.db = getDatabase('game_data');

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM mercenaries'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare('INSERT INTO mercenaries (name, role, level) VALUES (@name, @role, @level)'),
            delete: this.db.prepare('DELETE FROM mercenaries WHERE id = ?')
        };
    }

    getAllMercenaries() { return this.statements.getAll.all(); }
    getMercenary(id) { return this.statements.getById.get(id); }
    addMercenary(mercenary) { return this.statements.insert.run(mercenary); }
    removeMercenary(id) { return this.statements.delete.run(id); }
}