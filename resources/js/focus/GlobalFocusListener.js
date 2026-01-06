import { standardManager } from "./standard/StandardFocusManager.js";
import { notifier } from "../_global-managers/NotificationManager.js";

export function initGlobalFocusListener() {
    console.log("🔔 Global Focus Listener Initialized");

    // Listen for Phase Completion (Focus <-> Break)
    standardManager.eventBus.addEventListener('phase-completed', (e) => {
        const { completedMode, nextMode } = e.detail;
        
        let title = "Timer Finished";
        let message = "Time's up!";
        let icon = "fa-solid fa-clock";

        if (completedMode === 'focus') {
            title = "Focus Complete";
            message = (nextMode === 'long-break') 
                ? "Great job! Time for a long break." 
                : "Time to take a break.";
            icon = "fa-solid fa-mug-hot";
        } else if (completedMode === 'break' || completedMode === 'long-break') {
            title = "Break Over";
            message = "Ready to focus again?";
            icon = "fa-solid fa-bolt";
        }

        // Trigger OS Notification
        notifier.show(title, message, icon);
    });

    // Listen for Full Session Completion (All iterations done)
    standardManager.eventBus.addEventListener('session-completed', () => {
        notifier.show(
            "Session Complete!", 
            "Congratulations! You've finished your target iterations.", 
            "fa-solid fa-trophy"
        );
    });
}