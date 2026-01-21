import { TimerUI } from "./TimerUI.js";
import { TimerConfig } from "./TimerConfig.js";
import { standardManager } from "./StandardFocusManager.js";
import { TagUIManager } from "../../components/TagUIManager.js";
import { FocusAPI } from "../../api/FocusAPI.js";
import { setSidebarLocked } from "../configureSidebar.js";
import { SettingsAPI } from "../../api/SettingsAPI.js"; 
import { FocusSettingsSync } from "./FocusSettingsSync.js";
import { FocusOverlayManager } from "./FocusOverlayManager.js";

export function initFocusTimer() {
    const ui = new TimerUI();
    const currentState = standardManager.getState();

    // 1. Initialize Tag Manager
    const tagManager = new TagUIManager({
        triggerId: 'tag-trigger',
        displayId: 'tag-display',
        initialTag: currentState.tag || "No Tag", 
        defaultTag: "No Tag",
        onTagSelected: (tagName) => {
            standardManager.setTag(tagName);
        }
    });

    // 2. Initialize Helpers
    const settingsSync = new FocusSettingsSync(ui, standardManager);
    settingsSync.init();

    const overlayManager = new FocusOverlayManager();
    overlayManager.init();

    // 3. Bind Volume Toggle
    ui.updateVolumeIcon(standardManager.isMuted);
    if (ui.elements.volBtn) {
        ui.elements.volBtn.onclick = () => {
            const newState = !standardManager.isMuted;
            SettingsAPI.saveSetting('focusTimerMuted', newState);
            standardManager.setMute(newState);
            ui.updateVolumeIcon(newState);
        };
    }

    // 4. Bind Main Control Buttons
    bindControlButtons(ui, tagManager);

    // 5. Setup Data Refresh & Cleanup
    setupLifecycleEvents(ui, tagManager);

    // 6. Initial UI Sync
    syncInitialState(ui, currentState);
}

// --- Helper Functions ---

function bindControlButtons(ui, tagManager) {
    if (ui.elements.mainBtn) {
        ui.elements.mainBtn.onclick = () => {
            const state = standardManager.getState();
            if (state.isRunning) {
                standardManager.pause();
            } else if (state.isPaused) {
                standardManager.resume();
            } else {
                // Determine Start Mode
                const isSw = TimerConfig.isStopwatchMode();
                const isBreakPending = state.mode === 'break' || state.mode === 'long-break';
                const isNextFocusPending = state.mode === 'focus' && state.completedSets > 0;

                if (!isSw && (isBreakPending || isNextFocusPending)) {
                    standardManager.resume();
                } else {
                    // Start New Session
                    const startMode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';
                    
                    standardManager.startSession({
                        isStopwatch: isSw,
                        mode: startMode,
                        focusMinutes: TimerConfig.getFocusDuration(),
                        breakMinutes: TimerConfig.getBreakDuration(),
                        // Use stored manager iterations if input is hidden/not ready, fallback to DOM
                        iterations: standardManager.targetIterations || parseInt(document.getElementById('iter-val').value) || 1,
                        longBreakEnabled: document.getElementById('long-break-toggle')?.checked || false,
                        longBreakMinutes: parseInt(document.getElementById('lb-dur-val').value) || 15,
                        longBreakInterval: parseInt(document.getElementById('lb-int-val').value) || 4,
                        tag: tagManager.currentTag
                    });
                }
            }
        };
    }

    if (ui.elements.stopBtn) {
        ui.elements.stopBtn.onclick = () => {
            standardManager.stop();
            resetUIState(ui);
        };
    }

    if (ui.elements.skipBtn) {
        ui.elements.skipBtn.onclick = () => standardManager.skipPhase();
    }

    const unlockLink = document.getElementById('unlock-end-session');
    if (unlockLink) {
        unlockLink.onclick = (e) => {
            e.preventDefault();
            standardManager.stop();
        };
    }
}

function resetUIState(ui) {
    const isSw = TimerConfig.isStopwatchMode();
    const resetMode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';
    ui.setModeVisuals(resetMode);
    ui.updateTimeDisplay(isSw ? 0 : TimerConfig.getFocusDuration() * 60);
    ui.setControlsState(false, false, resetMode, isSw);
    setSidebarLocked(false);
    
    // Use manager state for iterations
    ui.renderDots(0, 'focus', standardManager.targetIterations);
}

function setupLifecycleEvents(ui, tagManager) {
    // 1. Session Saved -> Refresh Stats
    const handleSessionSaved = (e) => {
        if (e.detail.success) refreshDailyStats();
    };
    Neutralino.events.off('focusSessionSaved', handleSessionSaved);
    Neutralino.events.on('focusSessionSaved', handleSessionSaved);
    refreshDailyStats();

    // 2. Timer Ticks & State Changes
    // This receives the full state object from StandardFocusManager
    const tickHandler = (e) => {
        const state = e.detail;
        syncUIFromState(ui, state);
        // Sync Dots based on the tick state (ensures updates if settings change)
        ui.renderDots(state.completedSets, state.mode, state.targetIterations);
    };

    // 3. Phase Completion
    const phaseHandler = (e) => {
        // Note: renderDots is now handling visual updates, but if we wanted specific animations, we'd use this.
        // For now, tickHandler covers the state change.
    };
    
    const completionHandler = () => {
        resetUIState(ui);
    };

    // 4. Iteration Settings Update (From Sidebar/Backend)
    const iterationsHandler = (e) => {
        const newIterations = e.detail;
        const state = standardManager.getState();
        ui.renderDots(state.completedSets, state.mode, newIterations);
    };

    standardManager.eventBus.addEventListener('tick', tickHandler);
    standardManager.eventBus.addEventListener('phase-completed', phaseHandler);
    standardManager.eventBus.addEventListener('session-completed', completionHandler);
    
    // Listen for global iteration updates
    document.addEventListener('kaizen:iterations-updated', iterationsHandler);

    // Cleanup when DOM removed
    const cleanupObserver = new MutationObserver((mutations) => {
        if (!document.body.contains(document.getElementById('timer-circle'))) {
            standardManager.eventBus.removeEventListener('tick', tickHandler);
            standardManager.eventBus.removeEventListener('phase-completed', phaseHandler);
            standardManager.eventBus.removeEventListener('session-completed', completionHandler);
            document.removeEventListener('kaizen:iterations-updated', iterationsHandler);
            tagManager.destroy();
            cleanupObserver.disconnect();
        }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
}

function syncInitialState(ui, currentState) {
    const isSessionActive = currentState.isRunning || currentState.isPaused;
    const isSessionPending = currentState.mode !== 'focus' || currentState.completedSets > 0;

    if (!isSessionActive && !isSessionPending) {
        // IDLE
        const isSw = TimerConfig.isStopwatchMode();
        let mode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';
        let duration = isSw ? 0 : TimerConfig.getFocusDuration() * 60;

        ui.setModeVisuals(mode);
        ui.updateTimeDisplay(duration);
        ui.setControlsState(false, false, mode, isSw);
        // Explicit render of dots for idle state
        ui.renderDots(0, 'focus', currentState.targetIterations);
    } else {
        // ACTIVE / PENDING
        syncUIFromState(ui, currentState);
        ui.renderDots(currentState.completedSets, currentState.mode, currentState.targetIterations);
    }
}

function syncUIFromState(ui, state) {
    ui.updateTimeDisplay(state.time);
    ui.setModeVisuals(state.mode);
    const active = state.isRunning || state.isPaused;
    ui.setControlsState(active, state.isPaused, state.mode, state.isStopwatch);
    setSidebarLocked(active); 
}

function refreshDailyStats() {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    const toSQL = (d) => d.toISOString().replace('T', ' ').split('.')[0];

    FocusAPI.getFocusSessions(toSQL(startOfDay), toSQL(endOfDay));
    FocusAPI.getLifetimeStats();
}