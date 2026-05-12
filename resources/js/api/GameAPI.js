import { EXTENSION_ID } from "./_extension_id.js";

export const GameAPI = {
    createCampaign: async (slotId, campaignData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "createNewGame", { slotId, campaignData });
    },

    closeGame: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "closeGame", null);
    },
    
    getWorldData: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getWorldData", null);
    },

    saveWorldData: async (playerData) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveWorldData", playerData);
    },

    // --- DELVING ---
    setDelvingStatus: async (isDelving) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "setDelvingStatus", { isDelving });
    },

    getPartyData: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getPartyData", null);
    },

    hireMercenary: async (mercData, cost) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "hireMercenary", { mercData, cost });
    },

    getActiveContract: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getActiveContract", null);
    },

    completeActiveContract: async (contractId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "completeActiveContract", { contractId });
    },

    getContractsForNode: async (nodeId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getContractsForNode", { nodeId });
    },

    acceptContract: async (contractId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "acceptContract", { contractId });
    },

    abortContract: async (contractId, nodeId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "abortContract", { contractId, nodeId });
    },

    getMarketData: async (nodeType) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getMarketData", { nodeType });
    },

    buyItem: async (itemId, cost, nodeId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "buyItem", { itemId, cost, nodeId });
    },

    sellItem: async (inventoryId, price, nodeId) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "sellItem", { inventoryId, price, nodeId });
    }
};