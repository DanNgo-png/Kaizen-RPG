import { TimerUI } from "./TimerUI.js";
import { TimerConfig } from "./TimerConfig.js";
import { standardManager } from "./StandardFocusManager.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { notifier } from "../../_global-managers/NotificationManager.js";
import { TagUIManager } from "../../components/TagUIManager.js";
import { FocusAPI } from "../../api/FocusAPI.js";

// TODO OVERLAY
import { initTodoList, renderTasks } from "../../plans/todoListManager.js";
import { initKanbanBoard, renderKanbanView } from "../../plans/kanbanManager.js";

export function initFocusTimer() {
    const ui = new TimerUI();
    
    // 1. Get the current state
    const currentState = standardManager.getState();

    const tagManager = new TagUIManager({
        triggerId: 'tag-trigger',
        displayId: 'tag-display',
        initialTag: currentState.tag || "Standard", 
        defaultTag: "Standard",
        onTagSelected: (tagName) => {
            standardManager.setTag(tagName);
        }
    });

    // Refresh stats when a session is successfully saved
    const handleSessionSaved = (e) => {
        if (e.detail.success) {
            refreshDailyStats();
        }
    };
    // Remove old listener to prevent duplicates (cleanup)
    Neutralino.events.off('focusSessionSaved', handleSessionSaved);
    Neutralino.events.on('focusSessionSaved', handleSessionSaved);
    refreshDailyStats();

    // --- HELPER: Sync Dots Visuals ---
    const syncDotsVisuals = (completedSets, currentMode, targetIterations) => {
        const dotsContainer = document.querySelector('.focus-dots');
        if (!dotsContainer) return;

        const currentDotCount = dotsContainer.children.length;
        const targetDotCount = (targetIterations || 1) * 2;

        if (currentDotCount !== targetDotCount) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < targetDotCount; i++) {
                const dot = document.createElement('div');
                dot.classList.add('focus-dot', 'inactive');
                dotsContainer.appendChild(dot);
            }
        }

        const dots = document.querySelectorAll('.focus-dot');
        dots.forEach(d => {
            d.classList.remove('active', 'break-active', 'inactive');
            d.classList.add('inactive');
        });

        let activeIndex = completedSets * 2;
        
        if (currentMode === 'break' || currentMode === 'long-break') {
            activeIndex = (completedSets * 2) - 1;
        }

        for (let i = 0; i < dots.length; i++) {
            if (i < activeIndex) {
                dots[i].classList.add('inactive');
            } else if (i === activeIndex) {
                dots[i].classList.remove('inactive');
                dots[i].classList.add('active');
                
                if (currentMode === 'break' || currentMode === 'long-break') {
                    dots[i].classList.add('break-active');
                }
            }
        }
    };

    // --- EVENT HANDLERS (Named for Cleanup) ---

    // 1. Handle Settings Load (Inputs & Auto-Start)
    const handleDefaultsLoad = (e) => {
        const { key, value } = e.detail;

        const defaultsMap = {
            'timerFocusDuration': 'focus-val',
            'timerShortBreak':    'break-val',
            'standardFocusIterations': 'iter-val',
            'timerLongBreak':     'lb-dur-val',
            'timerLongBreakInt':  'lb-int-val'
        };

        const autoStartMap = {
            'timerAutoStartFocus': 'focus',
            'timerAutoStartBreak': 'break'
        };

        if (defaultsMap[key]) {
            const inputEl = document.getElementById(defaultsMap[key]);
            if (inputEl) {
                inputEl.value = value;
                
                const state = standardManager.getState();
                // Only update display if TRULY idle (not pending break)
                const isIdle = state.mode === 'focus' && state.completedSets === 0 && !state.isRunning && !state.isPaused;
                
                if (key === 'timerFocusDuration' && isIdle) {
                    ui.updateTimeDisplay(value * 60);
                }
            }
        }

        if (autoStartMap[key]) {
            const isEnabled = (value === true || value === 'true' || value === 1 || value === '1');
            standardManager.setAutoStart(autoStartMap[key], isEnabled);
        }

        if (key === 'timerAlarmSound') {
            standardManager.setAlarmSound(value);
        }
    };

    // 2. Handle Iterations Update (Fixes the Bug)
    const handleIterationsUpdate = (e) => {
        const newVal = e.detail;
        const state = standardManager.getState();
        
        // BUG FIX: Check if session is truly idle before resetting visuals.
        // If mode is 'break' or completedSets > 0, we are "Pending", not "Idle".
        const isSessionActive = state.isRunning || state.isPaused;
        const isSessionPending = state.mode !== 'focus' || state.completedSets > 0;

        if (!isSessionActive && !isSessionPending) {
            syncDotsVisuals(0, 'focus', newVal);
        }
    };

    // 3. Handle Mode Switch (Timer <-> Stopwatch)
    const handleModeChanged = (e) => {
        const mode = e.detail; 
        const state = standardManager.getState();

        if (!state.isRunning && !state.isPaused) {
            const isSw = (mode === 'stopwatch');
            let subMode = 'focus';
            if (isSw) subMode = TimerConfig.getStopwatchSubMode();

            ui.setControlsState(false, false, subMode, isSw);

            if (isSw) {
                ui.updateTimeDisplay(0);
                ui.setModeVisuals(subMode);
            } else {
                ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
                ui.setModeVisuals('focus');
            }
        }
    };

    // 4. Handle Stopwatch Sub-Mode (Focus <-> Break)
    const handleStopwatchModeChanged = (e) => {
        const subMode = e.detail;
        const state = standardManager.getState();
        const isCurrentlyStopwatch = TimerConfig.isStopwatchMode();

        if (!state.isRunning && !state.isPaused && isCurrentlyStopwatch) {
            ui.setModeVisuals(subMode);
            ui.setControlsState(false, false, subMode, true);
        }
    };

    // 5. Mute Handler
    const handleMuteSetting = (e) => {
        const { key, value } = e.detail;
        if (key === 'focusTimerMuted') {
            const isMuted = (value === true || value === 'true' || value === 1 || value === '1');
            standardManager.setMute(isMuted);
            ui.updateVolumeIcon(isMuted);
        }
    };

    // --- SETUP LISTENERS ---
    document.addEventListener('kaizen:setting-update', handleDefaultsLoad);
    document.addEventListener('kaizen:iterations-updated', handleIterationsUpdate);
    document.addEventListener('kaizen:mode-changed', handleModeChanged);
    document.addEventListener('kaizen:stopwatch-mode-changed', handleStopwatchModeChanged);
    document.addEventListener('kaizen:setting-update', handleMuteSetting);

    // Request settings
    const allKeys = [
        'timerFocusDuration', 'timerShortBreak', 'standardFocusIterations', 
        'timerLongBreak', 'timerLongBreakInt', 'timerAutoStartFocus', 
        'timerAutoStartBreak', 'timerAlarmSound', 'focusTimerMuted',
        'focusTimerVolume', 'enableOSNotifications'
    ];
    allKeys.forEach(key => SettingsAPI.getSetting(key));

    // Initialize Mute Icon
    ui.updateVolumeIcon(standardManager.isMuted);
    if (ui.elements.volBtn) {
        ui.elements.volBtn.onclick = () => {
            const newState = !standardManager.isMuted;
            SettingsAPI.saveSetting('focusTimerMuted', newState);
            standardManager.setMute(newState);
            ui.updateVolumeIcon(newState);
        };
    }

    // --- SYNC UI STATE (Initial Load) ---
    const updateUIFromState = (state) => {
        ui.updateTimeDisplay(state.time);
        ui.setModeVisuals(state.mode);
        const active = state.isRunning || state.isPaused;
        ui.setControlsState(active, state.isPaused, state.mode, state.isStopwatch);
        ui.setSidebarLocked(active);
    };

    const isSessionActive = currentState.isRunning || currentState.isPaused;
    const isSessionPending = currentState.mode !== 'focus' || currentState.completedSets > 0;

    if (!isSessionActive && !isSessionPending) {
        // IDLE
        const isSw = TimerConfig.isStopwatchMode();
        let mode = 'focus';
        let duration = 0;
        
        if (isSw) {
            mode = TimerConfig.getStopwatchSubMode();
        } else {
            duration = TimerConfig.getFocusDuration() * 60;
        }

        ui.setModeVisuals(mode);
        ui.updateTimeDisplay(duration);
        ui.setControlsState(false, false, mode, isSw);
    } else {
        // ACTIVE / PENDING
        updateUIFromState(currentState);
        syncDotsVisuals(currentState.completedSets, currentState.mode, currentState.targetIterations);
    }

    // --- TICK SUBSCRIPTIONS ---
    const tickHandler = (e) => updateUIFromState(e.detail);
    const phaseHandler = (e) => ui.advanceDots(e.detail.completedMode);
    
    const completionHandler = () => {
        notifier.show("Session Complete!", "Great work! You've finished your target iterations.", "fa-solid fa-trophy");
        ui.setModeVisuals('focus');
        ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
        ui.setControlsState(false, false, 'focus', false);
        ui.setSidebarLocked(false);
        const currentIter = parseInt(document.getElementById('iter-val').value) || 1;
        syncDotsVisuals(0, 'focus', currentIter);
    };

    standardManager.eventBus.addEventListener('tick', tickHandler);
    standardManager.eventBus.addEventListener('phase-completed', phaseHandler);
    standardManager.eventBus.addEventListener('session-completed', completionHandler);

    // --- DOM EVENT LISTENERS (Buttons) ---
    if (ui.elements.mainBtn) {
        ui.elements.mainBtn.onclick = () => {
            const state = standardManager.getState();
            if (state.isRunning) {
                standardManager.pause();
            } else if (state.isPaused) {
                standardManager.resume();
            } else {
                // Resume pending session vs Start new
                const isBreakPending = state.mode === 'break' || state.mode === 'long-break';
                const isNextFocusPending = state.mode === 'focus' && state.completedSets > 0;

                if (!TimerConfig.isStopwatchMode() && (isBreakPending || isNextFocusPending)) {
                    standardManager.resume();
                } else {
                    // Start New
                    const isSw = TimerConfig.isStopwatchMode();
                    const focusMins = TimerConfig.getFocusDuration();
                    const breakMins = TimerConfig.getBreakDuration();
                    const iterVal = parseInt(document.getElementById('iter-val').value) || 1;
                    
                    const lbToggle = document.getElementById('long-break-toggle');
                    const lbEnabled = lbToggle ? lbToggle.checked : false;
                    const lbMins = parseInt(document.getElementById('lb-dur-val').value) || 15;
                    const lbInterval = parseInt(document.getElementById('lb-int-val').value) || 4;
                    const tagName = tagManager.currentTag;
                    const startMode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';

                    standardManager.startSession({
                        isStopwatch: isSw,
                        mode: startMode,
                        focusMinutes: focusMins,
                        breakMinutes: breakMins,
                        iterations: iterVal,
                        longBreakEnabled: lbEnabled,
                        longBreakMinutes: lbMins,
                        longBreakInterval: lbInterval,
                        tag: tagName
                    });
                }
            }
        };
    }

    if (ui.elements.stopBtn) {
        ui.elements.stopBtn.onclick = () => {
            standardManager.stop();
            const isSw = TimerConfig.isStopwatchMode();
            const resetMode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';
            ui.setModeVisuals(resetMode);
            ui.updateTimeDisplay(isSw ? 0 : TimerConfig.getFocusDuration() * 60);
            ui.setControlsState(false, false, resetMode, isSw);
            ui.setSidebarLocked(false);
            const savedIter = parseInt(document.getElementById('iter-val').value) || 1;
            syncDotsVisuals(0, 'focus', savedIter);
        };
    }

    if (ui.elements.skipBtn) {
        ui.elements.skipBtn.onclick = () => standardManager.skipPhase();
    }

    const unlockLink = document.getElementById('unlock-end-session');
    if (unlockLink) {
        unlockLink.addEventListener('click', (e) => {
            e.preventDefault();
            standardManager.stop();
        });
    }

    // --- CLEANUP ---
    const cleanupObserver = new MutationObserver((mutations) => {
        if (!document.body.contains(document.getElementById('timer-circle'))) {
            // Remove Global Document Listeners
            document.removeEventListener('kaizen:setting-update', handleDefaultsLoad);
            document.removeEventListener('kaizen:iterations-updated', handleIterationsUpdate);
            document.removeEventListener('kaizen:mode-changed', handleModeChanged);
            document.removeEventListener('kaizen:stopwatch-mode-changed', handleStopwatchModeChanged);
            document.removeEventListener('kaizen:setting-update', handleMuteSetting);

            // Remove Manager Listeners
            standardManager.eventBus.removeEventListener('tick', tickHandler);
            standardManager.eventBus.removeEventListener('phase-completed', phaseHandler);
            standardManager.eventBus.removeEventListener('session-completed', completionHandler);
            
            // Destroy Components
            tagManager.destroy();
            cleanupObserver.disconnect();
        }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    // --- TODO MODAL LOGIC ---
    const btnTodoModal = document.getElementById('btn-open-todo-modal'); 
    const modalOverlay = document.getElementById('todo-overlay');
    const btnCloseModal = document.getElementById('btn-close-todo-modal');
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const handleTaskData = (e) => {
        const tasks = e.detail;
        if (typeof renderTasks === 'function') renderTasks(tasks);
        if (typeof renderKanbanView === 'function') renderKanbanView(tasks);
    };

    if (btnTodoModal && modalOverlay) {
        btnTodoModal.addEventListener('click', () => {
            modalOverlay.classList.remove('hidden');
            initTodoList();
            initKanbanBoard();
            Neutralino.events.on('receiveTasks', handleTaskData);
        });

        btnCloseModal.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
        });

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                tabContents.forEach(content => {
                    if (content.id === targetId) content.classList.add('active');
                    else content.classList.remove('active');
                });
            });
        });
    }
}

function refreshDailyStats() {
    // 1. Get Today's Date Range in UTC (matching DB format)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const toSQL = (d) => d.toISOString().replace('T', ' ').split('.')[0];

    // 2. Request Data
    FocusAPI.getFocusSessions(toSQL(startOfDay), toSQL(endOfDay));
    FocusAPI.getLifetimeStats(); // Fetches streak
}