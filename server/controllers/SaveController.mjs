import fs from 'fs';
import path from 'path';
import { loadGameDatabase, deleteSaveFile } from '../database/SQLite3/connection.mjs';
import { GameRepository } from '../database/SQLite3/repositories/GameRepository.mjs';

const SAVE_DIR = './data/dynamic/saves';

export class SaveController {
    constructor() {
        // We might need to access GameRepo to re-init it on load
        this.gameRepo = new GameRepository();
    }

    register(app) {
        // 1. List all available save slots
        app.events.on("listSaveSlots", () => {
            try {
                if (!fs.existsSync(SAVE_DIR)) {
                    app.events.broadcast("receiveSaveSlots", []);
                    return;
                }

                const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.db'));
                const slots = files.map(file => {
                    // You could connect briefly to read metadata (Company Name, Level) here
                    // For now, just returning ID based on filename
                    return {
                        filename: file,
                        slotId: file.replace('slot_', '').replace('.db', ''),
                        lastModified: fs.statSync(path.join(SAVE_DIR, file)).mtime
                    };
                });

                app.events.broadcast("receiveSaveSlots", slots);
            } catch (err) {
                console.error(err);
            }
        });

        // 2. Load a specific slot
        app.events.on("loadGame", (payload) => {
            try {
                const { slotId } = payload;
                // Init repository with this specific file
                this.gameRepo.initialize(slotId);

                app.events.broadcast("gameLoaded", { success: true, slotId });

                // Immediately send initial game data
                const mercs = this.gameRepo.getAllMercenaries();
                app.events.broadcast("receiveMercenaries", mercs);

            } catch (err) {
                console.error(err);
                app.events.broadcast("gameLoaded", { success: false, error: err.message });
            }
        });

        // 3. Create New Game (Overwrite or New Slot)
        app.events.on("createNewGame", (payload) => {
            try {
                const { slotId, campaignData } = payload;

                // 1. Delete if exists (Overwrite logic)
                deleteSaveFile(slotId);

                // 2. Initialize new DB (Creates tables)
                this.gameRepo.initialize(slotId);

                // 3. Insert Initial Data (Leader, Starting Gold, etc.)
                // this.gameRepo.setCampaignSetting('companyName', campaignData.name);
                // this.gameRepo.addMercenary(campaignData.leader);

                app.events.broadcast("gameCreated", { success: true, slotId });
            } catch (err) {
                console.error(err);
            }
        });

        app.events.on("deleteSaveSlot", (payload) => {
            try {
                const success = deleteSaveFile(payload.slotId); // Imported from connection.mjs
                app.events.broadcast("saveDeleted", { success, slotId: payload.slotId });
            } catch (err) {
                console.error(err);
            }
        });
    }
}