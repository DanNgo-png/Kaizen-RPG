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
    `,

    // Stores history of focus sessions
    'focus_session_log': `
        CREATE TABLE IF NOT EXISTS focus_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag TEXT,
            focus_seconds INTEGER,
            break_seconds INTEGER,
            ratio REAL,
            timer_type TEXT DEFAULT 'standard',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL DEFAULT '#6b7280'
        );
    `,

    // --- NEW: Stores Strategic Planning (Years, Quarters, OKRs) ---
    'timeframe_data': `
        -- 1. Pillars (e.g., Health, Wealth, Career) - Seen in 'this-year.html'
        CREATE TABLE IF NOT EXISTS pillars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT DEFAULT 'fa-solid fa-mountain',
            color_class TEXT DEFAULT 'p-blue', -- CSS class reference
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Goals / Objectives (e.g., "Launch MVP") - Seen in 'this-quarter.html'
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pillar_id INTEGER,
            title TEXT NOT NULL,
            type TEXT DEFAULT 'quarter', -- 'year', 'quarter', 'week', 'day'
            timeframe_key TEXT,          -- e.g., '2025', '2025-Q1', '2025-W52'
            status TEXT DEFAULT 'track', -- 'track', 'risk', 'done', 'fail'
            progress INTEGER DEFAULT 0,  -- 0 to 100
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(pillar_id) REFERENCES pillars(id) ON DELETE SET NULL
        );

        -- 3. Key Results (e.g., "Complete Core UI") - The checklist inside a Goal
        CREATE TABLE IF NOT EXISTS key_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
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