import { TimerUI } from "./TimerUI.js";
import { TimerConfig } from "./TimerConfig.js";
import { FocusAPI } from "../../api/FocusAPI.js";

export function initFocusTimer() {
    const ui = new TimerUI();

    // --- State ---
    let timerInterval = null;
    let timeValue = 0; 
    let isPaused = false;
    let currentMode = 'focus'; 
    let isStopwatch = false;
    
    // Store duration for the save payload
    let currentSessionTotalSeconds = 0; 

    // --- Core Logic ---

    const loadStateFromConfig = () => {
        isStopwatch = TimerConfig.isStopwatchMode();

        if (isStopwatch) {
            currentMode = TimerConfig.getStopwatchSubMode();
            if (!timerInterval && !isPaused) {
                timeValue = 0;
            }
        } else {
            if (!timerInterval && !isPaused) {
                const minutes = currentMode === 'focus' 
                    ? TimerConfig.getFocusDuration() 
                    : TimerConfig.getBreakDuration();
                timeValue = minutes * 60;
                
                // Track this for saving later
                if (currentMode === 'focus') {
                    currentSessionTotalSeconds = minutes * 60;
                }
            }
        }
    };

    const startTimer = () => {
        if (!isPaused && !timerInterval) {
            loadStateFromConfig();
        }
        
        isPaused = false;
        timerInterval = setInterval(tick, 1000);
        
        // LOCK SIDEBAR
        ui.setSidebarLocked(true);
        render();
    };

    const pauseTimer = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        render();
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;
        
        if (isStopwatch) {
            timeValue = 0;
        } else {
            currentMode = 'focus';
            const minutes = TimerConfig.getFocusDuration();
            timeValue = minutes * 60;
        }
        
        // UNLOCK SIDEBAR
        ui.setSidebarLocked(false);
        render();
    };

    const skipPhase = () => {
        if (isStopwatch) return; 
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;
        
        // Pass 'true' to indicate this was skipped manually
        handlePhaseComplete(true);
    };

    const handlePhaseComplete = (skipped = false) => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;

        // UNLOCK SIDEBAR (Session ended)
        ui.setSidebarLocked(false);

        if (!isStopwatch) {
            // Only play sound if NOT skipped (Natural completion)
            if (!skipped) {
                ui.playAlarm();
                
                // --- SAVE LOGIC ---
                // Only save if it was a Focus session and it wasn't skipped
                if (currentMode === 'focus') {
                    saveCompletedSession();
                }
            }
            
            ui.advanceDots(currentMode);
            currentMode = (currentMode === 'focus') ? 'break' : 'focus';
            const minutes = currentMode === 'focus' 
                ? TimerConfig.getFocusDuration() 
                : TimerConfig.getBreakDuration();
            timeValue = minutes * 60;
            
            // Update tracking for the next round
            if (currentMode === 'focus') {
                currentSessionTotalSeconds = minutes * 60;
            }
        }

        render();
    };

    const saveCompletedSession = () => {
        // Try to find selected tag text, fallback to "Standard"
        const tagEl = document.querySelector('.focus-dropdown-left span');
        let tagName = "Standard";
        if (tagEl) {
            const text = tagEl.textContent.trim();
            if (text !== "Add a tag") tagName = text;
        }

        const payload = {
            tag: tagName,
            focusSeconds: currentSessionTotalSeconds,
            breakSeconds: 0, // Standard timer tracks breaks separately/implicitly
            ratio: 1.0 
        };

        console.log("💾 Saving Standard Session:", payload);
        FocusAPI.saveFocusSession(payload);
    };

    const tick = () => {
        if (isStopwatch) {
            timeValue++;
            ui.updateTimeDisplay(timeValue);
        } else {
            if (timeValue > 0) {
                timeValue--;
                ui.updateTimeDisplay(timeValue);
            } else {
                handlePhaseComplete(); // Natural completion (sound plays + saves)
            }
        }
    };

    const render = () => {
        ui.setModeVisuals(currentMode);
        ui.setControlsState(!!timerInterval, isPaused, currentMode, isStopwatch);
        ui.updateTimeDisplay(timeValue);
    };

    // --- Listeners ---

    const bindConfigEvents = () => {
        const typeButtons = document.querySelectorAll('.type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    stopTimer(); 
                    loadStateFromConfig();
                    render();
                }, 50);
            });
        });

        const swButtons = document.querySelectorAll('.sw-btn');
        swButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    if (TimerConfig.isStopwatchMode()) {
                        currentMode = TimerConfig.getStopwatchSubMode();
                        render();
                    }
                }, 50);
            });
        });
        
        const inputs = document.querySelectorAll('.stepper-input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
               if (!timerInterval && !isStopwatch) {
                   loadStateFromConfig();
                   render();
               }
            });
        });
        
        const unlockLink = document.getElementById('unlock-end-session');
        if (unlockLink) {
            unlockLink.addEventListener('click', (e) => {
                e.preventDefault();
                stopTimer();
            });
        }
    };

    const bindControlEvents = () => {
        const mainBtn = document.getElementById('main-action-btn');
        const stopBtn = document.getElementById('stop-btn');
        const skipBtn = document.getElementById('skip-break-btn');

        if (mainBtn) {
            mainBtn.onclick = () => {
                if (timerInterval) pauseTimer();
                else startTimer();
            };
        }

        if (stopBtn) {
            stopBtn.onclick = stopTimer;
        }

        if (skipBtn) {
            skipBtn.onclick = skipPhase;
        }
    };

    // --- Initialization ---
    bindControlEvents();
    bindConfigEvents();
    loadStateFromConfig();
    render();
}