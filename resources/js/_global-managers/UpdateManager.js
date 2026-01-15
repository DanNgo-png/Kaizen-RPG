import { notifier } from "./NotificationManager.js";

export class UpdateManager {
    constructor() {
        if (UpdateManager.instance) return UpdateManager.instance;
        UpdateManager.instance = this;

        // Ensure this URL matches your actual GitHub Pages structure
        this.manifestUrl = "https://danngo-png.github.io/Kaizen-RPG/updates/manifest.json";
    }

    async check() {
        try {
            console.log(`🔍 Checking for updates at: ${this.manifestUrl}`);
            const manifest = await Neutralino.updater.checkForUpdates(this.manifestUrl);
            console.log("🚀 Update available:", manifest.version);
            return manifest;
        } catch (error) {
            if (error.code === 'NE_UP_CUPDERR') {
                console.log("✅ Application is up to date.");
            } else {
                console.error("❌ Update check failed:", error);
            }
            return null;
        }
    }

    /**
     * Downloads and installs the update.
     * @returns {Promise<boolean>} True if successful, False if failed.
     */
    async install() {
        try {
            notifier.show("Updating", "Downloading resources...", "fa-solid fa-download");
            
            await Neutralino.updater.install();
            
            notifier.show("Success", "Update installed. Restarting...", "fa-solid fa-rotate");
            
            setTimeout(async () => {
                await Neutralino.app.restart();
            }, 1500);

            return true; // Success

        } catch (error) {
            console.error("❌ Install failed:", error);
            notifier.show("Update Failed", "Could not install update. Check console.", "fa-solid fa-triangle-exclamation");
            return false; // Failed
        }
    }
}

export const updateManager = new UpdateManager();