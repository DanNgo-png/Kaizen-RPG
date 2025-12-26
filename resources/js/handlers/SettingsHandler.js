import { updateFontSelectUI, applyFontFamily, updateFontDropdownOptions } from "../main-settings/mainSettingsManager.js";

export const SettingsHandler = {
    onReceiveSetting: (event) => {
        const { key, value } = event.detail;

        if (key === 'fontFamily') {
            // 1. Always apply the visual change (Global)
            applyFontFamily(value);

            // 2. Update the dropdown only if it exists (Page Specific)
            updateFontSelectUI(value);
        }
    },

    onSettingSaved: (event) => {
        const { key, value } = event.detail;
        console.log(`✅ Setting saved: ${key} = ${value}`);
    },

    onReceiveCustomFonts: (event) => {
        const fonts = event.detail;
        updateFontDropdownOptions(fonts);
    }
};