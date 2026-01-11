import { SettingsAPI } from "../../api/SettingsAPI.js";
import { TimerConfig } from "./TimerConfig.js";

export class FocusSettingsSync {
    constructor(ui, manager) {
        this.ui = ui;
        this.manager = manager;
    }

    init() {
        this._bindEvents();
        this._requestInitialSettings();
    }

    _bindEvents() {
        document.addEventListener('kaizen:setting-update', (e) => this._handleSettingUpdate(e));
        document.addEventListener('kaizen:iterations-updated', (e) => this._handleIterationsUpdate(e));
        document.addEventListener('kaizen:mode-changed', (e) => this._handleModeChanged(e));
        document.addEventListener('kaizen:stopwatch-mode-changed', (e) => this._handleStopwatchModeChanged(e));
    }

    _requestInitialSettings() {
        const keys = [
            'timerFocusDuration', 'timerShortBreak', 'standardFocusIterations', 
            'timerLongBreak', 'timerLongBreakInt', 'timerAutoStartFocus', 
            'timerAutoStartBreak', 'timerAlarmSound', 'focusTimerMuted',
            'focusTimerVolume', 'enableOSNotifications'
        ];
        keys.forEach(key => SettingsAPI.getSetting(key));
    }

    _handleSettingUpdate(e) {
        const { key, value } = e.detail;

        // Map settings to DOM Inputs
        const defaultsMap = {
            'timerFocusDuration': 'focus-val',
            'timerShortBreak':    'break-val',
            'standardFocusIterations': 'iter-val',
            'timerLongBreak':     'lb-dur-val',
            'timerLongBreakInt':  'lb-int-val'
        };

        if (defaultsMap[key]) {
            const inputEl = document.getElementById(defaultsMap[key]);
            if (inputEl) {
                inputEl.value = value;
                // Update display immediately if idle
                const state = this.manager.getState();
                const isIdle = state.mode === 'focus' && state.completedSets === 0 && !state.isRunning && !state.isPaused;
                
                if (key === 'timerFocusDuration' && isIdle) {
                    this.ui.updateTimeDisplay(value * 60);
                }
            }
        }

        // Auto-Start Logic
        if (key === 'timerAutoStartFocus') this.manager.setAutoStart('focus', this._parseBool(value));
        if (key === 'timerAutoStartBreak') this.manager.setAutoStart('break', this._parseBool(value));
        
        // Audio Logic
        if (key === 'timerAlarmSound') this.manager.setAlarmSound(value);
        if (key === 'focusTimerMuted') {
            const isMuted = this._parseBool(value);
            this.manager.setMute(isMuted);
            this.ui.updateVolumeIcon(isMuted);
        }
    }

    _handleIterationsUpdate(e) {
        // Redraw dots logic needs to be handled by UI, but we can trigger a visual refresh check here
        // or rely on the UI's own state logic. Ideally, the TimerUI should observe this directly, 
        // but for now, we leave the complex dot logic in the main controller or move it to UI.
        // For this refactor, we simply acknowledge the update.
    }

    _handleModeChanged(e) {
        const mode = e.detail; 
        const state = this.manager.getState();

        if (!state.isRunning && !state.isPaused) {
            const isSw = (mode === 'stopwatch');
            let subMode = 'focus';
            if (isSw) subMode = TimerConfig.getStopwatchSubMode();

            this.ui.setControlsState(false, false, subMode, isSw);

            if (isSw) {
                this.ui.updateTimeDisplay(0);
                this.ui.setModeVisuals(subMode);
            } else {
                this.ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
                this.ui.setModeVisuals('focus');
            }
        }
    }

    _handleStopwatchModeChanged(e) {
        const subMode = e.detail;
        const state = this.manager.getState();
        const isCurrentlyStopwatch = TimerConfig.isStopwatchMode();

        if (!state.isRunning && !state.isPaused && isCurrentlyStopwatch) {
            this.ui.setModeVisuals(subMode);
            this.ui.setControlsState(false, false, subMode, true);
        }
    }

    _parseBool(val) {
        return (val === true || val === 'true' || val === 1 || val === '1');
    }
}