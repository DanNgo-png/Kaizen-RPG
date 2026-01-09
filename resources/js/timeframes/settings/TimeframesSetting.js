import { SettingsAPI } from "../../api/SettingsAPI.js";

export class TimeframesSetting {
    constructor() {
        this.dom = {
            startHour: document.getElementById('tf-start-hour'),
            endHour: document.getElementById('tf-end-hour'),
            showWeekends: document.getElementById('tf-show-weekends'),
            timeFormat: document.getElementById('tf-time-format')
        };

        this.init();
    }

    init() {
        if (!this.dom.startHour) {
            console.warn("TimeframesSetting: DOM elements not found. Are you on the correct page?");
            return;
        }

        // 1. Bind Listeners (UI -> DB)
        this.dom.startHour.addEventListener('change', (e) => {
            SettingsAPI.saveSetting('timelineStartHour', e.target.value);
        });

        this.dom.endHour.addEventListener('change', (e) => {
            SettingsAPI.saveSetting('timelineEndHour', e.target.value);
        });

        if (this.dom.showWeekends) {
            this.dom.showWeekends.addEventListener('change', (e) => {
                SettingsAPI.saveSetting('timelineShowWeekends', e.target.checked);
            });
        }

        if (this.dom.timeFormat) {
            this.dom.timeFormat.addEventListener('change', (e) => {
                SettingsAPI.saveSetting('timeFormat', e.target.value);
            });
        }

        // 2. Listen for Data (DB -> UI)
        // We define the handler so we can remove it later if needed (though page navigates away usually)
        const updateHandler = (e) => {
            const { key, value } = e.detail;
            if (key === 'timelineStartHour' && this.dom.startHour) this.dom.startHour.value = value;
            if (key === 'timelineEndHour' && this.dom.endHour) this.dom.endHour.value = value;
            if (key === 'timelineShowWeekends' && this.dom.showWeekends) {
                this.dom.showWeekends.checked = (value === 'true' || value === true);
            }
            if (key === 'timeFormat' && this.dom.timeFormat) {
                this.dom.timeFormat.value = value || '24h';
            }
        };

        document.addEventListener('kaizen:setting-update', updateHandler);

        // 3. Load Initial Values
        SettingsAPI.getSetting('timelineStartHour');
        SettingsAPI.getSetting('timelineEndHour');
        SettingsAPI.getSetting('timelineShowWeekends');
        SettingsAPI.getSetting('timeFormat');
    }
}

export function initTimeframeSettings() {
    new TimeframesSetting();
}