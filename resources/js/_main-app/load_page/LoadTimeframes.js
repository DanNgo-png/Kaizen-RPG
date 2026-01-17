import { loadPage } from '../../router.js';
import { 
    initTodayView, 
    initWeekPlan, 
    initQuarterView, 
    initYearPlan, 
    initTimeframeSettings 
} from '../ImportManager.js';

export function setupTimeframesNavigation() {
    const todayTimeframeButton = document.querySelector(".today-timeframe-button");
    if (todayTimeframeButton) {
        todayTimeframeButton.addEventListener("click", async () => {
            await loadPage('./pages/timeframes/today.html');
            initTodayView();
        });
    }

    const weekTimeframeButton = document.querySelector(".week-timeframe-button");
    if (weekTimeframeButton) {
        weekTimeframeButton.addEventListener("click", async () => {
            await loadPage('./pages/timeframes/this-week.html');
            initWeekPlan();
        });
    }

    const quarterTimeframeButton = document.querySelector(".quarter-timeframe-button");
    if (quarterTimeframeButton) {
        quarterTimeframeButton.addEventListener("click", async () => {
            await loadPage('./pages/timeframes/this-quarter.html');
            initQuarterView();
        });
    }

    const yearTimeframeButton = document.querySelector(".year-timeframe-button");
    if (yearTimeframeButton) {
        yearTimeframeButton.addEventListener("click", async () => {
            await loadPage('./pages/timeframes/this-year.html');
            initYearPlan();
        });
    }

    const settingsTimeframeButton = document.querySelector(".timeframe-settings-button");
    if (settingsTimeframeButton) {
        settingsTimeframeButton.addEventListener("click", async () => {
            await loadPage('./pages/timeframes/timeframes-settings.html');
            initTimeframeSettings();
        });
    }
}