import { GLOBAL_SCHEMAS } from "./schemas/GlobalSchema.mjs";
import { GAME_SCHEMA_SQL } from "./schemas/GameSchema.mjs";

const LEGACY_FACTION_PLACEHOLDERS = Object.freeze([
    {
        name: "House Blackwood",
        color: "#22c55e",
        archetype: "old_blood",
        motto: "Roots deeper than steel."
    },
    {
        name: "House Sterling",
        color: "#fbbf24",
        archetype: "merchant",
        motto: "Prosperity binds the realm."
    },
    {
        name: "House Thornwatch",
        color: "#ef4444",
        archetype: "militaristic",
        motto: "The border does not break."
    },
    {
        name: "House Silverpine",
        color: "#a78bfa",
        archetype: "old_blood",
        motto: "Grace endures the winter."
    }
]);

const LEGACY_FACTION_FALLBACK = Object.freeze({
    namePrefix: "House Wayfarer",
    color: "#60a5fa",
    archetype: "frontier",
    motto: "No road is foreign."
});

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
    },

    // --- Version 5: Dynamic Settlement Events ---
    (db) => {
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);
        if (!nodeColumns.includes('current_event')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN current_event TEXT;");
            db.exec("ALTER TABLE world_nodes ADD COLUMN event_expiration INTEGER DEFAULT 0;");
        }
    },

    // --- Version 6: Noble Houses / Factions ---
    (db) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS factions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL,
                archetype TEXT NOT NULL,
                motto TEXT
            );
        `);

        const factionColumns = db.pragma('table_info(factions)').map(col => col.name);
        if (!factionColumns.includes('motto')) {
            db.exec("ALTER TABLE factions ADD COLUMN motto TEXT;");
        }

        const missingFactionIds = db.prepare(`
            SELECT DISTINCT faction_id AS id
            FROM world_nodes
            WHERE faction_id IS NOT NULL
              AND faction_id NOT IN (SELECT id FROM factions)
            ORDER BY faction_id
        `).all();

        const insertLegacyFaction = db.prepare(`
            INSERT OR IGNORE INTO factions (id, name, color, archetype, motto)
            VALUES (@id, @name, @color, @archetype, @motto)
        `);

        missingFactionIds.forEach((row, index) => {
            const template = LEGACY_FACTION_PLACEHOLDERS[index] || {
                name: `${LEGACY_FACTION_FALLBACK.namePrefix} ${row.id}`,
                color: LEGACY_FACTION_FALLBACK.color,
                archetype: LEGACY_FACTION_FALLBACK.archetype,
                motto: LEGACY_FACTION_FALLBACK.motto
            };

            insertLegacyFaction.run({ id: row.id, ...template });
        });
    },

    // --- Version 7: Settlement Expansion ---
    (db) => {
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);
        if (!nodeColumns.includes('development_progress')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN development_progress INTEGER DEFAULT 0;");
        }
    },
    
    // --- Version 8: Settlement Expansion Reqs ---
    (db) => {
        const nodeColumns = db.pragma('table_info(world_nodes)').map(col => col.name);
        if (!nodeColumns.includes('expansion_reqs')) {
            db.exec("ALTER TABLE world_nodes ADD COLUMN expansion_reqs TEXT DEFAULT '{}';");
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