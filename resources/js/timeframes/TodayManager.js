import { EXTENSION_ID } from "../api/_extension_id.js";
import { TaskPoolManager } from "./today/TaskPoolManager.js";
import { TimelineManager } from "./today/TimelineManager.js";
import { TodayUIManager } from "./today/TodayUIManager.js";

export class TodayManager {
    constructor() {
        this.now = new Date();
        this.dateKey = this.now.toISOString().split('T')[0];

        // Initialize Sub-Managers
        this.uiManager = new TodayUIManager(this.dateKey, this.now);
        this.poolManager = new TaskPoolManager(this.dateKey);
        this.timelineManager = new TimelineManager(this.dateKey);

        this.init();
    }

    init() {
        // Bind Backend Events
        Neutralino.events.off('receiveTodayData', this.handleData);
        Neutralino.events.on('receiveTodayData', (e) => this.handleData(e));

        Neutralino.events.off('refreshTodayView', this.handleRefresh);
        Neutralino.events.on('refreshTodayView', (e) => this.handleRefresh(e));

        this.fetchData();
    }

    fetchData() {
        Neutralino.extensions.dispatch(EXTENSION_ID, "getTodayData", { dateKey: this.dateKey });
    }

    handleData(e) {
        const data = e.detail;
        
        // Delegate to sub-managers
        this.uiManager.updateDailyGoal(data.dailyGoal);
        this.poolManager.render(data.pool, data.schedule); // Schedule needed for smart stacking calculation
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