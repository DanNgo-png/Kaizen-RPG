import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3'; 
import { deleteSaveFile } from '../database/SQLite3/connection.mjs';
import { GameRepository } from '../database/SQLite3/repositories/GameRepository.mjs';
import { CampaignGenerator } from '../services/CampaignGenerator.mjs'; 
import { AppSettingsRepository } from '../database/SQLite3/repositories/settings/AppSettingsRepository.mjs';

const SAVE_DIR = './data/dynamic/saves';

export class SaveController {
    constructor() {
        this.gameRepo = new GameRepository();
        this.settingsRepo = new AppSettingsRepository();
    }

    register(app) {
        // 1. List all available save slots (Enhanced to read Company Name)
        app.events.on("listSaveSlots", () => {
            try {
                if (!fs.existsSync(SAVE_DIR)) {
                    app.events.broadcast("receiveSaveSlots", []);
                    return;
                }

                // 1. Get Physical Files
                const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.db'));
                
                // 2. Get Saved Order from DB
                let sortOrder = [];
                try {
                    const savedOrderJson = this.settingsRepo.getSetting('saveSlotOrder');
                    if (savedOrderJson) sortOrder = JSON.parse(savedOrderJson);
                } catch (e) {
                    console.warn("Failed to parse save slot order", e);
                }

                const slots = files.map(file => {
                    const filePath = path.join(SAVE_DIR, file);
                    const slotId = file.replace('slot_', '').replace('.db', '');
                    let companyName = null;

                    try {
                        const tempDb = new Database(filePath, { readonly: true });
                        const row = tempDb.prepare("SELECT value FROM campaign_settings WHERE key = 'company_name'").get();
                        if (row) companyName = row.value;
                        tempDb.close();
                    } catch (e) {
                        console.warn(`Could not read metadata for ${file}`, e.message);
                    }

                    return {
                        filename: file,
                        slotId: slotId,
                        companyName: companyName,
                        lastModified: fs.statSync(filePath).mtime
                    };
                });

                // 3. Sort based on preference
                if (sortOrder.length > 0) {
                    slots.sort((a, b) => {
                        let indexA = sortOrder.indexOf(a.slotId);
                        let indexB = sortOrder.indexOf(b.slotId);
                        
                        // If not in order list, push to end
                        if (indexA === -1) indexA = 999;
                        if (indexB === -1) indexB = 999;
                        
                        return indexA - indexB;
                    });
                }

                app.events.broadcast("receiveSaveSlots", slots);
            } catch (err) {
                console.error(err);
                app.events.broadcast("receiveSaveSlots", []);
            }
        });

        app.events.on("saveSlotOrder", (payload) => {
            try {
                // payload.order is Array of slotIds e.g. ["2", "1", "3"]
                this.settingsRepo.setSetting('saveSlotOrder', JSON.stringify(payload.order));
            } catch (err) {
                console.error("❌ Failed to save slot order:", err);
            }
        });

        // 2. Load a specific slot
        app.events.on("loadGame", (payload) => {
            try {
                const { slotId } = payload;
                this.gameRepo.initialize(slotId);
                app.events.broadcast("gameLoaded", { success: true, slotId });
                const mercs = this.gameRepo.getAllMercenaries();
                app.events.broadcast("receiveMercenaries", mercs);
            } catch (err) {
                console.error(err);
                app.events.broadcast("gameLoaded", { success: false, error: err.message });
            }
        });

        // 3. Create New Game
        app.events.on("createNewGame", (payload) => {
            try {
                const { slotId, campaignData } = payload;
                console.log(`💾 Creating New Save in Slot ${slotId}...`);
                
                deleteSaveFile(slotId);
                this.gameRepo.initialize(slotId);
                
                const generator = new CampaignGenerator(this.gameRepo);
                generator.generate(campaignData);

                app.events.broadcast("gameCreated", { success: true, slotId });
                
                const mercs = this.gameRepo.getAllMercenaries();
                const resources = this.gameRepo.getResources();
                app.events.broadcast("receivePartyData", { mercenaries: mercs, resources });

            } catch (err) {
                console.error("❌ Create Game Failed:", err);
                app.events.broadcast("gameCreated", { success: false, error: err.message });
            }
        });

        app.events.on("deleteSaveSlot", (payload) => {
            try {
                const success = deleteSaveFile(payload.slotId);
                app.events.broadcast("saveDeleted", { success, slotId: payload.slotId });
            } catch (err) {
                console.error(err);
            }
        });

        app.events.on("updateCampaignSetting", (payload) => {
            try {
                const { slotId, key, value } = payload;
                const filePath = path.join(SAVE_DIR, `slot_${slotId}.db`);
                if (fs.existsSync(filePath)) {
                    const tempDb = new Database(filePath);
                    tempDb.prepare("UPDATE campaign_settings SET value = ? WHERE key = ?").run(value, key);
                    tempDb.close();
                }
            } catch (err) { console.error(err); }
        });

        app.events.on("getSaveMetadata", (payload) => {
            try {
                const { slotId } = payload;
                const filePath = path.join(SAVE_DIR, `slot_${slotId}.db`);
                const metadata = {};
                if (fs.existsSync(filePath)) {
                    const tempDb = new Database(filePath, { readonly: true });
                    const rows = tempDb.prepare("SELECT key, value FROM campaign_settings").all();
                    rows.forEach(r => metadata[r.key] = r.value);
                    tempDb.close();
                }
                app.events.broadcast("receiveSaveMetadata", { slotId, ...metadata });
            } catch (err) { console.error(err); }
        });
    }
}