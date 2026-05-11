import { SettingsAPI } from "../api/SettingsAPI.js";

export class GameSettingsManager {
    constructor() {
        this.dom = {
            minFocus: document.getElementById('setting-min-focus'),
            maxFocus: document.getElementById('setting-max-focus')
        };

        this.init();
    }

    init() {
        if (!this.dom.minFocus || !this.dom.maxFocus) return;

        // 1. Setup Input Listeners
        this.dom.minFocus.addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 10;
            if (val < 1) val = 1;
            this.dom.minFocus.value = val;
            SettingsAPI.saveSetting('gameMinFocusTime', val);
        });

        this.dom.maxFocus.addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 120;
            if (val < 10) val = 10; // Prevent setting max lower than 10
            this.dom.maxFocus.value = val;
            SettingsAPI.saveSetting('gameMaxFocusTime', val);
        });

        // 2. Setup Data Listener for UI Sync
        this._handleSettingUpdate = (e) => {
            const { key, value } = e.detail;
            if (key === 'gameMinFocusTime') this.dom.minFocus.value = value;
            if (key === 'gameMaxFocusTime') this.dom.maxFocus.value = value;
        };

        document.addEventListener('kaizen:setting-update', this._handleSettingUpdate);

        // Cleanup listener when leaving the page
        const cleanupObserver = new MutationObserver((mutations) => {
            if (!document.body.contains(this.dom.minFocus)) {
                document.removeEventListener('kaizen:setting-update', this._handleSettingUpdate);
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        // 3. Request Initial Values from DB
        SettingsAPI.getSetting('gameMinFocusTime');
        SettingsAPI.getSetting('gameMaxFocusTime');
    }
}

export function initGameSettings() {
    new GameSettingsManager();
}