import { FlexibleSessionState } from "./FlexibleSessionState.js";
import { FocusAPI } from "../../api/FocusAPI.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { notifier } from "../../_global-managers/NotificationManager.js";

const MILLISECONDS_PER_SECOND = 1000;

class FlexibleFocusManager {
    constructor() {
        if (FlexibleFocusManager.instance) {
            return FlexibleFocusManager.instance;
        }
        FlexibleFocusManager.instance = this;

        this.state = new FlexibleSessionState({ ratio: 3.0 });
        this.timerInterval = null;
        
        this.cachedTags = []; 

        this.warnEnabled = false;
        this.warnIntervalMinutes = 5; 
        this.lastWarnedMinute = 0; 

        this.persistBalance = false; 
        this.lastNotifiedFocusMs = 0;
    }

    initialize() {
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;

            if (key === 'flexibleWarnEnabled') {
                this.warnEnabled = (value === true || value === 'true' || value === 1);
            }
            if (key === 'flexibleWarnInterval') {
                this.warnIntervalMinutes = parseInt(value) || 5;
            }

            if (key === 'flexibleTimerState' && value) {
                try {
                    const saved = JSON.parse(value);
                    this.restoreState(saved);
                } catch (err) {
                    console.error("Failed to parse Flexible Timer state", err);
                }
            }

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
        this.state.switchStatus('idle'); 
        
        const stats = this.state.getStats();

        // Save if there is data OR if there is a carried balance we need to remember
        const hasData = stats.focusMs > 0 || stats.breakMs > 0 || stats.carriedMs !== 0;
        
        const payload = {
            hasData: hasData,
            ratio: stats.ratio,
            focusMs: stats.focusMs,
            breakMs: stats.breakMs,
            tag: stats.tag,
            carriedBalance: stats.carriedMs // Save the separate balance
        };

        SettingsAPI.saveSetting('flexibleTimerState', JSON.stringify(payload));
    }

    restoreState(saved) {
        if (!saved.hasData) return;

        console.log("🔄 Restoring Flexible Timer State:", saved);

        this.state.ratio = saved.ratio || 3.0;
        this.state.accumulatedFocus = saved.focusMs || 0;
        this.lastNotifiedFocusMs = this.state.accumulatedFocus;
        this.state.accumulatedBreak = saved.breakMs || 0;
        this.state.currentTag = saved.tag || "No Tag";
        this.state.carriedBalance = saved.carriedBalance || 0; // Restore separate balance
        
        this.state.status = 'idle';
        this.state.startTime = null;

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

        if (stats.status === 'focus') {
            const deltaMs = stats.focusMs - (this.lastNotifiedFocusMs || 0);
            if (deltaMs > 0) {
                document.dispatchEvent(new CustomEvent('kaizen:game-focus-tick', { detail: { seconds: deltaMs / 1000 } }));
                this.lastNotifiedFocusMs = stats.focusMs;
            }
        } else {
            this.lastNotifiedFocusMs = stats.focusMs;
        }

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
        notifier.show(title, message, "fa-solid fa-triangle-check");
    }

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

    modifyBalance(amountMs) {
        this.state.carriedBalance += amountMs;
        this.saveState();
        this.tick(); // Update any listeners (UI)
    }

    async commitSession(focusSeconds, breakSeconds) {
        const payload = {
            tag: this.state.currentTag,
            focusSeconds: focusSeconds,
            breakSeconds: breakSeconds,
            ratio: this.state.ratio,
            timer_type: 'flexible'
        };

        try {
            await FocusAPI.saveFocusSession(payload);
        } catch (error) {
            console.error("Failed to save flexible focus session", error);
            notifier.show(
                "Session Save Failed",
                "Your focus session was not saved. Please try again.",
                "fa-solid fa-triangle-exclamation"
            );
            throw error;
        }

        this.stopTicker();

        const committedFocusMs = focusSeconds * MILLISECONDS_PER_SECOND;
        const committedBreakMs = breakSeconds * MILLISECONDS_PER_SECOND;
        
        const sessionEarnedBreak = committedFocusMs / this.state.ratio;
        const sessionNetBalance = sessionEarnedBreak - committedBreakMs;

        const newCarriedBalance = this.state.carriedBalance + sessionNetBalance;

        this.state.reset(); 
        this.lastNotifiedFocusMs = 0; 

        if (this.persistBalance) {
            this.state.setCarriedBalance(newCarriedBalance);
        } else {
            this.state.setCarriedBalance(0);
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
