import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeSchema, initializeGameSchema } from './createTable.mjs';

const GLOBAL_DATA_DIR = './data/dynamic/global';
const SAVE_DATA_DIR = './data/dynamic/saves';

// Cache for global connections (tasks, habits, etc.)
const globalConnections = new Map();

// Single reference for the CURRENTLY LOADED game save
let activeGameConnection = null;

function ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 1. GLOBAL ACCESS (Unchanged behavior)
export function getDatabase(dbName) {
    if (globalConnections.has(dbName)) return globalConnections.get(dbName);

    ensureDirectory(GLOBAL_DATA_DIR);
    const filePath = path.join(GLOBAL_DATA_DIR, `${dbName}.db`);
    
    try {
        const db = new Database(filePath);
        db.pragma('journal_mode = WAL');
        initializeSchema(db, dbName); // Initialize Global Tables
        globalConnections.set(dbName, db);
        return db;
    } catch (error) {
        console.error(`❌ Global DB Error (${dbName}):`, error);
        throw error;
    }
}

// 2. DYNAMIC GAME SAVE ACCESS
export function loadGameDatabase(slotId) {
    // Close existing connection if switching saves
    if (activeGameConnection) {
        try {
            console.log("Closing previous save connection...");
            activeGameConnection.close();
        } catch(e) { /* ignore if already closed */ }
        activeGameConnection = null;
    }

    ensureDirectory(SAVE_DATA_DIR);
    const filename = `slot_${slotId}.db`; // e.g., slot_1.db
    const filePath = path.join(SAVE_DATA_DIR, filename);

    try {
        console.log(`🎮 Loading Save Slot: ${slotId}`);
        const db = new Database(filePath);
        db.pragma('journal_mode = WAL');
        
        // Initialize Game-Specific Tables (Mercenaries, Inventory, etc.)
        initializeGameSchema(db); 
        
        activeGameConnection = db;
        
        return db;
    } catch (error) {
        console.error(`❌ Save Load Error (${filename}):`, error);
        throw error;
    }
}

// Helper to get the currently active connection
export function getActiveGameDB() {
    if (!activeGameConnection) {
        throw new Error("No game save is currently loaded.");
    }
    if (!activeGameConnection.open) {
        throw new Error("Active game connection is closed.");
    }
    return activeGameConnection;
}

// Helper to delete a save
export function deleteSaveFile(slotId) {
    const filePath = path.join(SAVE_DATA_DIR, `slot_${slotId}.db`);
    
    // Close if it's the active one
    // better-sqlite3 .name property contains the path passed to constructor
    if (activeGameConnection && activeGameConnection.name === filePath) {
        try {
            activeGameConnection.close();
        } catch(e) {}
        activeGameConnection = null;
    }

    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        // Clean up WAL/SHM files to prevent corruption warnings
        if (fs.existsSync(filePath + '-wal')) fs.unlinkSync(filePath + '-wal');
        if (fs.existsSync(filePath + '-shm')) fs.unlinkSync(filePath + '-shm');
        return true;
    } catch(e) {
        console.error("Failed to delete save file:", e);
        return false;
    }
}