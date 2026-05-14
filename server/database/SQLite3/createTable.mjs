import { GLOBAL_SCHEMAS } from "./schemas/GlobalSchema.mjs";
import { GAME_SCHEMA_SQL } from "./schemas/GameSchema.mjs";

export function initializeSchema(db, dbName) {
    if (GLOBAL_SCHEMAS[dbName]) {
        db.exec(GLOBAL_SCHEMAS[dbName]);
    }
}

// ---------------------------------------------------------
// DATABASE MIGRATIONS (Scalable)
// Array index corresponds to the version we are migrating TO.
// Index 0 -> Migrates DB from v0 to v1 (Initial Setup)
// Index 1 -> Migrates DB from v1 to v2 (Economy Update)
// ---------------------------------------------------------
const migrations = [
    // --- Version 1: Base Game Schema ---
    (db) => {
        db.exec(GAME_SCHEMA_SQL);
        const insertSetting = db.prepare(`INSERT OR IGNORE INTO campaign_settings (key, value) VALUES (?, ?)`);
        insertSetting.run('gold', '500');
        insertSetting.run('renown', '0');
        insertSetting.run('day', '1');
    },

    // --- Version 2: Settlement Economy & Specializations ---
    (db) => {
        // Safe check included here JUST IN CASE you have old save files 
        // that already got these columns added before we implemented versioning.
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);

        if (!nodeColumns.includes('buy_modifier')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN buy_modifier REAL DEFAULT 1.0;");
        }
        if (!nodeColumns.includes('sell_modifier')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN sell_modifier REAL DEFAULT 0.5;");
        }
        if (!nodeColumns.includes('specialization')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN specialization TEXT;");
        }
    }

    // --- Version 3: Future Update Example ---
    // (db) => {
    //     db.exec("CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT);");
    //     db.exec("ALTER TABLE mercenaries ADD COLUMN pet_id INTEGER;");
    // }
];

export function initializeGameSchema(db) {
    // Get the current version of the save file (Defaults to 0 for new files)
    const currentVersion = db.pragma('user_version', { simple: true });
    const targetVersion = migrations.length;

    // If the database is already fully updated, skip everything. (Highly performant)
    if (currentVersion === targetVersion) {
        return; 
    }

    // Apply necessary migrations inside a transaction
    const runMigrations = db.transaction(() => {
        for (let i = currentVersion; i < targetVersion; i++) {
            console.log(`⬆️ Migrating Game Save from v${i} to v${i + 1}...`);
            migrations[i](db); // Execute the specific migration block
        }
        
        // Update the SQLite file to remember its new version
        db.pragma(`user_version = ${targetVersion}`);
    });

    try {
        runMigrations();
        console.log(`⚔️ Game Schema Initialized (Version ${targetVersion})`);
    } catch (error) {
        console.error("❌ Failed to migrate Game Schema:", error);
        throw error;
    }
}