const GLOBAL_SCHEMAS = {
    // Stores Todo lists and Kanbans
    'user_tasks': `
        CREATE TABLE IF NOT EXISTS todo_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            icon TEXT DEFAULT 'fa-solid fa-list',
            is_default INTEGER DEFAULT 0,
            parent_id INTEGER DEFAULT NULL, -- NEW COLUMN
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(parent_id) REFERENCES todo_lists(id) ON DELETE CASCADE
        );

        -- Insert default 'Inbox'
        INSERT OR IGNORE INTO todo_lists (id, title, icon, is_default, parent_id) VALUES (1, 'Inbox', 'fa-solid fa-inbox', 1, NULL);

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            list_id INTEGER DEFAULT 1,
            content TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'p4',
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(list_id) REFERENCES todo_lists(id) ON DELETE CASCADE
        );
    `,

    // Stores Habit Definitions and Daily Logs
    'habits_data': `
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            stack_name TEXT DEFAULT 'General', -- For grouping (e.g. "Morning Routine")
            target_days INTEGER DEFAULT 7,     -- Goal per week
            icon TEXT DEFAULT 'fa-solid fa-check',
            archived INTEGER DEFAULT 0,        -- 1 = Mastered/Archived
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            log_date TEXT NOT NULL, -- Format: YYYY-MM-DD
            status INTEGER DEFAULT 1, -- 1 = Done
            FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE,
            UNIQUE(habit_id, log_date)
        );

        CREATE TABLE IF NOT EXISTS habit_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );
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

    // Timeframe Data (Strategic Planning & Daily Schedule)
    'timeframe_data': `
        -- Goals 
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT DEFAULT 'day', -- 'day', 'week', 'quarter', 'year'
            timeframe_key TEXT,      -- '2025-12-25', '2025-W52', '2025'
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Daily Schedule Entries
        -- This maps a Task from the backlog to a specific day/time
        CREATE TABLE IF NOT EXISTS daily_plan_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,   -- Logically links to user_tasks.id
            date_key TEXT NOT NULL,     -- 'YYYY-MM-DD'
            start_time TEXT,            -- '09:00', '14:30' (24h format)
            duration INTEGER DEFAULT 30, -- Minutes
            notes TEXT,                 -- specific notes for today
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(task_id, date_key)   -- A task can only be scheduled once per day
        );
    `
};

const GAME_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS campaign_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS mercenaries ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT NOT NULL, 
        role TEXT NOT NULL, 
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        str INTEGER DEFAULT 10,
        int INTEGER DEFAULT 10,
        spd INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        mercenary_id INTEGER, -- Null if in stash
        durability INTEGER DEFAULT 100
    );
`;

export function initializeSchema(db, dbName) {
    if (GLOBAL_SCHEMAS[dbName]) {
        db.exec(GLOBAL_SCHEMAS[dbName]);
    }
}

export function initializeGameSchema(db) {
    db.exec(GAME_SCHEMA_SQL);
    console.log("⚔️ Game Schema Initialized for Save Slot");
}