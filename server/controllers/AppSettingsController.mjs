import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process'; 
import { AppSettingsRepository } from '../database/SQLite3/repositories/settings/AppSettingsRepository.mjs';

const FONTS_DIR = 'resources/assets/fonts';

export class AppSettingsController {
    constructor() {
        this.repo = new AppSettingsRepository();
    }

    register(app) {
        // Handle saving a setting
        app.events.on("saveSetting", (payload) => {
            try {
                // payload: { key: 'fontFamily', value: 'inter' }
                this.repo.setSetting(payload.key, payload.value);
                
                // Confirm save back to UI
                app.events.broadcast("settingSaved", payload);
            } catch (error) {
                console.error("❌ Error saving setting:", error);
            }
        });

        // Handle retrieving a setting
        app.events.on("getSetting", (payload) => {
            try {
                // payload: { key: 'fontFamily' }
                const value = this.repo.getSetting(payload.key);
                
                // Send data back
                app.events.broadcast("receiveSetting", { 
                    key: payload.key, 
                    value: value 
                });
            } catch (error) {
                console.error("❌ Error getting setting:", error);
            }
        });

        // Scan for custom fonts
        app.events.on("getCustomFonts", () => {
            try {
                if (!fs.existsSync(FONTS_DIR)) {
                    fs.mkdirSync(FONTS_DIR, { recursive: true });
                }

                const files = fs.readdirSync(FONTS_DIR);
                const fonts = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.ttf', '.otf', '.woff', '.woff2'].includes(ext);
                });

                app.events.broadcast("receiveCustomFonts", fonts);
            } catch (error) {
                console.error("❌ Error scanning fonts:", error);
                app.events.broadcast("receiveCustomFonts", []);
            }
        });

        // Open Fonts Folder
        app.events.on("openFontsFolder", () => {
            try {
                // 1. Ensure directory exists
                if (!fs.existsSync(FONTS_DIR)) {
                    fs.mkdirSync(FONTS_DIR, { recursive: true });
                }

                // 2. Resolve absolute path for the OS command
                const absolutePath = path.resolve(FONTS_DIR);
                
                // 3. Safely determine command based on OS
                let command;
                let file_directory = [];

                switch (process.platform) {
                    case 'win32':
                        // Windows uses 'explorer'
                        command = 'explorer';
                        file_directory = [absolutePath];
                        break;
                    case 'darwin':
                        // macOS uses 'open'
                        command = 'open';
                        file_directory = [absolutePath];
                        break;
                    default:
                        // Linux uses 'xdg-open'
                        command = 'xdg-open';
                        file_directory = [absolutePath];
                        break;
                }

                console.log(`📂 Opening folder: ${absolutePath}`);

                // 4. Spawn the process detached
                // 'detached: true' allows the file explorer to stay open even if the node process ends
                // 'stdio: ignore' disconnects the I/O so the parent doesn't wait for it
                const child = spawn(command, file_directory, { detached: true, stdio: 'ignore' });

                // 5. Unreference the child process to allow the Node script to exit independently
                child.unref();

            } catch (error) {
                console.error("❌ Error handling openFontsFolder:", error);
            }
        });
    }
}