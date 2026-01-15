import { notifier } from "./NotificationManager.js";

export class UpdateManager {
    constructor() {
        if (UpdateManager.instance) return UpdateManager.instance;
        UpdateManager.instance = this;

        // URL where your manifest.json is hosted (GitHub Pages, AWS S3, etc.)
        this.manifestUrl = "https://danngo-png.github.io/Kaizen-RPG/updates/manifest.json";
    }

    /**
     * Checks for updates against the remote manifest.
     * @returns {Promise<Object|null>} Returns manifest if update exists, null otherwise.
     */
    async check() {
        try {
            console.log(`🔍 Checking for updates at: ${this.manifestUrl}`);
            const manifest = await Neutralino.updater.checkForUpdates(this.manifestUrl);
            
            console.log("🚀 Update available:", manifest.version);
            return manifest;
        } catch (error) {
            // Neutralino rejects the promise if no update is found or if there is a network error.
            // We differentiate by checking the error message or context if needed.
            if (error.code === 'NE_UP_CUPDERR') {
                console.log("✅ Application is up to date.");
            } else {
                console.error("❌ Update check failed:", error);
            }
            return null;
        }
    }

    /**
     * Downloads and installs the update, then restarts the app.
     */
    async install() {
        try {
            notifier.show("Updating", "Downloading resources...", "fa-solid fa-download");
            
            await Neutralino.updater.install();
            
            notifier.show("Success", "Update installed. Restarting...", "fa-solid fa-rotate");
            
            // Short delay to let user read the toast
            setTimeout(async () => {
                await Neutralino.app.restart();
            }, 1500);

        } catch (error) {
            console.error("❌ Install failed:", error);
            notifier.show("Update Failed", "Could not install update.", "fa-solid fa-triangle-exclamation");
        }
    }
}

export const updateManager = new UpdateManager();