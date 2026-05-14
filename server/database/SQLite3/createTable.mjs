import { GLOBAL_SCHEMAS } from "./schemas/GlobalSchema.mjs";
import { GAME_SCHEMA_SQL } from "./schemas/GameSchema.mjs";

export function initializeSchema(db, dbName) {
    if (GLOBAL_SCHEMAS[dbName]) {
        db.exec(GLOBAL_SCHEMAS[dbName]);
    }
}

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
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);

        if (!nodeColumns.includes('buy_modifier')) db.exec("ALTER TABLE world_nodes ADD COLUMN buy_modifier REAL DEFAULT 1.0;");
        if (!nodeColumns.includes('sell_modifier')) db.exec("ALTER TABLE world_nodes ADD COLUMN sell_modifier REAL DEFAULT 0.5;");
        if (!nodeColumns.includes('specialization')) db.exec("ALTER TABLE world_nodes ADD COLUMN specialization TEXT;");
    },
    
    // --- Version 3: Shop Inventory Persistence ---
    (db) => {
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);

        if (!nodeColumns.includes('shop_inventory')) db.exec("ALTER TABLE world_nodes ADD COLUMN shop_inventory TEXT DEFAULT '[]';");
        if (!nodeColumns.includes('last_restock_day')) db.exec("ALTER TABLE world_nodes ADD COLUMN last_restock_day INTEGER DEFAULT 0;");
        if (!nodeColumns.includes('next_trade_restock_day')) db.exec("ALTER TABLE world_nodes ADD COLUMN next_trade_restock_day INTEGER DEFAULT 0;");
    },

    // --- Version 4: Equip Slots for Inventory ---
    (db) => {
        const invColumns = db.pragma('table_info(inventory)').map(col => col.name);
        if (!invColumns.includes('equip_slot')) {
            db.exec("ALTER TABLE inventory ADD COLUMN equip_slot TEXT;");
        }
    }
];

export function initializeGameSchema(db) {
    const currentVersion = db.pragma('user_version', { simple: true });
    const targetVersion = migrations.length;

    if (currentVersion === targetVersion) {
        return; 
    }

    const runMigrations = db.transaction(() => {
        for (let i = currentVersion; i < targetVersion; i++) {
            console.log(`⬆️ Migrating Game Save from v${i} to v${i + 1}...`);
            migrations[i](db);
        }
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