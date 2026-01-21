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
            // Dots NodeList is dynamic, querySelectorAll should be called when needed or updated
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

    /**
     * Renders or updates the session dots.
     * @param {number} completedSets - How many full focus sessions completed.
     * @param {string} currentMode - 'focus', 'break', 'long-break'
     * @param {number} targetIterations - Total target sessions (e.g., 4)
     */
    renderDots(completedSets, currentMode, targetIterations) {
        if (!this.elements.dotsContainer) return;

        const targetDotCount = (targetIterations || 1) * 2;
        const currentDotCount = this.elements.dotsContainer.children.length;

        // Rebuild only if count mismatch
        if (currentDotCount !== targetDotCount) {
            this.elements.dotsContainer.innerHTML = '';
            for (let i = 0; i < targetDotCount; i++) {
                const dot = document.createElement('div');
                dot.classList.add('focus-dot', 'inactive');
                this.elements.dotsContainer.appendChild(dot);
            }
        }

        const dots = this.elements.dotsContainer.querySelectorAll('.focus-dot');
        let activeIndex = completedSets * 2;
        
        if (currentMode === 'break' || currentMode === 'long-break') {
            activeIndex = (completedSets * 2) - 1;
        }

        // Apply visual states
        dots.forEach((dot, i) => {
            dot.className = 'focus-dot inactive'; // Reset
            if (i === activeIndex) {
                dot.classList.remove('inactive');
                dot.classList.add('active');
                if (currentMode === 'break' || currentMode === 'long-break') {
                    dot.classList.add('break-active');
                }
            }
        });
    }

    /**
     * Logic to visually advance the active dot (used during phase transitions).
     * @deprecated Use renderDots instead for full state sync.
     */
    advanceDots(completedMode) {
        // This is legacy optimization logic; renderDots is safer. 
        // Keeping for backward compat if needed, but preferred approach 
        // is re-rendering state via renderDots.
    }
}