import { SettingsAPI } from "../api/SettingsAPI.js";

const settingsMap = [
    // Section: TIMER DEFAULTS
    { id: 'setting-timer-focus',     key: 'timerFocusDuration',    type: 'number' },
    { id: 'setting-timer-sb',        key: 'timerShortBreak',       type: 'number' },
    { id: 'setting-timer-iterations', key: 'standardFocusIterations', type: 'number' },
    { id: 'setting-timer-lb',        key: 'timerLongBreak',        type: 'number' },
    { id: 'setting-timer-interval',  key: 'timerLongBreakInt',     type: 'number' },

    // Section: REVIEW LOG 
    { id: 'setting-review-view',         key: 'reviewDefaultView',        type: 'string' },
    { id: 'setting-review-start-target', key: 'reviewStartSessionTarget', type: 'string' },
    
    // Section: AUTOMATION
    { id: 'setting-auto-break',      key: 'timerAutoStartBreak',   type: 'toggle' },
    { id: 'setting-auto-focus',      key: 'timerAutoStartFocus',   type: 'toggle' },

    // Section: SOUNDS & NOTIFICATIONS
    { id: 'setting-mute-audio',      key: 'focusTimerMuted',       type: 'toggle' },
    { id: 'setting-alarm-sound',     key: 'timerAlarmSound',       type: 'string' },
    { id: 'setting-volume-slider',   key: 'focusTimerVolume',      type: 'number' },
    { id: 'setting-os-notification', key: 'enableOSNotifications', type: 'toggle' }
];

const STANDARD_SOUNDS = ['bell', 'chime', 'elevator', 'moktak', 'none'];

// State to handle the race condition between DB load and File Scan
let cachedSoundSetting = null;

const handleSettingUpdate = (e) => {
    const { key, value } = e.detail;

    // Capture the sound setting whenever it comes in
    if (key === 'timerAlarmSound') {
        cachedSoundSetting = value;
    }

    // Special Case: Update the Input box if Volume changes via DB/Map
    if (key === 'focusTimerVolume') {
        const inputEl = document.getElementById('setting-volume-input');
        if (inputEl) inputEl.value = value;
    }

    // 1. Find the setting config
    const config = settingsMap.find(s => s.key === key);
    if (!config) return;

    // 2. Check if element exists (User might have navigated away)
    const el = document.getElementById(config.id);
    if (!el) return;

    // 3. Update UI
    if (config.type === 'toggle') {
        const isChecked = (value === true || value === 'true' || value === 1 || value === '1');
        el.checked = isChecked;
    } else {
        el.value = value;
    }
};

const handleCustomSounds = (e) => {
    const files = e.detail || [];
    const select = document.getElementById('setting-alarm-sound');
    if (!select) return;

    const targetValue = cachedSoundSetting !== null ? cachedSoundSetting : select.value;
    select.innerHTML = ''; 

    // Standard Group
    const stdGroup = document.createElement('optgroup');
    stdGroup.label = "Standard";
    STANDARD_SOUNDS.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        stdGroup.appendChild(opt);
    });
    select.appendChild(stdGroup);

    // Custom Group
    if (files.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = "Custom";
        
        files.forEach(file => {
            const opt = document.createElement('option');
            opt.value = file; 
            opt.textContent = file;
            customGroup.appendChild(opt);
        });
        select.appendChild(customGroup);
    }

    // Apply the value now that options exist
    if (targetValue) {
        select.value = targetValue;
    }
};

// --- Main Init Function ---
export function initFocusSettings() {
    
    // 1. Clean up any previous listeners to prevent duplicates
    document.removeEventListener('kaizen:setting-update', handleSettingUpdate);
    Neutralino.events.off('receiveCustomSounds', handleCustomSounds);

    // 2. Attach Listeners
    document.addEventListener('kaizen:setting-update', handleSettingUpdate);
    Neutralino.events.on('receiveCustomSounds', handleCustomSounds);

    // 3. Initialize Inputs & Bind Save Events
    settingsMap.forEach(config => {
        const el = document.getElementById(config.id);
        if (!el) return;

        // Request current value
        SettingsAPI.getSetting(config.key);

        // Bind Change Event
        // Remove old listener if possible (cloning replaces element to strip listeners)
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);

        newEl.addEventListener('change', (e) => {
            let val;
            if (config.type === 'toggle') {
                val = e.target.checked;
            } else if (config.type === 'number') {
                val = parseFloat(e.target.value);
                if(isNaN(val)) val = 0;
            } else {
                val = e.target.value;
            }
            SettingsAPI.saveSetting(config.key, val);

            if (config.key === 'timerAlarmSound') {
                cachedSoundSetting = val;
            }
        });

        SettingsAPI.getSetting(config.key);
    });

    // --- Volume 2-Way Sync Logic ---
    const volSlider = document.getElementById('setting-volume-slider');
    const volInput = document.getElementById('setting-volume-input');

    if (volSlider && volInput) {
        // 1. Slider -> Input (Visual Sync on drag)
        volSlider.addEventListener('input', (e) => {
            volInput.value = e.target.value;
        });

        // 2. Input -> Slider & Save (On Change/Enter)
        volInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if(val > 100) val = 100;
            if(val < 0) val = 0;
            if(isNaN(val)) val = 50;

            volInput.value = val;
            volSlider.value = val;
            
            // Trigger Save
            SettingsAPI.saveSetting('focusTimerVolume', val);
        });
    }

    // 4. Load Custom Sounds
    SettingsAPI.getCustomSounds();

    // 5. Button Logic: Open Folder
    const btnOpenAudio = document.getElementById('btn-open-audio-folder');
    if (btnOpenAudio) {
        const newBtn = btnOpenAudio.cloneNode(true);
        btnOpenAudio.parentNode.replaceChild(newBtn, btnOpenAudio);
        newBtn.addEventListener('click', () => SettingsAPI.openSoundsFolder());
    }

    // 6. CLEANUP OBSERVER
    const container = document.querySelector('.settings-container'); // Root of settings page
    if (container) {
        const observer = new MutationObserver((mutations) => {
            if (!document.body.contains(container)) {
                document.removeEventListener('kaizen:setting-update', handleSettingUpdate);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}