// UI, focus timer, and app settings
import database from '../connection.mjs';

export class SettingsRepository {
    getTimerSettings() {
        return database.prepare('SELECT * FROM settings WHERE key = "focus_timer"').get();
    }
    
    updateVolume(value) {
        database.prepare('UPDATE settings SET value = ? WHERE key = "master_volume"').run(value);
    }
}