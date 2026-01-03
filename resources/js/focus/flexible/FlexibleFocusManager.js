/**
 * A Singleton class that manages the Flexible Focus state and timer loop.
 * Persists across page navigation.
 */
import { FlexibleSessionState } from "./FlexibleSessionState.js";
import { FocusAPI } from "../../api/FocusAPI.js";

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
        // 1. Update internal state
        const stats = this.state.getStats();
        
        // 2. Broadcast event for the UI (if active) to pick up
        // We attach the stats to the event detail so the UI doesn't have to recalculate
        const event = new CustomEvent('kaizen:flex-tick', { detail: stats });
        document.dispatchEvent(event);
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
            ratio: this.state.ratio
        };

        FocusAPI.saveFocusSession(payload);
        
        // Reset Logic
        this.stopTicker();
        this.state.reset();
        
        // Emit one last tick to clear UI to 00:00
        this.tick();
    }

    getStats() {
        return this.state.getStats();
    }
}

export const flexManager = new FlexibleFocusManager();