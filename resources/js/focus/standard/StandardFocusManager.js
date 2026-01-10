import { FocusAPI } from "../../api/FocusAPI.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { audioManager } from "../../_global-managers/AudioManager.js";

class StandardFocusManager {
    constructor() {
        if (StandardFocusManager.instance) {
            return StandardFocusManager.instance;
        }
        StandardFocusManager.instance = this;

        this.intervalId = null;
        this.isRunning = false;
        this.isPaused = false;
        
        this.mode = 'focus'; 
        this.isStopwatch = false;
        
        // Time tracking
        this.secondsRemaining = 0;  
        this.secondsElapsed = 0;    
        this.currentTag = "No Tag"; 

        this.completedSets = 0; 
        this.targetIterations = 1;

        // Auto-Start Flags 
        this.autoStartFocus = false;
        this.autoStartBreak = false;

        this.sessionConfig = {
            focusDuration: 25 * 60,
            breakDuration: 5 * 60,
            longBreakDuration: 15 * 60,
            longBreakInterval: 4,
            longBreakEnabled: false,
            tag: "No Tag"
        };

        this.currentSoundKey = 'bell'; 
        this.eventBus = new EventTarget();
    }

    /**
     * Facade Getter:
     * Allows StandardFocusTimer.js to read `standardManager.isMuted` 
     * without knowing about audioManager directly.
     */
    get isMuted() {
        return audioManager.isMuted;
    }

    // --- Setter for Auto-Start Settings ---
    setAutoStart(type, isEnabled) {
        if (type === 'focus') this.autoStartFocus = isEnabled;
        if (type === 'break') this.autoStartBreak = isEnabled;
    }

    // --- Allow updating tag while Idle ---
    setTag(tagName) {
        this.currentTag = tagName;
        this.sessionConfig.tag = tagName;
    }

    initialize() {
        // Listen for the saved state coming from the DB
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'standardTimerState' && e.detail.value) {
                try {
                    const state = JSON.parse(e.detail.value);
                    this.restoreState(state);
                } catch (err) {
                    console.error("Failed to parse saved Standard Timer state", err);
                }
            }
        });

        SettingsAPI.getSetting('standardTimerState');
    }

    initPersistence() {
        // Listen for the saved state coming from the DB
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'standardTimerState' && e.detail.value) {
                try {
                    const state = JSON.parse(e.detail.value);
                    this.restoreState(state);
                } catch (err) {
                    console.error("Failed to parse saved Standard Timer state", err);
                }
            }
        });

        SettingsAPI.getSetting('standardTimerState');
    }

    /**
     * Serializes current state to a JSON object and saves to DB.
     * Force-pauses the timer logic for the saved state.
     */
    saveState() {
        // Force pause state for storage
        const wasRunning = this.isRunning;
        
        const state = {
            mode: this.mode,
            isStopwatch: this.isStopwatch,
            secondsRemaining: this.secondsRemaining,
            secondsElapsed: this.secondsElapsed,
            currentTag: this.currentTag,
            completedSets: this.completedSets,
            targetIterations: this.targetIterations,
            sessionConfig: this.sessionConfig,
            // If it was running or paused, we save it as 'paused' so it doesn't auto-run on boot
            isActiveSession: (wasRunning || this.isPaused)
        };

        SettingsAPI.saveSetting('standardTimerState', JSON.stringify(state));
    }

    restoreState(savedState) {
        // Only restore if there was an active session
        if (!savedState.isActiveSession) return;

        console.log("🔄 Restoring Standard Timer State:", savedState);

        this.mode = savedState.mode;
        this.isStopwatch = savedState.isStopwatch;
        this.secondsRemaining = savedState.secondsRemaining;
        this.secondsElapsed = savedState.secondsElapsed;
        this.currentTag = savedState.currentTag;
        this.completedSets = savedState.completedSets;
        this.targetIterations = savedState.targetIterations;
        this.sessionConfig = savedState.sessionConfig || this.sessionConfig;

        // Set to Paused state
        this.isRunning = false;
        this.isPaused = true;

        // Emit update so UI refreshes immediately
        this._emitUpdate();
    }

    startSession(config) {
        if (this.isPaused && this.secondsRemaining > 0) {
            this.resume();
            return;
        }

        // 1. Store Configuration
        this.isStopwatch = config.isStopwatch;
        this.mode = config.mode || 'focus';
        this.currentTag = config.tag || "Standard";
        this.completedSets = 0; 
        this.targetIterations = config.iterations || 1;
        
        this.sessionConfig = {
            focusDuration: (config.focusMinutes || 25) * 60,
            breakDuration: (config.breakMinutes || 5) * 60,
            longBreakDuration: (config.longBreakMinutes || 15) * 60,
            longBreakInterval: config.longBreakInterval || 4,
            longBreakEnabled: config.longBreakEnabled || false,
            tag: this.currentTag
        };

        // 2. Set Initial Time
        if (this.isStopwatch) {
            this.secondsElapsed = 0;
        } else {
            this._setTimeForCurrentMode();
        }

        // 3. Start
        this.isRunning = true;
        this.isPaused = false;
        this.lastTickTime = Date.now();
        
        this.startTicker();
        this._emitUpdate();
        this.saveState(); 
    }

    pause() {
        this.isPaused = true;
        this.isRunning = false;
        this.stopTicker();
        this._emitUpdate();
        this.saveState();
    }

    resume() {
        this.isPaused = false;
        this.isRunning = true;
        this.lastTickTime = Date.now();
        this.startTicker();
        this._emitUpdate();
    }

    stop() {
        const wasStopwatch = this.isStopwatch;
        const elapsed = this.secondsElapsed;
        const currentMode = this.mode;
        const currentTag = this.currentTag;

        this.isRunning = false;
        this.isPaused = false;
        this.stopTicker();
        audioManager.stopCurrent(); // Stop audio if user manually stops session

        if (wasStopwatch && elapsed > 5 && currentMode === 'focus') { 
            const payload = {
                tag: currentTag,
                focusSeconds: elapsed, 
                breakSeconds: 0,
                ratio: 1.0,
                timer_type: 'stopwatch'
            };
            FocusAPI.saveFocusSession(payload);
        }

        // Reset defaults
        this.mode = 'focus';
        this.completedSets = 0;
        this.secondsRemaining = this.sessionConfig.focusDuration; 
        this.secondsElapsed = 0;
        
        this._emitUpdate();
        SettingsAPI.saveSetting('standardTimerState', JSON.stringify({ isActiveSession: false }));
    }

    skipPhase() {
        this.completePhase(true); 
    }

    startTicker() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            const now = Date.now();
            const deltaSeconds = Math.round((now - this.lastTickTime) / 1000);
            if (deltaSeconds >= 1) {
                this.tick(deltaSeconds);
                this.lastTickTime = now;
            }
        }, 1000);
    }

    stopTicker() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    tick(delta) {
        if (this.isStopwatch) {
            this.secondsElapsed += delta;
        } else {
            this.secondsRemaining -= delta;
            
            if (this.secondsRemaining <= 0) {
                this.secondsRemaining = 0;
                this.completePhase();
            }
        }
        this._emitUpdate();
    }

    completePhase(skipped = false) {
        this.stopTicker();
        this.isRunning = false;
        this.isPaused = false;

        // 1. Audio & Save
        if (!skipped && !this.isStopwatch) {
            this.playAlarm();
            
            if (this.mode === 'focus') {
                const payload = {
                    tag: this.currentTag,
                    focusSeconds: this.sessionConfig.focusDuration, 
                    breakSeconds: 0,
                    ratio: 1.0,
                    timer_type: 'standard'
                };
                FocusAPI.saveFocusSession(payload);
            }
        }

        // 2. Logic: Handle Mode Switching
        const previousMode = this.mode;

        if (previousMode === 'focus') {
            this.completedSets++;

            // Check Long Break Condition
            const isLongBreak = this.sessionConfig.longBreakEnabled && 
                                (this.completedSets % this.sessionConfig.longBreakInterval === 0);
            
            if (isLongBreak) {
                this.mode = 'long-break';
                this.secondsRemaining = this.sessionConfig.longBreakDuration;
            } else {
                this.mode = 'break';
                this.secondsRemaining = this.sessionConfig.breakDuration;
            }

        } else {
            if (this.completedSets >= this.targetIterations) {
                this.stop(); 
                this.eventBus.dispatchEvent(new CustomEvent('session-completed'));
                return;
            }

            this.mode = 'focus';
            this.secondsRemaining = this.sessionConfig.focusDuration;
        }
        
        this.eventBus.dispatchEvent(new CustomEvent('phase-completed', { 
            detail: { 
                completedMode: previousMode, 
                nextMode: this.mode,
                completedSets: this.completedSets
            } 
        }));

        // --- Auto-Start Logic ---
        const nextMode = this.mode;
        const shouldAutoStart = 
            (nextMode === 'focus' && this.autoStartFocus) || 
            ((nextMode === 'break' || nextMode === 'long-break') && this.autoStartBreak);

        if (shouldAutoStart && !this.isStopwatch) {
            this.isRunning = true;
            this.isPaused = false;
            this.lastTickTime = Date.now();
            this.startTicker();
        } else {
            this.isRunning = false;
            this.isPaused = false;
            this.stopTicker();
            this.saveState();
        }

        this._emitUpdate();
    }

    _setTimeForCurrentMode() {
        if (this.mode === 'focus') {
            this.secondsRemaining = this.sessionConfig.focusDuration;
        } else if (this.mode === 'long-break') {
            this.secondsRemaining = this.sessionConfig.longBreakDuration;
        } else {
            this.secondsRemaining = this.sessionConfig.breakDuration;
        }
    }

    setAlarmSound(soundKey) {
        this.currentSoundKey = soundKey;
    }

    playAlarm() {
        audioManager.play('alarm', this.currentSoundKey);
    }

    setMute(muted) {
        audioManager.setMute(muted);
    }

    _emitUpdate() {
        const displayTime = this.isStopwatch ? this.secondsElapsed : this.secondsRemaining;
        
        this.eventBus.dispatchEvent(new CustomEvent('tick', {
            detail: {
                time: displayTime,
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                mode: this.mode,
                isStopwatch: this.isStopwatch,
                completedSets: this.completedSets,
                targetIterations: this.targetIterations,
                tag: this.currentTag
            }
        }));
    }

    getState() {
        const displayTime = this.isStopwatch ? this.secondsElapsed : this.secondsRemaining;
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            time: displayTime,
            mode: this.mode,
            isStopwatch: this.isStopwatch,
            tag: this.currentTag,
            completedSets: this.completedSets,
            targetIterations: this.targetIterations
        };
    }
}

export const standardManager = new StandardFocusManager();