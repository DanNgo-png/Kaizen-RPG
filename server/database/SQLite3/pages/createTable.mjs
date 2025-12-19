import Database from 'better-sqlite3';

const FILE_PATH = "Toolbox-SQLite/Node.js/data/customer.db";

const database = new Database(FILE_PATH);

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
        text TEXT, 
        completed TEXT,
        createdAt TEXT
    )
`;

database.prepare(createTableQuery).run();
console.log("Table created...");
database.close();