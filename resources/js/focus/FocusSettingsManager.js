import { SettingsAPI } from "../api/SettingsAPI.js";

export function initFocusSettings() {
    
    // Configuration Map: DOM ID -> Database Key
    const settingsMap = [
        { id: 'setting-mute-audio',      key: 'focusTimerMuted',       type: 'toggle' },
        { id: 'setting-timer-focus',     key: 'timerFocusDuration',    type: 'number' },
        { id: 'setting-timer-sb',        key: 'timerShortBreak',       type: 'number' },
        { id: 'setting-timer-iterations', key: 'standardFocusIterations', type: 'number' },
        { id: 'setting-timer-lb',        key: 'timerLongBreak',        type: 'number' },
        { id: 'setting-timer-interval',  key: 'timerLongBreakInt',     type: 'number' },
        { id: 'setting-auto-break',      key: 'timerAutoStartBreak',   type: 'toggle' },
        { id: 'setting-auto-focus',      key: 'timerAutoStartFocus',   type: 'toggle' }
    ];

    // 1. Generic Handler for DB Updates (Load Initial Data)
    const handleSettingUpdate = (e) => {
        const { key, value } = e.detail;

        // Find the setting config that matches this key
        const config = settingsMap.find(s => s.key === key);
        if (!config) return;

        const el = document.getElementById(config.id);
        if (!el) return;

        if (config.type === 'toggle') {
            // Handle SQLite boolean conversion (1/"1"/true)
            const isChecked = (value === true || value === 'true' || value === 1 || value === '1');
            el.checked = isChecked;
        } else if (config.type === 'number') {
            el.value = value;
        } else {
            el.value = value;
        }
    };

    // 2. Clean up & Attach Listener
    document.removeEventListener('kaizen:setting-update', handleSettingUpdate);
    document.addEventListener('kaizen:setting-update', handleSettingUpdate);

    // 3. Initialize Inputs
    settingsMap.forEach(config => {
        const el = document.getElementById(config.id);
        if (!el) return;

        // A. Request current value from Backend
        SettingsAPI.getSetting(config.key);

        // B. Bind Change Event to Save
        el.addEventListener('change', (e) => {
            let val;
            if (config.type === 'toggle') {
                val = e.target.checked;
            } else if (config.type === 'number') {
                val = parseFloat(e.target.value);
                if(isNaN(val)) val = 0; // Safety
            } else {
                val = e.target.value;
            }
            
            SettingsAPI.saveSetting(config.key, val);
        });
    });
}