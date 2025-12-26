import { TimerUI } from "./TimerUI.js";
import { TimerConfig } from "./TimerConfig.js";

export function initFocusTimer() {
    const ui = new TimerUI();

    // --- State ---
    let timerInterval = null;
    let timeLeft = 0;
    let isPaused = false;
    let currentMode = 'focus'; // 'focus' | 'break'

    // --- Core Logic ---

    const startTimer = () => {
        // If starting from 0 or default placeholder text, load config
        // (Hardcoded "05:00" check is a safety for fresh loads)
        if (timeLeft <= 0) {
            loadDurationFromConfig();
        }
        
        isPaused = false;
        timerInterval = setInterval(tick, 1000);
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
        
        // Reset logic: usually resetting sets mode back to focus or keeps current mode reset?
        // Standard behavior: Reset to Focus
        currentMode = 'focus';
        loadDurationFromConfig();
        render();
    };

    const skipPhase = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;

        // Force switch logic
        handlePhaseComplete();
    };

    const loadDurationFromConfig = () => {
        const minutes = currentMode === 'focus' 
            ? TimerConfig.getFocusDuration() 
            : TimerConfig.getBreakDuration();
        timeLeft = minutes * 60;
    };

    const handlePhaseComplete = () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;

        // 1. Update Dots based on what just finished
        ui.advanceDots(currentMode);

        // 2. Switch Mode
        if (currentMode === 'focus') {
            currentMode = 'break';
        } else {
            currentMode = 'focus';
        }

        // 3. Load new time
        loadDurationFromConfig();
        render();
    };

    const tick = () => {
        if (timeLeft > 0) {
            timeLeft--;
            ui.updateTimeDisplay(timeLeft);
        } else {
            handlePhaseComplete();
        }
    };

    const render = () => {
        ui.setModeVisuals(currentMode);
        ui.setControlsState(!!timerInterval, isPaused, currentMode);
        ui.updateTimeDisplay(timeLeft);
    };

    // --- Event Listeners ---

    const bindEvents = () => {
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
    bindEvents();
    
    // Load initial state without auto-starting
    loadDurationFromConfig();
    render();
}