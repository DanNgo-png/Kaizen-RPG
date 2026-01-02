import { FocusAPI } from "../api/FocusAPI.js";

/**
 * Initializes the Overview Dashboard logic.
 * Calculates today's date range in UTC to match Database storage.
 */
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

    // 3. Convert to UTC Strings for SQLite (YYYY-MM-DD HH:MM:SS)
    // We use .toISOString() and replace 'T' with ' ' and trim the 'Z' to match SQLite default format
    const formatToSQL = (dateObj) => {
        return dateObj.toISOString().replace('T', ' ').split('.')[0];
    };

    const startStr = formatToSQL(startOfDay);
    const endStr = formatToSQL(endOfDay);

    console.log(`📅 Requesting sessions (UTC Range): ${startStr} to ${endStr}`);

    // 4. Request Data
    FocusAPI.getFocusSessions(startStr, endStr);
    FocusAPI.getLifetimeStats();
}