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
        durability INTEGER DEFAULT 100,
        equip_slot TEXT
    );
    
    CREATE TABLE IF NOT EXISTS company_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER,
        description TEXT,
        amount INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS factions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        archetype TEXT NOT NULL,
        motto TEXT
    );

    CREATE TABLE IF NOT EXISTS world_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
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
        next_trade_restock_day INTEGER DEFAULT 0,
        current_event TEXT,
        event_expiration INTEGER DEFAULT 0,
        development_progress INTEGER DEFAULT 0, 
        expansion_reqs TEXT DEFAULT '{}',
        attachments INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        is_hostile INTEGER DEFAULT 0,
        population_tier INTEGER DEFAULT 1,
        influence INTEGER DEFAULT 0,
        siege_attacker_id INTEGER DEFAULT NULL,
        siege_attacker_revealed INTEGER DEFAULT 0,
        siege_start_day INTEGER DEFAULT NULL,
        FOREIGN KEY(faction_id) REFERENCES factions(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        target_node_id INTEGER,
        contract_type TEXT DEFAULT 'standard',
        title TEXT NOT NULL,
        description TEXT,
        required_minutes INTEGER DEFAULT 30,
        progress_minutes REAL DEFAULT 0,
        gold_reward INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        terms TEXT DEFAULT '{}',
        FOREIGN KEY(node_id) REFERENCES world_nodes(id),
        FOREIGN KEY(target_node_id) REFERENCES world_nodes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS node_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        day INTEGER NOT NULL,
        event_text TEXT NOT NULL,
        event_type TEXT DEFAULT 'world',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(node_id) REFERENCES world_nodes(id) ON DELETE CASCADE
    );

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