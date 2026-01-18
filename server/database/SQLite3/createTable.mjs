import { GLOBAL_SCHEMAS } from "./schemas/GlobalSchema.js";
import { GAME_SCHEMA_SQL } from "./schemas/GameSchema.js";

export function initializeSchema(db, dbName) {
    if (GLOBAL_SCHEMAS[dbName]) {
        db.exec(GLOBAL_SCHEMAS[dbName]);
    }
}

export function initializeGameSchema(db) {
    db.exec(GAME_SCHEMA_SQL);
    db.prepare(`INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('gold', '500')`).run();
    db.prepare(`INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('renown', '0')`).run();
    db.prepare(`INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('day', '1')`).run();
    console.log("⚔️ Game Schema Initialized for Save Slot");
}