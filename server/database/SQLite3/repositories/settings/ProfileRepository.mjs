import { getDatabase } from '../../connection.mjs';

export class ProfileRepository {
    constructor() {
        this.db = getDatabase('app_settings');

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM campaign_profiles ORDER BY name ASC'),
            insert: this.db.prepare('INSERT INTO campaign_profiles (name, config_json) VALUES (@name, @config)'),
            delete: this.db.prepare('DELETE FROM campaign_profiles WHERE id = ?')
        };
    }

    getAllProfiles() {
        return this.statements.getAll.all();
    }

    saveProfile(name, configObj) {
        const json = JSON.stringify(configObj);
        return this.statements.insert.run({ name, config: json });
    }

    deleteProfile(id) {
        return this.statements.delete.run(id);
    }
}