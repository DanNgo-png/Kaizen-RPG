import { 
    updateFontSelectUI, 
    applyFontFamily, 
    updateFontDropdownOptions, 
    updateDailyGoalUI,
    onClearHistorySuccess
} from "../main-settings/mainSettingsManager.js";
import { FocusHandler } from "./FocusHandler.js"

export const SettingsHandler = {
    onReceiveSetting: (event) => {
        const { key, value } = event.detail;

        if (key === 'fontFamily') {
            // 1. Always apply the visual change (Global)
            applyFontFamily(value);

            // 2. Update the dropdown only if it exists (Page Specific)
            updateFontSelectUI(value);
        }

        if (key === 'dailyGoal') {
            // 1. Update Settings Page UI (if exists)
            updateDailyGoalUI(value);
            
            // 2. Update Focus Logic state
            FocusHandler.updateDailyGoal(value);
        }

        // Handle Iterations Setting
        if (key === 'standardFocusIterations') {
            const val = parseInt(value);
            if (!isNaN(val)) {
                // 1. Update Input Field
                const iterInput = document.getElementById('iter-val');
                if (iterInput) iterInput.value = val;

                // 2. Dispatch event for Timer UI to rebuild dots
                document.dispatchEvent(new CustomEvent('kaizen:iterations-updated', { detail: val }));
            }
        }

        // Broadcast generic event for other components (like Focus Timer) to pick up
        const updateEvent = new CustomEvent('kaizen:setting-update', { detail: { key, value } });
        document.dispatchEvent(updateEvent);
    },

    onSettingSaved: (event) => {
        const { key, value } = event.detail;
        console.log(`✅ Setting saved: ${key} = ${value}`);

        const updateEvent = new CustomEvent('kaizen:setting-update', { detail: { key, value } });
        document.dispatchEvent(updateEvent);
        
        if (key === 'dailyGoal') {
            FocusHandler.updateDailyGoal(value);
        }
    },

    onReceiveCustomFonts: (event) => {
        const fonts = event.detail;
        updateFontDropdownOptions(fonts);
    },

    // Handle clearance confirmation
    onFocusHistoryCleared: (event) => {
        const result = event.detail;
        if (result.success) {
            // Trigger the visual success state in the modal
            onClearHistorySuccess();
            
            // Optional: You might want to refresh specific UI elements if they are visible
            // e.g., if the user has the Dashboard open in the background.
        } else {
            // We keep alert for errors as they are critical/unexpected
            alert("Failed to clear history: " + result.error);
            
            // Optional: Reset button state in modal if error occurs
            const btnConfirm = document.getElementById('clear-history-btn-confirm-clear');
            if(btnConfirm) {
                btnConfirm.innerHTML = '<i class="fa-solid fa-trash"></i> Yes, Delete Everything';
                btnConfirm.disabled = false;
                btnConfirm.style.opacity = '1';
            }
        }
    }
};