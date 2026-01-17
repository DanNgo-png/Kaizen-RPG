import { loadPage } from '../../router.js';
import { 
    initOverview, 
    initDayAnalytics, 
    initWeekAnalytics, 
    initMonthAnalytics, 
    initYearAnalytics, 
    initCustomAnalytics 
} from '../ImportManager.js';

export function setupAnalyzeNavigation() {
    const analyzeOverview = document.querySelector(".analyze-overview-button");
    if (analyzeOverview) {
        analyzeOverview.addEventListener("click", async () => {
            await loadPage('./pages/analyze/overview.html');
            initOverview();
        });
    }

    const analyzeDay = document.querySelector(".analyze-day-button");
    if (analyzeDay) {
        analyzeDay.addEventListener("click", async () => {
            await loadPage('./pages/analyze/day.html');
            initDayAnalytics();
        });
    }

    const analyzeWeek = document.querySelector(".analyze-week-button");
    if (analyzeWeek) {
        analyzeWeek.addEventListener("click", async () => {
            await loadPage('./pages/analyze/week.html');
            initWeekAnalytics();
        });
    }

    const analyzeMonth = document.querySelector(".analyze-month-button");
    if (analyzeMonth) {
        analyzeMonth.addEventListener("click", async () => {
            await loadPage('./pages/analyze/month.html');
            initMonthAnalytics();
        });
    }

    const analyzeYear = document.querySelector(".analyze-year-button");
    if (analyzeYear) {
        analyzeYear.addEventListener("click", async () => {
            await loadPage('./pages/analyze/year.html');
            initYearAnalytics();
        });
    }

    const analyzeCustom = document.querySelector(".analyze-custom-button");
    if (analyzeCustom) {
        analyzeCustom.addEventListener("click", async () => {
            await loadPage('./pages/analyze/custom.html');
            initCustomAnalytics();
        });
    }
}