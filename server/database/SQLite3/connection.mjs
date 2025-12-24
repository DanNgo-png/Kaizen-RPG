import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeSchema } from './createTable.mjs';

const DATA_DIRECTORY = './data/dynamic/global';

// Cache to store active database connections
// Key: dbName, Value: Database Instance
const connections = new Map();

function ensureDirectory() {
    if (!fs.existsSync(DATA_DIRECTORY)) {
        fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
    }
}

/**
 * Factory function to get or create a database connection.
 * 
 * @param {string} dbName - The unique name for the database (e.g., 'user_tasks', 'game_data'). 
 *                          This will be used as the filename: 'user_tasks.db'.
 * @returns {Database} - The better-sqlite3 database instance.
 */
export function getDatabase(dbName) {
    // 1. Check Cache: Return existing connection if available
    if (connections.has(dbName)) {
        return connections.get(dbName);
    }

    // 2. Setup File Path
    ensureDirectory();
    const filePath = path.join(DATA_DIRECTORY, `${dbName}.db`);
    
    try {
        console.log(`🔌 Connecting to SQLite: ${dbName}.db ...`);
        
        // 3. Create Connection
        const db = new Database(filePath);
        db.pragma('journal_mode = WAL'); // Optimization

        // 4. Initialize Tables (Auto-run schema based on name)
        initializeSchema(db, dbName);

        // 5. Cache and Return
        connections.set(dbName, db);
        return db;

    } catch (error) {
        console.error(`❌ DB Connection Error (${dbName}):`, error);
        throw error;
    }
}