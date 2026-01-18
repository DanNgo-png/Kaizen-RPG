import { EXTENSION_ID } from "./_extension_id.js";

export const GameAPI = {
    // --- MERCENARIES ---
    getMercenaries: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getMercenaries", null);
    },
    addMercenary: async (mercenaryData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "addMercenary", mercenaryData);
    },

    // --- CAMPAIGN MANAGEMENT ---
    createCampaign: async (slotId, campaignData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "createNewGame", { slotId, campaignData });
    }
};