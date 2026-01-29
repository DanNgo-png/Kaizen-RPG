import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process'; 
import AutoLaunch from 'auto-launch';
import { AppSettingsRepository } from '../database/SQLite3/repositories/settings/AppSettingsRepository.mjs';

const FONTS_DIR = 'resources/assets/fonts';
const CUSTOM_AUDIO_DIR = 'resources/audio/alarm/custom'; 

export class AppSettingsController {
    constructor() {
        this.repo = new AppSettingsRepository();

        let appPath = 'Kaizen-RPG.exe';
        if (process.platform === 'win32') {
            appPath = path.resolve(process.cwd(), 'Kaizen-RPG.exe'); 
        } else if (process.platform === 'darwin') {
            appPath = path.resolve(process.cwd(), 'Kaizen-RPG.app'); 
        } else {
            appPath = path.resolve(process.cwd(), 'Kaizen-RPG'); 
        }

        this.launcher = new AutoLaunch({
            name: 'Kaizen RPG',
            path: appPath 
        });
    }

    register(app) {
        app.events.on("saveSetting", (payload) => {
            try {
                // payload: { key: 'fontFamily', value: 'inter' }
                this.repo.setSetting(payload.key, payload.value);
                app.events.broadcast("settingSaved", payload);
            } catch (error) {
                console.error("❌ Error saving setting:", error);
            }
        });

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

        app.events.on("getAutoLaunchStatus", async () => {
            try {
                const isEnabled = await this.launcher.isEnabled();
                app.events.broadcast("receiveAutoLaunchStatus", { isEnabled });
            } catch (error) {
                console.warn("⚠️ Check auto-launch status failed (likely dev mode):", error.message);
                app.events.broadcast("receiveAutoLaunchStatus", { isEnabled: false });
            }
        });

        app.events.on("setAutoLaunch", async (payload) => {
            try {
                const shouldEnable = payload.enabled;
                if (shouldEnable) {
                    await this.launcher.enable();
                    console.log("🚀 Auto-launch enabled");
                } else {
                    await this.launcher.disable();
                    console.log("🛑 Auto-launch disabled");
                }
                
                this.repo.setSetting('runOnStartup', shouldEnable);
                app.events.broadcast("autoLaunchUpdated", { success: true, isEnabled: shouldEnable });
            } catch (error) {
                console.error("❌ Error toggling auto-launch:", error);
                app.events.broadcast("autoLaunchUpdated", { success: false, error: error.message });
            }
        });

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

        app.events.on("openFontsFolder", () => {
            try {
                if (!fs.existsSync(FONTS_DIR)) {
                    fs.mkdirSync(FONTS_DIR, { recursive: true });
                }

                const absolutePath = path.resolve(FONTS_DIR);
                
                let command;
                let file_directory = [];

                switch (process.platform) {
                    case 'win32':
                        command = 'explorer';
                        file_directory = [absolutePath];
                        break;
                    case 'darwin':
                        command = 'open';
                        file_directory = [absolutePath];
                        break;
                    default:
                        command = 'xdg-open';
                        file_directory = [absolutePath];
                        break;
                }

                console.log(`📂 Opening folder: ${absolutePath}`);

                const child = spawn(command, file_directory, { detached: true, stdio: 'ignore' });

                child.unref();

            } catch (error) {
                console.error("❌ Error handling openFontsFolder:", error);
            }
        });

        app.events.on("getCustomSounds", () => {
            try {
                if (!fs.existsSync(CUSTOM_AUDIO_DIR)) {
                    fs.mkdirSync(CUSTOM_AUDIO_DIR, { recursive: true });
                }

                const files = fs.readdirSync(CUSTOM_AUDIO_DIR);
                const sounds = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp3', '.wav', '.ogg'].includes(ext);
                });

                app.events.broadcast("receiveCustomSounds", sounds);
            } catch (error) {
                console.error("❌ Error scanning sounds:", error);
                app.events.broadcast("receiveCustomSounds", []);
            }
        });

        app.events.on("openSoundsFolder", () => {
            try {
                if (!fs.existsSync(CUSTOM_AUDIO_DIR)) {
                    fs.mkdirSync(CUSTOM_AUDIO_DIR, { recursive: true });
                }

                const absolutePath = path.resolve(CUSTOM_AUDIO_DIR);
                let command;
                let file_directory = [absolutePath];

                switch (process.platform) {
                    case 'win32': command = 'explorer'; break;
                    case 'darwin': command = 'open'; break;
                    default:      command = 'xdg-open'; break;
                }

                const child = spawn(command, file_directory, { detached: true, stdio: 'ignore' });
                child.unref();

            } catch (error) {
                console.error("❌ Error opening sounds folder:", error);
            }
        });
    }
}