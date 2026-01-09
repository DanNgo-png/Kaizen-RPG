import { EXTENSION_ID } from "../api/_extension_id.js";
import { SettingsAPI } from "../api/SettingsAPI.js";
import { TaskPoolManager } from "./today/TaskPoolManager.js";
import { TimelineManager } from "./today/TimelineManager.js";
import { TodayUIManager } from "./today/TodayUIManager.js";

export class TodayManager {
    constructor() {
        this.now = new Date();
        this.dateKey = this.now.toISOString().split('T')[0];

        this.uiManager = new TodayUIManager(this.dateKey, this.now);
        this.poolManager = new TaskPoolManager(this.dateKey);
        this.timelineManager = new TimelineManager(this.dateKey);

        // State for settings
        this.timelineSettings = { start: 9, end: 17, format: '24h' };

        this.init();
    }

    init() {
        // 1. Data Listeners
        Neutralino.events.off('receiveTodayData', this.handleData);
        Neutralino.events.on('receiveTodayData', (e) => this.handleData(e));

        Neutralino.events.off('refreshTodayView', this.handleRefresh);
        Neutralino.events.on('refreshTodayView', (e) => this.handleRefresh(e));

        // 2. Settings Listeners
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            if (key === 'timelineStartHour') {
                this.timelineSettings.start = value;
                this.timelineManager.updateConfig(this.timelineSettings.start, this.timelineSettings.end);
            }
            if (key === 'timelineEndHour') {
                this.timelineSettings.end = value;
                this.timelineManager.updateConfig(this.timelineSettings.start, this.timelineSettings.end);
            }
            if (key === 'timeFormat') {
                this.timelineSettings.format = value || '24h';
                this.timelineManager.updateConfig(
                    this.timelineSettings.start, 
                    this.timelineSettings.end,
                    this.timelineSettings.format
                );
            }
        });

        // 3. Initial Load Sequence
        this.loadSettings();
        this.fetchData();
    }

    loadSettings() {
        SettingsAPI.getSetting('timelineStartHour');
        SettingsAPI.getSetting('timelineEndHour');
        SettingsAPI.getSetting('timeFormat');
    }

    fetchData() {
        Neutralino.extensions.dispatch(EXTENSION_ID, "getTodayData", { dateKey: this.dateKey });
    }

    handleData(e) {
        const data = e.detail;
        this.uiManager.updateDailyGoal(data.dailyGoal);
        this.poolManager.render(data.pool, data.schedule);
        this.timelineManager.render(data.schedule);
    }

    handleRefresh(e) {
        if(e.detail.dateKey === this.dateKey) {
            this.fetchData();
        }
    }
}

export function initTodayView() {
    new TodayManager();
}