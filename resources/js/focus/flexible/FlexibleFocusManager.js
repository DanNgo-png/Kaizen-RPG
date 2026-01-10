import { FlexibleSessionState } from "./FlexibleSessionState.js";
import { FocusAPI } from "../../api/FocusAPI.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { notifier } from "../../_global-managers/NotificationManager.js";

class FlexibleFocusManager {
    constructor() {
        if (FlexibleFocusManager.instance) {
            return FlexibleFocusManager.instance;
        }
        FlexibleFocusManager.instance = this;

        this.state = new FlexibleSessionState({ ratio: 3.0 });
        this.timerInterval = null;
        
        // Configuration needed for saving
        this.cachedTags = []; 

        // Warning Logic State
        this.warnEnabled = false;
        this.warnIntervalMinutes = 5; 
        this.lastWarnedMinute = 0; // Tracks the last negative threshold crossed (e.g. 5, 10, 15)

        this.initSettings();
    }

    initSettings() {
        // Listen for updates
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            if (key === 'flexibleWarnEnabled') {
                this.warnEnabled = (value === true || value === 'true' || value === 1);
            }
            if (key === 'flexibleWarnInterval') {
                this.warnIntervalMinutes = parseInt(value) || 5;
            }
        });

        SettingsAPI.getSetting('flexibleWarnEnabled');
        SettingsAPI.getSetting('flexibleWarnInterval');
    }

    startTicker() {
        if (this.timerInterval) return;
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }

    stopTicker() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    tick() {
        // Update internal state
        const stats = this.state.getStats();
        
        // Check for Negative Balance Warning
        this.checkBalanceWarning(stats.balanceMs);

        // Broadcast event for the UI (if active) to pick up
        const event = new CustomEvent('kaizen:flex-tick', { detail: stats });
        document.dispatchEvent(event);
    }

    checkBalanceWarning(balanceMs) {
        if (!this.warnEnabled) return;
        
        // Only care if balance is negative
        if (balanceMs >= 0) {
            this.lastWarnedMinute = 0; // Reset logic if user recovers balance
            return;
        }

        const absSeconds = Math.abs(balanceMs / 1000);
        const absMinutes = Math.floor(absSeconds / 60);

        // Check if we hit a threshold (e.g. 5m, 10m, 15m...)
        // Logic: If current negative minutes is >= next threshold AND we haven't warned for this specific threshold yet
        
        // Calculate the next threshold we expect to hit based on interval
        // e.g. If lastWarned is 0, next is 5. If lastWarned is 5, next is 10.
        const nextThreshold = this.lastWarnedMinute + this.warnIntervalMinutes;

        if (absMinutes >= nextThreshold && absMinutes > 0) {
            this.triggerWarning(absMinutes);
            // Update tracking to the current interval step
            // Use math to snap to the interval (e.g. if we check at 5:01, record 5)
            this.lastWarnedMinute = Math.floor(absMinutes / this.warnIntervalMinutes) * this.warnIntervalMinutes;
        }
    }

    triggerWarning(minutesOver) {
        const title = "Balance Overdrawn";
        const message = `You are ${minutesOver} minutes into focus debt. Consider focusing to recover.`;
        
        notifier.show(title, message, "fa-solid fa-triangle-exclamation");
    }

    // --- State Proxies ---
    
    switchState(newStatus) {
        // If starting from idle, start the clock
        if (this.state.status === 'idle' && newStatus !== 'idle') {
            this.startTicker();
        }
        this.state.switchStatus(newStatus);
        this.tick(); // Force immediate update
    }

    setRatio(val) {
        this.state.setRatio(val);
        if(this.state.status !== 'idle') this.tick();
    }

    setTag(tag) {
        this.state.setTag(tag);
    }

    adjustTotals(focusMs, breakMs) {
        this.state.adjustTotals(focusMs, breakMs);
        this.tick();
    }

    commitSession(focusSeconds, breakSeconds) {
        const payload = {
            tag: this.state.currentTag,
            focusSeconds: focusSeconds,
            breakSeconds: breakSeconds,
            ratio: this.state.ratio,
            timer_type: 'flexible'
        };

        FocusAPI.saveFocusSession(payload);
        
        // Reset Logic
        this.stopTicker();
        this.state.reset();
        this.lastWarnedMinute = 0; // Reset warning tracker
        
        // Emit one last tick to clear UI to 00:00
        this.tick();
    }

    getStats() {
        return this.state.getStats();
    }
}

export const flexManager = new FlexibleFocusManager();