import { EXTENSION_ID } from "./_extension_id.js";

export const SettingsAPI = {

    saveSetting: async (key, value) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "saveSetting", { key, value });
    },

    getSetting: async (key) => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getSetting", { key });
    },

    getCustomFonts: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getCustomFonts", null);
    },

    openFontsFolder: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "openFontsFolder", null);
    },

    getCustomSounds: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "getCustomSounds", null);
    },

    openSoundsFolder: async () => {
        await Neutralino.extensions.dispatch(EXTENSION_ID, "openSoundsFolder", null);
    }
};