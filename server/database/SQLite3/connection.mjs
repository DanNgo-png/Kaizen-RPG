// The single 'better-sqlite3' instance
import Database from 'better-sqlite3';

const database = new Database('game_data.db');
database.pragma('journal_mode = WAL'); // High-performance mode
export default database;