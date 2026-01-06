import { FocusAPI } from "../api/FocusAPI.js";
import { SettingsAPI } from "../api/SettingsAPI.js";
import { CalendarManager } from "./CalendarManager.js";

/**
 * Helper: Converts a Date object to Local SQL String (YYYY-MM-DD HH:MM:SS)
 * Matches the format we are now storing in the DB.
 */
const formatToLocalSQL = (dateObj) => {
    const offsetMs = dateObj.getTimezoneOffset() * 60000;
    const localDate = new Date(dateObj.getTime() - offsetMs);
    return localDate.toISOString().replace('T', ' ').split('.')[0];
};

export function initOverview() {
    console.log("📊 Initializing Analyze: Overview...");

    const now = new Date();

    // 0. Update Date Subtitle
    const dateSubtitle = document.getElementById('overview-daily-date-subtitle');
    if (dateSubtitle) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateSubtitle.textContent = now.toLocaleDateString('en-US', options);
    }

    // 1. Define Start of Day (Local Time)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // 2. Define End of Day (Local Time)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 3. Convert to Local SQL Strings
    const startStr = formatToLocalSQL(startOfDay);
    const endStr = formatToLocalSQL(endOfDay);

    console.log(`📅 Requesting sessions (Local Range): ${startStr} to ${endStr}`);

    // 4. Request Data
    FocusAPI.getFocusSessions(startStr, endStr);
    FocusAPI.getLifetimeStats();
    SettingsAPI.getSetting('dailyGoal');

    // 5. Initialize Calendar 
    new CalendarManager(); 
}