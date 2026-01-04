import { getDatabase } from '../../connection.mjs';

export class AppSettingsRepository {
    constructor() {
        this.db = getDatabase('app_settings'); 

        this.statements = {
            get: this.db.prepare('SELECT value FROM settings WHERE key = ?'),
            // Upsert: Insert or Update if key exists
            set: this.db.prepare(`
                INSERT INTO settings (key, value) VALUES (@key, @value)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            `)
        };
    }

    getSetting(key) {
        const result = this.statements.get.get(key);
        return result ? result.value : null;
    }

    setSetting(key, value) {
        let safeValue = value;

        // SQLite binding fix: Convert unsupported types
        if (typeof value === 'boolean') {
            safeValue = value.toString(); // "true" or "false"
        } else if (typeof value === 'object' && value !== null) {
            safeValue = JSON.stringify(value);
        }

        return this.statements.set.run({ key, value: safeValue });
    }
}