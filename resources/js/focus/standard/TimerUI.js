export class TimerUI {
    constructor() {
        this.elements = {
            // Display
            label: document.getElementById('timer-label'),
            display: document.querySelector('.timer-count'),
            circle: document.getElementById('timer-circle'),
            
            // Buttons
            mainBtn: document.getElementById('main-action-btn'),
            mainBtnText: document.getElementById('main-btn-text'),
            mainBtnIcon: document.querySelector('#main-action-btn i'),
            stopBtn: document.getElementById('stop-btn'),
            skipBtn: document.getElementById('skip-break-btn'),
            
            // Volume
            volBtn: document.getElementById('btn-volume-toggle'),
            volIcon: document.querySelector('#btn-volume-toggle i'),
            
            // Dots
            dotsContainer: document.querySelector('.focus-dots'),
            dots: document.querySelectorAll('.focus-dot'),
        };
    }

    // --- VISUALIZATION ONLY ---

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
        // 1. Handle Dots Visibility
        if (this.elements.dotsContainer) {
            if (isStopwatch) {
                this.elements.dotsContainer.classList.add('hidden');
                this.elements.circle.classList.add('stopwatch-layout-fix');
            } else {
                this.elements.dotsContainer.classList.remove('hidden');
                this.elements.circle.classList.remove('stopwatch-layout-fix');
            }
        }

        // 2. Handle Button Visibility
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
            // Keep buttons visible in break mode for better UX (optional, matches your prev logic)
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