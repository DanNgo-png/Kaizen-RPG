import { TimerUI } from "./TimerUI.js";
import { TimerConfig } from "./TimerConfig.js";
import { standardManager } from "./StandardFocusManager.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { notifier } from "../../_global-managers/NotificationManager.js";
import { TagUIManager } from "../../components/TagUIManager.js";

// TODO OVERLAY
import { initTodoList, renderTasks } from "../../plans/todoListManager.js";
import { initKanbanBoard, renderKanbanView } from "../../plans/kanbanManager.js";

export function initFocusTimer() {
    const ui = new TimerUI();
    
    // 1. Get the current state (which holds the persisted tag from Singleton)
    const currentState = standardManager.getState();

    const tagManager = new TagUIManager({
        triggerId: 'tag-trigger',
        displayId: 'tag-display',
        
        // 2. Initialize with stored tag, default to "Standard" if null
        initialTag: currentState.tag || "Standard", 
        defaultTag: "Standard",
        
        onTagSelected: (tagName) => {
            console.log("Tag changed to:", tagName); 
            // 3. Update the manager immediately when user picks a tag
            standardManager.setTag(tagName);
        }
    });

    // Map DB keys to Sidebar Input IDs
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

    // 2. Listen for setting data
    const handleDefaultsLoad = (e) => {
        const { key, value } = e.detail;
        
        // If the key is one of our timer defaults
        if (defaultsMap[key]) {
            const inputId = defaultsMap[key];
            const inputEl = document.getElementById(inputId);
            
            // Only update if input exists and user hasn't manually interacted (optional safeguard)
            // For now, we simply overwrite on load to ensure preferences apply.
            if (inputEl) {
                inputEl.value = value;
                
                // If we updated Focus Duration, we might need to update the big timer display
                // ONLY if the timer isn't currently running.
                const state = standardManager.getState();
                if (key === 'timerFocusDuration' && !state.isRunning && !state.isPaused && state.mode === 'focus') {
                    ui.updateTimeDisplay(value * 60);
                }
            }
        }

        // Auto-Start Logic (Internal State)
        if (autoStartMap[key]) {
            // value comes as 1/0 or true/false, standardManager needs boolean
            const isEnabled = (value === true || value === 'true' || value === 1 || value === '1');
            standardManager.setAutoStart(autoStartMap[key], isEnabled);
        }
    };

    document.addEventListener('kaizen:setting-update', handleDefaultsLoad);

    // 3. Request the settings immediately
    const allKeys = [...Object.keys(defaultsMap), ...Object.keys(autoStartMap)];
    allKeys.forEach(dbKey => {
        SettingsAPI.getSetting(dbKey);
    });

    // --- 1. Sync Logic (Manager -> UI) ---
    const updateUIFromState = (state) => {
        ui.updateTimeDisplay(state.time);
        ui.setModeVisuals(state.mode);

        const active = state.isRunning || state.isPaused;
        ui.setControlsState(active, state.isPaused, state.mode, state.isStopwatch);
        ui.setSidebarLocked(active);
    };

    // --- Helper: Sync Dots on Load ---
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

    // --- Listen for Mode Changes from Sidebar ---
    document.addEventListener('kaizen:mode-changed', (e) => {
        const mode = e.detail; 
        const state = standardManager.getState();

        if (!state.isRunning && !state.isPaused) {
            const isSw = (mode === 'stopwatch');

            let subMode = 'focus';
            if (isSw) {
                subMode = TimerConfig.getStopwatchSubMode();
            }

            ui.setControlsState(false, false, subMode, isSw);

            if (isSw) {
                ui.updateTimeDisplay(0);
                ui.setModeVisuals(subMode);
            } else {
                ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
                ui.setModeVisuals('focus');
            }
        }
    });

    document.addEventListener('kaizen:stopwatch-mode-changed', (e) => {
        const subMode = e.detail;
        const state = standardManager.getState();
        const isCurrentlyStopwatch = TimerConfig.isStopwatchMode();

        if (!state.isRunning && !state.isPaused && isCurrentlyStopwatch) {
            ui.setModeVisuals(subMode);
            ui.setControlsState(false, false, subMode, true);
        }
    });

    // --- 2. Initial Load ---
    const initialState = standardManager.getState();
    const isSessionActive = initialState.isRunning || initialState.isPaused;
    const isSessionPending = initialState.mode !== 'focus' || initialState.completedSets > 0;

    if (!isSessionActive && !isSessionPending) {
        // IDLE
        const isSw = TimerConfig.isStopwatchMode();
        let mode = 'focus';

        let duration = 0;
        if (isSw) {
            mode = TimerConfig.getStopwatchSubMode();
            duration = 0;
        } else {
            duration = TimerConfig.getFocusDuration() * 60;
        }

        ui.setModeVisuals(mode);
        ui.updateTimeDisplay(duration);
        ui.setControlsState(false, false, mode, isSw);
        SettingsAPI.getSetting('standardFocusIterations');
    } else {
        // ACTIVE
        updateUIFromState(initialState);
        syncDotsVisuals(initialState.completedSets, initialState.mode, initialState.targetIterations);
    }

    document.addEventListener('kaizen:iterations-updated', (e) => {
        const newVal = e.detail;
        const currentState = standardManager.getState();
        if (!currentState.isRunning && !currentState.isPaused) {
            syncDotsVisuals(0, 'focus', newVal);
        }
    });

    // ========== START: Audio Mute Logic ==========
    const applyMuteState = (isMuted) => {
        standardManager.setMute(isMuted);
        ui.updateVolumeIcon(isMuted);
    };

    const muteSettingHandler = (e) => {
        const { key, value } = e.detail;
        if (key === 'focusTimerMuted') {
            const isMuted = (value === true || value === 'true' || value === 1 || value === '1');
            applyMuteState(isMuted);
        }
    };
    
    document.addEventListener('kaizen:setting-update', muteSettingHandler);
    applyMuteState(standardManager.isMuted);
    SettingsAPI.getSetting('focusTimerMuted');

    if (ui.elements.volBtn) {
        ui.elements.volBtn.onclick = () => {
            const newState = !standardManager.isMuted;
            SettingsAPI.saveSetting('focusTimerMuted', newState);
            applyMuteState(newState);
        };
    }
    // ========== END: Audio Mute Logic ==========

    // --- 3. Event Listeners ---
    const btnMain = document.getElementById('main-action-btn');
    if (btnMain) {
        btnMain.onclick = () => {
            const state = standardManager.getState();

            if (state.isRunning) {
                standardManager.pause();
            } else if (state.isPaused) {
                standardManager.resume();
            } else {
                const isBreakPending = state.mode === 'break' || state.mode === 'long-break';
                const isNextFocusPending = state.mode === 'focus' && state.completedSets > 0;

                if (!TimerConfig.isStopwatchMode() && (isBreakPending || isNextFocusPending)) {
                    standardManager.resume();
                } else {
                    // --- START NEW SESSION ---
                    const isSw = TimerConfig.isStopwatchMode();
                    const focusMins = TimerConfig.getFocusDuration();
                    const breakMins = TimerConfig.getBreakDuration();
                    const iterVal = parseInt(document.getElementById('iter-val').value) || 1;

                    const lbToggle = document.getElementById('long-break-toggle');
                    const lbEnabled = lbToggle ? lbToggle.checked : false;
                    const lbMins = parseInt(document.getElementById('lb-dur-val').value) || 15;
                    const lbInterval = parseInt(document.getElementById('lb-int-val').value) || 4;

                    // Use the tag from UI manager (which is synced with Manager)
                    let tagName = tagManager.currentTag;

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

    const btnStop = document.getElementById('stop-btn');
    if (btnStop) {
        btnStop.onclick = () => {
            standardManager.stop();
            const isSw = TimerConfig.isStopwatchMode();
            const resetMode = isSw ? TimerConfig.getStopwatchSubMode() : 'focus';

            ui.setModeVisuals(resetMode);

            if (isSw) {
                ui.updateTimeDisplay(0);
            } else {
                ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
            }

            ui.setControlsState(false, false, resetMode, isSw);
            ui.setSidebarLocked(false);

            const savedIter = parseInt(document.getElementById('iter-val').value) || 1;
            syncDotsVisuals(0, 'focus', savedIter);
        };
    }

    const btnSkip = document.getElementById('skip-break-btn');
    if (btnSkip) {
        btnSkip.onclick = () => standardManager.skipPhase();
    }

    const unlockLink = document.getElementById('unlock-end-session');
    if (unlockLink) {
        unlockLink.addEventListener('click', (e) => {
            e.preventDefault();
            standardManager.stop();
        });
    }

    // --- 4. Subscriptions ---
    const tickHandler = (e) => {
        updateUIFromState(e.detail);
    };

    const phaseHandler = (e) => {
        ui.advanceDots(e.detail.completedMode);
    };

    const completionHandler = () => {
        notifier.show(
            "Session Complete!",
            "Great work! You've finished your target iterations.",
            "fa-solid fa-trophy"
        );

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

    const cleanupObserver = new MutationObserver((mutations) => {
        if (!document.body.contains(document.getElementById('timer-circle'))) {
            standardManager.eventBus.removeEventListener('tick', tickHandler);
            standardManager.eventBus.removeEventListener('phase-completed', phaseHandler);
            standardManager.eventBus.removeEventListener('session-completed', completionHandler);
            document.removeEventListener('kaizen:setting-update', muteSettingHandler);
            cleanupObserver.disconnect();
        }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    // --- 5. TODO MODAL LOGIC (New) ---
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