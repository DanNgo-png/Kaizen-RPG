const SCHEMAS = {
    // Stores Todo lists and Kanbans
    'user_tasks': `
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            content TEXT NOT NULL,
            priority TEXT DEFAULT 'p4',
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `,

    // Stores RPG elements (Mercenaries, Inventory)
    'game_data': `
        CREATE TABLE IF NOT EXISTS mercenaries ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT NOT NULL, 
            role TEXT NOT NULL, 
            level INTEGER DEFAULT 1 
        );
        -- You can add inventory tables here later
    `,

    // Stores App Settings (Volume, Theme, Window State)
    'app_settings': `
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `
};

/**
 * Initializes the schema for a specific database instance based on its name.
 * @param {Database} db - The better-sqlite3 instance
 * @param {string} dbName - The key matching the SCHEMAS object (e.g., 'user_tasks')
 */
export function initializeSchema(db, dbName) {
    const sql = SCHEMAS[dbName];

    if (!sql) {
        console.warn(`⚠️ No schema definition found for '${dbName}'. Database created without tables.`);
        return;
    }

    try {
        db.exec(sql); // .exec is better for multiple statements in one string
        console.log(`🔨 Schema initialized for: ${dbName}`);
    } catch (error) {
        console.error(`❌ Failed to initialize schema for ${dbName}:`, error);
        throw error;
    }
}