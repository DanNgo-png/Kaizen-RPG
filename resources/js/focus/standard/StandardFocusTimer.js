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
    const tagManager = new TagUIManager({
        triggerId: 'tag-trigger',
        displayId: 'tag-display',
        initialTag: "Add a tag",
        onTagSelected: (tagName) => {
            console.log("Tag changed to:", tagName); 
        }
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

        // Rebuild dots if count mismatch (e.g. settings changed)
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

        // --- FIX: Correct Index Math ---
        // completedSets is incremented immediately after a focus session.
        // Example: Finish Focus 1 -> completedSets = 1, mode = 'break'.
        // We want Index 1 (2nd dot). 
        // Formula: (1 * 2) - 1 = 1.
        
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
                
                // --- FIX: Apply blue style for both break types ---
                if (currentMode === 'break' || currentMode === 'long-break') {
                    dots[i].classList.add('break-active');
                }
            }
        }
    };

    // --- Listen for Mode Changes from Sidebar ---
    document.addEventListener('kaizen:mode-changed', (e) => {
        const mode = e.detail; // 'timer' or 'stopwatch'
        const state = standardManager.getState();

        // Only update if idle
        if (!state.isRunning && !state.isPaused) {
            const isSw = (mode === 'stopwatch');

            let subMode = 'focus';
            if (isSw) {
                subMode = TimerConfig.getStopwatchSubMode();
            }

            // Visual updates
            ui.setControlsState(false, false, subMode, isSw);

            if (isSw) {
                ui.updateTimeDisplay(0);
                ui.setModeVisuals(subMode); // Ensure color matches submode
            } else {
                ui.updateTimeDisplay(TimerConfig.getFocusDuration() * 60);
                ui.setModeVisuals('focus');
            }
        }
    });

    // --- Listen for Stopwatch Internal Changes (Focus/Break) ---
    document.addEventListener('kaizen:stopwatch-mode-changed', (e) => {
        const subMode = e.detail; // 'focus' or 'break'
        const state = standardManager.getState();

        // Only update visually if we are currently IN stopwatch mode and IDLE
        const isCurrentlyStopwatch = TimerConfig.isStopwatchMode();

        if (!state.isRunning && !state.isPaused && isCurrentlyStopwatch) {
            ui.setModeVisuals(subMode);
            // Re-trigger controls state to update button text ("Start Break" vs "Start Focus") if needed,
            // though stopwatch usually says "Start Stopwatch", color is the main thing here.
            ui.setControlsState(false, false, subMode, true);
        }
    });

    // --- 2. Initial Load ---
    const initialState = standardManager.getState();

    // Check if session is truly active OR "Pending" (e.g., waiting to start Break)
    // If completedSets > 0, we are in the middle of a flow (Intermission).
    // If mode != 'focus', we are likely in a Break or Long Break.
    const isSessionActive = initialState.isRunning || initialState.isPaused;
    const isSessionPending = initialState.mode !== 'focus' || initialState.completedSets > 0;

    if (!isSessionActive && !isSessionPending) {
        // IDLE (True Reset): Load defaults from Sidebar
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
        // ACTIVE or INTERMISSION: Sync with running manager
        updateUIFromState(initialState);
        syncDotsVisuals(initialState.completedSets, initialState.mode, initialState.targetIterations);
    }

    // --- Listen for Settings Update ---
    document.addEventListener('kaizen:iterations-updated', (e) => {
        const newVal = e.detail;
        const currentState = standardManager.getState();
        if (!currentState.isRunning && !currentState.isPaused) {
            syncDotsVisuals(0, 'focus', newVal);
        }
    });

    // ========== START: Audio Mute Logic ==========
    // 1. Helper to sync UI and Manager
    const applyMuteState = (isMuted) => {
        standardManager.setMute(isMuted);
        ui.updateVolumeIcon(isMuted);
    };

    // 2. Listen for Database Load (StandardFocusTimer specific listener)
    const muteSettingHandler = (e) => {
        const { key, value } = e.detail;
        if (key === 'focusTimerMuted') {
            // Handle SQLite behavior where booleans might be returned as 1, "1", or "true"
            const isMuted = (value === true || value === 'true' || value === 1 || value === '1');
            applyMuteState(isMuted);
        }
    };
    
    // Bind listener
    document.addEventListener('kaizen:setting-update', muteSettingHandler);

    // 3. Initial Fetch
    // Apply current memory state immediately (fixes flicker on nav back)
    applyMuteState(standardManager.isMuted);
    // Request DB source of truth (fixes restart persistence)
    SettingsAPI.getSetting('focusTimerMuted');

    // 4. Button Click Listener
    if (ui.elements.volBtn) {
        ui.elements.volBtn.onclick = () => {
            const newState = !standardManager.isMuted;
            
            // Save to DB
            SettingsAPI.saveSetting('focusTimerMuted', newState);
            
            // Apply locally immediately for responsiveness
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
                // FIX: Added check for 'long-break' so it resumes the pending long break instead of starting a new focus session
                const isBreakPending = state.mode === 'break' || state.mode === 'long-break';
                const isNextFocusPending = state.mode === 'focus' && state.completedSets > 0;

                // Resume existing flow only if NOT in stopwatch mode (Stopwatch is always manual start/stop)
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

                    let tagName = tagManager.currentTag;
                    if (tagName === "Add a tag") {
                        tagName = "Standard";
                    }

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
            // Reset UI
            const isSw = TimerConfig.isStopwatchMode();

            // If in stopwatch mode, use the selected sub-mode (focus/break) color
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
            // Clean up global settings listener too
            document.removeEventListener('kaizen:setting-update', muteSettingHandler);
            cleanupObserver.disconnect();
        }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    // --- 5. TODO MODAL LOGIC (New) ---
    const btnTodoModal = document.getElementById('btn-open-todo-modal'); // Updated ID in HTML
    const modalOverlay = document.getElementById('todo-overlay');
    const btnCloseModal = document.getElementById('btn-close-todo-modal');
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Function to handle data when it comes in from server
    const handleTaskData = (e) => {
        // This listener receives data whenever GameAPI.getTasks() is called
        const tasks = e.detail;

        // Update Todo List View
        if (typeof renderTasks === 'function') renderTasks(tasks);

        // Update Kanban View
        if (typeof renderKanbanView === 'function') renderKanbanView(tasks);
    };

    if (btnTodoModal && modalOverlay) {
        // OPEN
        btnTodoModal.addEventListener('click', () => {
            modalOverlay.classList.remove('hidden');

            // Initialize Managers (Attach listeners)
            initTodoList();
            initKanbanBoard();

            // Subscribe to live data updates
            Neutralino.events.on('receiveTasks', handleTaskData);
        });

        // CLOSE
        btnCloseModal.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            // Optional: Unsubscribe to save memory, though Neutralino handles listeners well
            // Neutralino.events.off('receiveTasks', handleTaskData);
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
        });

        // TABS
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 1. Buttons State
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 2. Content State
                const targetId = btn.getAttribute('data-tab');
                tabContents.forEach(content => {
                    if (content.id === targetId) content.classList.add('active');
                    else content.classList.remove('active');
                });
            });
        });
    }
}