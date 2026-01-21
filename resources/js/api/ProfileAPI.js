import { EXTENSION_ID } from "./_extension_id.js";

export const ProfileAPI = {
    getProfiles: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getCampaignProfiles", null);
    },

    saveProfile: async (name, config) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveCampaignProfile", { name, config });
    },

    deleteProfile: async (id) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "deleteCampaignProfile", { id });
    }
};