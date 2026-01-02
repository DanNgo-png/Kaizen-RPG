export const FocusHandler = {
    /**
     * Handle 'receiveFocusSessions' from server.
     * Expected payload: Array of session objects { focus_seconds, ... }
     * @param {CustomEvent} event
     */
    onReceiveSessions: (event) => {
        const sessions = event.detail || [];
        console.log(`📦 Focus Handler: Received ${sessions.length} sessions.`);

        const elFocusTime = document.getElementById('overview-today-focus');
        const elSessionCount = document.getElementById('overview-today-sessions');

        if (!elFocusTime || !elSessionCount) {
            console.warn("⚠️ Focus Handler: Could not find Overview DOM elements (overview-today-focus/sessions). Are you on the Overview page?");
            return;
        }

        // 1. Calculate Totals
        let totalSeconds = 0;
        sessions.forEach(s => {
            totalSeconds += (s.focus_seconds || 0);
        });

        // 2. Format Time
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        
        let timeString = "";
        if (h > 0) timeString += `${h}h `;
        timeString += `${m}m`;
        
        // Fallback for 0
        if (totalSeconds === 0) timeString = "0m";

        // 3. Update DOM
        elFocusTime.textContent = timeString;
        elSessionCount.textContent = sessions.length.toString();
        
        console.log(`✅ UI Updated: Time=${timeString}, Count=${sessions.length}`);
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

    onReceiveLifetimeStats: (event) => {
        const stats = event.detail;
        
        const elFocus = document.getElementById('lifetime-total-focus');
        const elSessions = document.getElementById('lifetime-total-sessions');
        const elDays = document.getElementById('lifetime-focus-days');

        // Only update if elements exist (we are on the correct page)
        if (elFocus && elSessions && elDays) {
            // Format Seconds to Xh Ym
            const totalSeconds = stats.total_focus;
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            elFocus.textContent = timeStr;
            elSessions.textContent = stats.total_sessions;
            elDays.textContent = stats.total_days;
        }
    }
};