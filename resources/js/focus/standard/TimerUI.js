/**
 * TimerUI.js
 * Responsible for all visual updates: Time display, Buttons, Dots, Audio, and Sidebar State.
 */
export class TimerUI {
    constructor() {
        this.elements = {
            label: document.getElementById('timer-label'),
            display: document.querySelector('.timer-count'),
            circle: document.getElementById('timer-circle'),
            mainBtn: document.getElementById('main-action-btn'),
            mainBtnText: document.getElementById('main-btn-text'),
            mainBtnIcon: document.querySelector('#main-action-btn i'),
            stopBtn: document.getElementById('stop-btn'),
            skipBtn: document.getElementById('skip-break-btn'),
            dots: document.querySelectorAll('.dot'),
            // Sidebar elements
            sidebar: document.getElementById('configure-sidebar'),
            warningBanner: document.getElementById('settings-locked-warning')
        };

        // Initialize Audio (Path is relative to index.html)
        this.alarmSound = new Audio('audio/bell-sound.mp3');
    }

    /**
     * Toggles the "Locked" state of the sidebar.
     * @param {boolean} isLocked 
     */
    setSidebarLocked(isLocked) {
        if (!this.elements.sidebar || !this.elements.warningBanner) return;

        if (isLocked) {
            this.elements.sidebar.classList.add('settings-locked');
            this.elements.warningBanner.classList.remove('hidden');
        } else {
            this.elements.sidebar.classList.remove('settings-locked');
            this.elements.warningBanner.classList.add('hidden');
        }
    }

    /**
     * Plays the completion sound.
     */
    playAlarm() {
        try {
            this.alarmSound.currentTime = 0; // Reset to start
            this.alarmSound.play();
        } catch (error) {
            console.warn("Could not play alarm sound:", error);
        }
    }

    /**
     * Formats seconds into MM:SS (or HH:MM:SS if needed).
     */
    formatTime(seconds) {
        const absSeconds = Math.abs(seconds);
        const h = Math.floor(absSeconds / 3600);
        const m = Math.floor((absSeconds % 3600) / 60);
        const s = absSeconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay(seconds) {
        if (this.elements.display) {
            this.elements.display.textContent = this.formatTime(seconds);
        }
    }

    setModeVisuals(mode) {
        if (mode === 'focus') {
            this.elements.circle.classList.remove('break-mode'); 
            this.elements.label.textContent = "Focus";
            this.elements.mainBtn.classList.remove('break-mode-btn');
            this.elements.skipBtn.classList.add('hidden');
        } else {
            this.elements.circle.classList.add('break-mode'); 
            this.elements.label.textContent = "Break";
            this.elements.mainBtn.classList.add('break-mode-btn');
            this.elements.skipBtn.classList.remove('hidden');
        }
    }

    /**
     * Toggles button visibility and text based on state.
     */
    setControlsState(isRunning, isPaused, mode, isStopwatch) {
        if (isRunning || isPaused) {
            this.elements.stopBtn.classList.remove('hidden');
            
            // In stopwatch mode, skip button doesn't make sense
            if (mode === 'break' && !isStopwatch) {
                this.elements.skipBtn.classList.remove('hidden');
            } else {
                this.elements.skipBtn.classList.add('hidden');
            }

            if (isPaused) {
                this.elements.mainBtnText.textContent = "Resume";
                this.elements.mainBtnIcon.className = "fa-solid fa-play";
            } else {
                this.elements.mainBtnText.textContent = "Pause";
                this.elements.mainBtnIcon.className = "fa-solid fa-pause";
            }
        } else {
            // Stopped State (Waiting to Start)
            
            // FIX: If we are in Break mode (standard timer), show Stop and Skip buttons
            if (mode === 'break' && !isStopwatch) {
                this.elements.stopBtn.classList.remove('hidden');
                this.elements.skipBtn.classList.remove('hidden');
            } else {
                // Otherwise (Focus mode or Stopwatch), clean up buttons
                this.elements.stopBtn.classList.add('hidden');
                this.elements.skipBtn.classList.add('hidden');
            }

            this.elements.mainBtnIcon.className = "fa-solid fa-play";

            if (isStopwatch) {
                this.elements.mainBtnText.textContent = "Start Stopwatch";
            } else {
                this.elements.mainBtnText.textContent = mode === 'focus' ? "Start Focus Session" : "Start Break";
            }
        }
    }

    advanceDots(completedMode) {
        const dots = this.elements.dots;
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const isGreen = dot.classList.contains('active') && !dot.classList.contains('break-active');
            const isBlue = dot.classList.contains('active') && dot.classList.contains('break-active');

            if (completedMode === 'focus' && isGreen) {
                dot.classList.remove('active');
                dot.classList.add('inactive');
                if (i + 1 < dots.length) {
                    dots[i + 1].classList.remove('inactive');
                    dots[i + 1].classList.add('active', 'break-active');
                }
                break;
            } 
            else if (completedMode === 'break' && isBlue) {
                dot.classList.remove('active', 'break-active');
                dot.classList.add('inactive');
                if (i + 1 < dots.length) {
                    dots[i + 1].classList.remove('inactive');
                    dots[i + 1].classList.add('active');
                }
                break;
            }
        }
    }
}