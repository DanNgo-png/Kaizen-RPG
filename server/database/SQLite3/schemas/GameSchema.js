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
        
        -- Core Stats
        str INTEGER DEFAULT 10,
        int INTEGER DEFAULT 10,
        spd INTEGER DEFAULT 10,
        
        -- Survival Mechanics
        current_hp INTEGER DEFAULT 100,
        max_hp INTEGER DEFAULT 100,
        fatigue INTEGER DEFAULT 0, -- 0 to 100. High fatigue = injury risk
        status TEXT DEFAULT 'Healthy', -- 'Healthy', 'Injured', 'Exhausted'
        
        -- Economy
        daily_wage INTEGER DEFAULT 10,
        is_active INTEGER DEFAULT 1 -- 1 = On Mission (Gains XP, Gains Fatigue), 0 = Reserve (Heals, No XP)
    );

    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        mercenary_id INTEGER, 
        durability INTEGER DEFAULT 100
    );
    
    -- Transaction Ledger for History
    CREATE TABLE IF NOT EXISTS company_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER,
        description TEXT,
        amount INTEGER, -- Positive for income, negative for expense
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;