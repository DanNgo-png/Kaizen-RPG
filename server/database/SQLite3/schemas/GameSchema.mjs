export const GAME_SCHEMA_SQL = `
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
        current_hp INTEGER DEFAULT 100,
        max_hp INTEGER DEFAULT 100,
        fatigue INTEGER DEFAULT 0,
        daily_wage INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 1 
    );

    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        mercenary_id INTEGER, 
        stash_slot INTEGER,
        durability INTEGER DEFAULT 100
    );
    
    CREATE TABLE IF NOT EXISTS company_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER,
        description TEXT,
        amount INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- World Map Data
    CREATE TABLE IF NOT EXISTS world_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'Hamlet', 'Town', 'Empire', etc.
        name TEXT,
        x INTEGER,
        y INTEGER,
        faction_id INTEGER,
        reputation INTEGER DEFAULT 0,
        is_visited INTEGER DEFAULT 0,
        buy_modifier REAL DEFAULT 1.0,
        sell_modifier REAL DEFAULT 0.5,
        is_pinned INTEGER DEFAULT 0,
        specialization TEXT,
        shop_inventory TEXT DEFAULT '[]',
        last_restock_day INTEGER DEFAULT 0,
        next_trade_restock_day INTEGER DEFAULT 0
    );

    -- Contracts Table
    CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        required_minutes INTEGER DEFAULT 30,
        progress_minutes REAL DEFAULT 0,
        gold_reward INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        FOREIGN KEY(node_id) REFERENCES world_nodes(id)
    );

    -- Settlement History
    CREATE TABLE IF NOT EXISTS node_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        day INTEGER NOT NULL,
        event_text TEXT NOT NULL,
        event_type TEXT DEFAULT 'world',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(node_id) REFERENCES world_nodes(id) ON DELETE CASCADE
    );

    -- Default Resource Tracking
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('gold', '500');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('provisions', '50');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('tools', '20');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('ammo', '100');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('medicine', '15');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('renown', '0');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('day', '1');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('player_x', '400');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('player_y', '300');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('map_generated', 'false');
`;