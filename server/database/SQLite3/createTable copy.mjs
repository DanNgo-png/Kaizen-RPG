export function initializeSchema(database) {
    const init = database.transaction(() => {
        database.prepare(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                content TEXT NOT NULL,
                priority TEXT DEFAULT 'p4',
                completed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS mercenaries ( 
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                name TEXT NOT NULL, 
                role TEXT NOT NULL, 
                level INTEGER DEFAULT 1 
            );
        `).run();
    });

    init();
}