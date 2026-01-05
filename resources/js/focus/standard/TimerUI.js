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
            volBtn: document.getElementById('btn-volume-toggle'),
            volIcon: document.querySelector('#btn-volume-toggle i'),
            dots: document.querySelectorAll('.focus-dot'),
            dotsContainer: document.querySelector('.focus-dots'),
            sidebar: document.getElementById('configure-sidebar'),
            warningBanner: document.getElementById('settings-locked-warning')
        };
    }

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

    playAlarm() {
        try {
            this.alarmSound.currentTime = 0;
            this.alarmSound.play();
        } catch (error) {
            console.warn("Could not play alarm sound:", error);
        }
    }

    updateVolumeIcon(isMuted) {
        if (!this.elements.volIcon) return;
        
        if (isMuted) {
            this.elements.volIcon.className = "fa-solid fa-volume-xmark";
            this.elements.volBtn.style.opacity = "0.6";
        } else {
            this.elements.volIcon.className = "fa-solid fa-volume-high";
            this.elements.volBtn.style.opacity = "1";
        }
    }

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
        // Clear all mode classes first
        this.elements.circle.classList.remove('break-mode', 'long-break-mode'); 
        this.elements.mainBtn.classList.remove('break-mode-btn', 'long-break-mode-btn');

        if (mode === 'focus') {
            this.elements.label.textContent = "Focus";
            this.elements.skipBtn.classList.add('hidden');
        } 
        else if (mode === 'long-break') {
            this.elements.circle.classList.add('long-break-mode');
            this.elements.label.textContent = "Long Break";
            this.elements.mainBtn.classList.add('long-break-mode-btn');
            this.elements.skipBtn.classList.remove('hidden');
        }
        else {
            // Standard Break
            this.elements.circle.classList.add('break-mode'); 
            this.elements.label.textContent = "Break";
            this.elements.mainBtn.classList.add('break-mode-btn');
            this.elements.skipBtn.classList.remove('hidden');
        }
    }

    setControlsState(isRunning, isPaused, mode, isStopwatch) {
        if (this.elements.dotsContainer) {
            if (isStopwatch) {
                this.elements.dotsContainer.classList.add('hidden');
                if (this.elements.circle) {
                    this.elements.circle.classList.add('stopwatch-layout-fix');
                }
            } else {
                this.elements.dotsContainer.classList.remove('hidden');
                if (this.elements.circle) {
                    this.elements.circle.classList.remove('stopwatch-layout-fix');
                }
            }
        }

        if (isRunning || isPaused) {
            this.elements.stopBtn.classList.remove('hidden');
            
            // Skip button: Show for break OR long-break
            if ((mode === 'break' || mode === 'long-break') && !isStopwatch) {
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
            // Stopped State
            if ((mode === 'break' || mode === 'long-break') && !isStopwatch) {
                this.elements.stopBtn.classList.remove('hidden');
                this.elements.skipBtn.classList.remove('hidden');
            } else {
                this.elements.stopBtn.classList.add('hidden');
                this.elements.skipBtn.classList.add('hidden');
            }

            this.elements.mainBtnIcon.className = "fa-solid fa-play";

            if (isStopwatch) {
                this.elements.mainBtnText.textContent = "Start Stopwatch";
            } else {
                // Update text based on mode
                let startText = "Start Focus Session";
                if (mode === 'break') startText = "Start Break";
                if (mode === 'long-break') startText = "Start Long Break";
                
                this.elements.mainBtnText.textContent = startText;
            }
        }
    }

    advanceDots(completedMode) {
        const dots = document.querySelectorAll('.focus-dot');
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const isGreen = dot.classList.contains('active') && !dot.classList.contains('break-active');
            
            // Logic to move from Focus -> Break
            if (completedMode === 'focus' && isGreen) {
                dot.classList.remove('active');
                dot.classList.add('inactive');
                
                if (i + 1 < dots.length) {
                    dots[i + 1].classList.remove('inactive');
                    dots[i + 1].classList.add('active', 'break-active');
                }
                break;
            } 
            // Logic to move from Break -> Focus
            else if ((completedMode === 'break' || completedMode === 'long-break') && dot.classList.contains('break-active')) {
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