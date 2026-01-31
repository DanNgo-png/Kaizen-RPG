import { EXTENSION_ID } from "./_extension_id.js";

export const GameAPI = {
    // --- CAMPAIGN ---
    createCampaign: async (slotId, campaignData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "createNewGame", { slotId, campaignData });
    },
    
    getWorldData: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getWorldData", null);
    },

    saveWorldData: async (playerData) => {
        // playerData: { x: number, y: number }
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveWorldData", playerData);
    },

    // --- PARTY & RESOURCES ---
    getPartyData: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getPartyData", null);
    },

    hireMercenary: async (mercData, cost) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "hireMercenary", { mercData, cost });
    }
};