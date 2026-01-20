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
        this.lastWarnedMinute = 0; 

        // Persist Flexible Balance
        this.persistBalance = false; 
    }

    // Call this from main.js
    initialize() {
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;

            // Warnings
            if (key === 'flexibleWarnEnabled') {
                this.warnEnabled = (value === true || value === 'true' || value === 1);
            }
            if (key === 'flexibleWarnInterval') {
                this.warnIntervalMinutes = parseInt(value) || 5;
            }

            // Timer State Persistence
            if (key === 'flexibleTimerState' && value) {
                try {
                    const saved = JSON.parse(value);
                    this.restoreState(saved);
                } catch (err) {
                    console.error("Failed to parse Flexible Timer state", err);
                }
            }

            // Persist Flexible Balance
            if (key === 'flexibleBankPersistence') {
                this.persistBalance = (value === true || value === 'true' || value === 1);
            }
        });

        SettingsAPI.getSetting('flexibleWarnEnabled');
        SettingsAPI.getSetting('flexibleWarnInterval');
        SettingsAPI.getSetting('flexibleTimerState'); 
        SettingsAPI.getSetting('flexibleBankPersistence');
    }

    saveState() {
        // 1. Pause internal calculation (commit current segment to totals)
        this.state.switchStatus('idle'); 
        
        // 2. Get the snapshot
        const stats = this.state.getStats();

        // 3. Prepare payload (Only save if there is meaningful data)
        const hasData = stats.focusMs > 0 || stats.breakMs > 0;
        
        const payload = {
            hasData: hasData,
            ratio: stats.ratio,
            focusMs: stats.focusMs,
            breakMs: stats.breakMs,
            tag: stats.tag
        };

        SettingsAPI.saveSetting('flexibleTimerState', JSON.stringify(payload));
    }

    restoreState(saved) {
        if (!saved.hasData) return;

        console.log("🔄 Restoring Flexible Timer State:", saved);

        // Apply saved values to State
        this.state.ratio = saved.ratio || 3.0;
        this.state.accumulatedFocus = saved.focusMs || 0;
        this.state.accumulatedBreak = saved.breakMs || 0;
        this.state.currentTag = saved.tag || "No Tag";
        
        // Ensure state is idle/paused
        this.state.status = 'idle';
        this.state.startTime = null;

        // Force tick to update UI
        this.tick(); 
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
        const stats = this.state.getStats();
        this.checkBalanceWarning(stats.balanceMs);
        const event = new CustomEvent('kaizen:flex-tick', { detail: stats });
        document.dispatchEvent(event);
    }

    checkBalanceWarning(balanceMs) {
        if (!this.warnEnabled) return;
        if (balanceMs >= 0) {
            this.lastWarnedMinute = 0; 
            return;
        }

        const absSeconds = Math.abs(balanceMs / 1000);
        const absMinutes = Math.floor(absSeconds / 60);
        const nextThreshold = this.lastWarnedMinute + this.warnIntervalMinutes;

        if (absMinutes >= nextThreshold && absMinutes > 0) {
            this.triggerWarning(absMinutes);
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
        if (this.state.status === 'idle' && newStatus !== 'idle') {
            this.startTicker();
        }
        this.state.switchStatus(newStatus);
        this.tick(); 
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
        // 1. Save to DB (History)
        const payload = {
            tag: this.state.currentTag,
            focusSeconds: focusSeconds,
            breakSeconds: breakSeconds,
            ratio: this.state.ratio,
            timer_type: 'flexible'
        };

        FocusAPI.saveFocusSession(payload);
        this.stopTicker();

        // Handle Flexible Timer Balance Persistence
        if (this.persistBalance) {
            const stats = this.state.getStats();
            
            this.state.reset(); 

            if (stats.balanceMs > 0) {
                // Surplus: Simulate focus time that generated this surplus
                // Balance = Focus / Ratio  =>  Focus = Balance * Ratio
                this.state.accumulatedFocus = stats.balanceMs * this.state.ratio;
            } else if (stats.balanceMs < 0) {
                // Debt: Simulate break time that caused this debt
                // Balance = -Break => Break = -Balance
                this.state.accumulatedBreak = Math.abs(stats.balanceMs);
            }
        } else {
            this.state.reset();
        }

        this.lastWarnedMinute = 0;
        this.saveState(); 
        this.tick(); 
    }

    getStats() {
        return this.state.getStats();
    }
}

export const flexManager = new FlexibleFocusManager();