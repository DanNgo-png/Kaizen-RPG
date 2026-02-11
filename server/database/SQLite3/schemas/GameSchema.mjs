export const GAME_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS campaign_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    -- [Existing Mercenaries/Inventory Tables Here...] --
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
        durability INTEGER DEFAULT 100
    );
    
    CREATE TABLE IF NOT EXISTS company_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER,
        description TEXT,
        amount INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- NEW: World Map Data
    CREATE TABLE IF NOT EXISTS world_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'town', 'village', 'stronghold', 'ruins'
        name TEXT,
        x INTEGER,
        y INTEGER,
        faction_id INTEGER,
        is_visited INTEGER DEFAULT 0
    );

    -- NEW: Player Position Tracking
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('player_x', '400');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('player_y', '300');
    INSERT OR IGNORE INTO campaign_settings (key, value) VALUES ('map_generated', 'false');
`;