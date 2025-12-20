-- 1. The Mercenaries (The "Bros")
CREATE TABLE mercenaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    background TEXT,      -- e.g., 'Hedge Knight', 'Farmhand'
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    daily_wage INTEGER,
    is_alive BOOLEAN DEFAULT 1,
    
    -- Base Stats (Naked/Unmodified)
    base_hp INTEGER,
    base_fatigue INTEGER,
    base_resolve INTEGER,
    base_initiative INTEGER,
    base_melee_skill INTEGER,
    base_melee_defense INTEGER
);

-- 2. Items Library (The Prototypes)
CREATE TABLE item_templates (
    id INTEGER PRIMARY KEY,
    name TEXT,
    slot_type TEXT,       -- 'head', 'body', 'main_hand', 'off_hand'
    weight INTEGER,       -- Affects Max Fatigue
    defense_bonus INTEGER,
    stamina_penalty INTEGER
);

-- 3. Inventory (Actual instances of items)
CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    mercenary_id INTEGER, -- NULL if in company stash
    durability_current INTEGER,
    durability_max INTEGER,
    FOREIGN KEY(template_id) REFERENCES item_templates(id),
    FOREIGN KEY(mercenary_id) REFERENCES mercenaries(id)
);

-- 4. Status Effects (Injuries/Traits)
CREATE TABLE status_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mercenary_id INTEGER,
    type TEXT,            -- 'Trait' (Permanent) or 'Injury' (Temporary)
    name TEXT,            -- 'Drunkard', 'Broken Elbow'
    melee_skill_mod REAL, -- e.g., 0.8 for -20%
    initiative_mod INTEGER,
    FOREIGN KEY(mercenary_id) REFERENCES mercenaries(id)
);

-- A universal table for all app & game configurations
CREATE TABLE app_settings (
    setting_key TEXT PRIMARY KEY, -- e.g., 'focus_timer_duration'
    setting_value TEXT,            -- e.g., '25'
    category TEXT,                 -- e.g., 'timer', 'audio', 'mods'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mods (
    mod_id TEXT PRIMARY KEY,
    name TEXT,
    author TEXT,
    load_order INTEGER,
    is_enabled BOOLEAN DEFAULT 1,
    file_path TEXT
);

3. Modularize by Domain (Bounded Contexts)
Instead of one giant "Database" folder, group your data logic by the feature it serves. This is a principle from Domain-Driven Design (DDD).

Feature-Based Folders:
/modules/billing/db
/modules/auth/db
/modules/catalog/db

Isolation: A module should "own" its tables. If the Billing module needs data from the User module, it should ideally go through a service call rather than joining tables across domains.