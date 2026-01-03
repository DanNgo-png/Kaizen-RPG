// resources/js/handlers/FocusHandler.js

// Module-level state to store data between events
// This allows us to re-render the message if *either* the sessions change OR the goal setting changes.
let cachedTotalSeconds = 0;
let cachedDailyGoal = 15; // Default fallback if DB is empty

/**
 * Helper function to calculate progress and update the DOM message.
 */
function renderStreakMessage() {
    const elStreakMsg = document.getElementById('streak-message');
    const elStreakIcon = elStreakMsg ? elStreakMsg.parentElement.querySelector('i') : null;

    // Only run if we are on the Overview page (element exists)
    if (elStreakMsg) {
        const currentMinutes = Math.floor(cachedTotalSeconds / 60);

        if (currentMinutes >= cachedDailyGoal) {
            // Goal Met
            elStreakMsg.textContent = `Daily goal (${cachedDailyGoal}m) reached! Streak secured.`;
            elStreakMsg.parentElement.style.color = "#4ade80"; // Light Green
            if (elStreakIcon) elStreakIcon.className = "fa-solid fa-circle-check";
        } else {
            // Goal Pending
            const remaining = cachedDailyGoal - currentMinutes;
            elStreakMsg.textContent = `${remaining} more minutes needed today to maintain your streak.`;
            elStreakMsg.parentElement.style.color = ""; // Reset to default color
            if (elStreakIcon) elStreakIcon.className = "fa-solid fa-circle-exclamation";
        }
    }
}

export const FocusHandler = {
    /**
     * Handle 'receiveFocusSessions' from server.
     * Calculates today's total focus time.
     * @param {CustomEvent} event
     */
    onReceiveSessions: (event) => {
        const sessions = event.detail || [];
        console.log(`📦 Focus Handler: Received ${sessions.length} sessions.`);

        const elFocusTime = document.getElementById('overview-today-focus');
        const elSessionCount = document.getElementById('overview-today-sessions');

        // If elements don't exist, we might not be on the Overview page, but we still update cache
        
        // 1. Calculate Totals
        let totalSeconds = 0;
        sessions.forEach(s => {
            totalSeconds += (s.focus_seconds || 0);
        });

        // 2. Update Cache
        cachedTotalSeconds = totalSeconds;

        // 3. Format Time (Xh Ym)
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        
        let timeString = "";
        if (h > 0) timeString += `${h}h `;
        timeString += `${m}m`;
        
        // Fallback for 0
        if (totalSeconds === 0) timeString = "0m";

        // 4. Update Stats DOM if present
        if (elFocusTime && elSessionCount) {
            elFocusTime.textContent = timeString;
            elSessionCount.textContent = sessions.length.toString();
        }

        // 5. Render Streak Message
        renderStreakMessage();
    },

    /**
     * Called by SettingsHandler when the 'dailyGoal' setting is retrieved.
     * @param {number|string} value 
     */
    updateDailyGoal: (value) => {
        if (value) {
            cachedDailyGoal = parseInt(value);
            // Re-render message immediately to reflect the new goal
            renderStreakMessage(); 
        }
    },

    /**
     * Handle 'focusSessionSaved' confirmation
     */
    onSessionSaved: (event) => {
        const result = event.detail;
        if(result.success) {
            console.log(`✅ Session saved successfully (ID: ${result.id})`);
        } else {
            console.error("❌ Failed to save session:", result.error);
        }
    },

    /**
     * Handle 'receiveLifetimeStats' including Streak data.
     */
    onReceiveLifetimeStats: (event) => {
        const stats = event.detail;
        
        // Lifetime Elements
        const elFocus = document.getElementById('lifetime-total-focus');
        const elSessions = document.getElementById('lifetime-total-sessions');
        const elDays = document.getElementById('lifetime-focus-days');

        // Streak Elements
        const elCurrentStreak = document.getElementById('overview-current-streak');
        const elBestStreak = document.getElementById('overview-best-streak');

        // Update Lifetime Stats
        // Only update if elements exist (we are on the correct page)
        if (elFocus && elSessions && elDays) {
            const totalSeconds = stats.total_focus;
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            elFocus.textContent = timeStr;
            elSessions.textContent = stats.total_sessions;
            elDays.textContent = stats.total_days;
        }

        // Update Streak Stats
        if (elCurrentStreak && elBestStreak) {
            // Default to 0 if undefined for safety
            const current = stats.currentStreak !== undefined ? stats.currentStreak : 0;
            const best = stats.bestStreak !== undefined ? stats.bestStreak : 0;

            elCurrentStreak.textContent = `${current} days`;
            elBestStreak.textContent = `${best} days`;
        }
    },

    onReceiveCalendarData: (event) => {
        const sessions = event.detail || [];
        
        // Dispatch a DOM event so the CalendarManager (which isn't imported here) can pick it up.
        // This decouples the Handler from the UI Class.
        const domEvent = new CustomEvent('kaizen:calendar-update', { detail: sessions });
        document.dispatchEvent(domEvent);
    }
};