const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './data/dynamic/global/focus_session_log.db';

if (!fs.existsSync(DB_PATH)) {
    console.log("❌ Database file does not exist.");
    process.exit(0);
}

const db = new Database(DB_PATH, { readonly: true });

try {
    // Check main table count
    const row = db.prepare('SELECT count(*) as count FROM focus_sessions').get();
    
    console.log("------------------------------------------------");
    console.log(`📂 Checking: ${DB_PATH}`);
    console.log("------------------------------------------------");
    
    if (row.count === 0) {
        console.log("✅ RESULT: 0 Rows. The database is empty.");
    } else {
        console.log(`⚠️ RESULT: ${row.count} Rows found. NOT empty.`);
    }
    
    console.log("------------------------------------------------");
} catch (err) {
    console.error("Error reading DB:", err.message);
}