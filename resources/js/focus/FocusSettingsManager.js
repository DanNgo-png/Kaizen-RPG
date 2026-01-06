import { SettingsAPI } from "../api/SettingsAPI.js";
import { FocusAPI } from "../api/FocusAPI.js";
import { HistoryIOManager } from "./settings/HistoryIOManager.js"; 

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
let cachedSoundSetting = null;

const handleSettingUpdate = (e) => {
    const { key, value } = e.detail;
    if (key === 'timerAlarmSound') cachedSoundSetting = value;
    if (key === 'focusTimerVolume') {
        const inputEl = document.getElementById('setting-volume-input');
        if (inputEl) inputEl.value = value;
    }
    const config = settingsMap.find(s => s.key === key);
    if (!config) return;
    const el = document.getElementById(config.id);
    if (!el) return;
    if (config.type === 'toggle') {
        el.checked = (value === true || value === 'true' || value === 1 || value === '1');
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
    const stdGroup = document.createElement('optgroup');
    stdGroup.label = "Standard";
    STANDARD_SOUNDS.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        stdGroup.appendChild(opt);
    });
    select.appendChild(stdGroup);
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
    if (targetValue) select.value = targetValue;
};


// --- Event Proxies for History IO ---

// 1. Backend sends CSV data -> Pass to IO Manager
const onExportDataReceived = (e) => {
    const { csvContent } = e.detail;
    HistoryIOManager.handleExportFlow(csvContent);
};

// 2. Backend confirms Import -> Show alert
const onImportComplete = (e) => {
    const { success, count, error } = e.detail;
    if (success) {
        Neutralino.os.showMessageBox('Success', `Successfully imported ${count} sessions!`, 'OK', 'INFO');
    } else {
        Neutralino.os.showMessageBox('Import Failed', error || 'Unknown error occurred.', 'OK', 'ERROR');
    }
};


export function initFocusSettings() {
    
    // 1. Clean up Listeners
    document.removeEventListener('kaizen:setting-update', handleSettingUpdate);
    Neutralino.events.off('receiveCustomSounds', handleCustomSounds);
    document.removeEventListener('kaizen:export-data', onExportDataReceived);
    document.removeEventListener('kaizen:import-complete', onImportComplete);

    // 2. Register Listeners
    document.addEventListener('kaizen:setting-update', handleSettingUpdate);
    Neutralino.events.on('receiveCustomSounds', handleCustomSounds);
    
    // Bind IO Events (Mapped from EventRegistry.js)
    document.addEventListener('kaizen:export-data', onExportDataReceived);
    document.addEventListener('kaizen:import-complete', onImportComplete);

    // 3. Initialize Inputs & Bind Save Events (Standard Settings)
    settingsMap.forEach(config => {
        const el = document.getElementById(config.id);
        if (!el) return;
        SettingsAPI.getSetting(config.key);
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
            if (config.key === 'timerAlarmSound') cachedSoundSetting = val;
        });
        SettingsAPI.getSetting(config.key);
    });

    // 4. Volume Sync Logic
    const volSlider = document.getElementById('setting-volume-slider');
    const volInput = document.getElementById('setting-volume-input');
    if (volSlider && volInput) {
        volSlider.addEventListener('input', (e) => { volInput.value = e.target.value; });
        volInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if(val > 100) val = 100; if(val < 0) val = 0; if(isNaN(val)) val = 50;
            volInput.value = val; volSlider.value = val;
            SettingsAPI.saveSetting('focusTimerVolume', val);
        });
    }

    // 5. Load Custom Sounds & Folder Button
    SettingsAPI.getCustomSounds();
    const btnOpenAudio = document.getElementById('btn-open-audio-folder');
    if (btnOpenAudio) {
        const newBtn = btnOpenAudio.cloneNode(true);
        btnOpenAudio.parentNode.replaceChild(newBtn, btnOpenAudio);
        newBtn.addEventListener('click', () => SettingsAPI.openSoundsFolder());
    }

    // --- 6. HISTORY IO BUTTONS (New Logic) ---
    
    // Export Button
    const btnExport = document.getElementById('btn-export-history');
    if (btnExport) {
        const newBtn = btnExport.cloneNode(true);
        btnExport.parentNode.replaceChild(newBtn, btnExport);
        newBtn.addEventListener('click', () => {
            // Request data from backend. Backend will emit 'receiveExportData'
            FocusAPI.requestExportHistory();
        });
    }

    // Import Button
    const btnImport = document.getElementById('btn-import-history');
    if (btnImport) {
        const newBtn = btnImport.cloneNode(true);
        btnImport.parentNode.replaceChild(newBtn, btnImport);
        newBtn.addEventListener('click', () => {
            // Hand off to IO Manager
            HistoryIOManager.triggerImportFlow();
        });
    }

    // 7. Cleanup Observer
    const container = document.querySelector('.settings-container');
    if (container) {
        const observer = new MutationObserver((mutations) => {
            if (!document.body.contains(container)) {
                document.removeEventListener('kaizen:setting-update', handleSettingUpdate);
                document.removeEventListener('kaizen:export-data', onExportDataReceived);
                document.removeEventListener('kaizen:import-complete', onImportComplete);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}