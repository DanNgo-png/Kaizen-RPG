import { ProfileRepository } from "../database/SQLite3/repositories/settings/ProfileRepository.mjs";

export class ProfileController {
    constructor() {
        this.repo = new ProfileRepository();
    }

    register(app) {
        // Get All Profiles
        app.events.on("getCampaignProfiles", () => {
            try {
                const profiles = this.repo.getAllProfiles();
                const parsed = profiles.map(p => ({
                    ...p,
                    config: JSON.parse(p.config_json)
                }));
                app.events.broadcast("receiveCampaignProfiles", parsed);
            } catch (err) {
                console.error("❌ Profile Error:", err);
                app.events.broadcast("receiveCampaignProfiles", []);
            }
        });

        // Save Profile
        app.events.on("saveCampaignProfile", (payload) => {
            try {
                this.repo.saveProfile(payload.name, payload.config);
                app.events.broadcast("campaignProfileSaved", { success: true });
                // Auto-refresh list for all listeners
                this._broadcastList(app);
            } catch (err) {
                app.events.broadcast("campaignProfileSaved", { success: false, error: err.message });
            }
        });

        // Delete Profile
        app.events.on("deleteCampaignProfile", (payload) => {
            try {
                this.repo.deleteProfile(payload.id);
                this._broadcastList(app);
            } catch (err) {
                console.error("❌ Profile Delete Error:", err);
            }
        });
    }

    _broadcastList(app) {
        const profiles = this.repo.getAllProfiles().map(p => ({
            ...p,
            config: JSON.parse(p.config_json)
        }));
        app.events.broadcast("receiveCampaignProfiles", profiles);
    }
}