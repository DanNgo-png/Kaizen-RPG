import Database from 'better-sqlite3';
import fs from 'fs';
import { initializeSchema } from './createTable.mjs';

const DATABASE_FILE = 'data/dynamic/global/main_settings.db';
const DATA_DIRECTORY = './data/dynamic/global';
const database = initializeDatabase();
export default database;

function initializeDatabase() {
    try {
        if (!fs.existsSync(DATA_DIRECTORY)) {
            fs.mkdirSync(DATA_DIRECTORY);
        }

        const database = new Database(DATABASE_FILE);
        
        database.pragma('journal_mode = WAL'); // Performance optimization for SQLite

        initializeSchema(database);

        console.log("✅ SQLite Connected & Ready");
        return database;
    } catch (error) {
        console.error("❌ DB Init Error:", error);
        throw error;
    }
}