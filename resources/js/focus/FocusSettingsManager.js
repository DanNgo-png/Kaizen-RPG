import { SettingsAPI } from "../api/SettingsAPI.js";

export function initFocusSettings() {
    // Select the mute toggle input by its ID
    const muteToggle = document.getElementById('setting-mute-audio');

    if (muteToggle) {
        // 1. Define the handler for database updates
        const handleMuteUpdate = (e) => {
            const { key, value } = e.detail;
            if (key === 'focusTimerMuted') {
                // Robust check for SQLite boolean values (1, "1", true, "true")
                const isMuted = (value === true || value === 'true' || value === 1 || value === '1');
                muteToggle.checked = isMuted;
            }
        };

        // 2. Clean up any existing listeners to avoid duplicates
        document.removeEventListener('kaizen:setting-update', handleMuteUpdate);
        
        // 3. Attach the listener to receive updates from SettingsHandler
        document.addEventListener('kaizen:setting-update', handleMuteUpdate);

        // 4. Request the current setting value from the backend
        SettingsAPI.getSetting('focusTimerMuted');

        // 5. Save the setting when the user toggles the switch
        muteToggle.addEventListener('change', (e) => {
            SettingsAPI.saveSetting('focusTimerMuted', e.target.checked);
        });
    }
}