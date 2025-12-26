/**
 * Responsible for all visual updates: Time display, Buttons, and Dots.
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
            dots: document.querySelectorAll('.dot')
        };
    }

    /**
     * Formats seconds into MM:SS
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay(seconds) {
        if (this.elements.display) {
            this.elements.display.textContent = this.formatTime(seconds);
        }
    }

    /**
     * Updates colors and labels based on mode (Focus vs Break)
     */
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
     * Toggles button visibility and text based on state
     */
    setControlsState(isRunning, isPaused, mode) {
        if (isRunning || isPaused) {
            this.elements.stopBtn.classList.remove('hidden');
            
            // Show Skip button only in break mode
            if (mode === 'break') {
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
            this.elements.stopBtn.classList.add('hidden');
            this.elements.skipBtn.classList.add('hidden');
            this.elements.mainBtnIcon.className = "fa-solid fa-play";

            if (mode === 'focus') {
                this.elements.mainBtnText.textContent = "Start Focus Session";
            } else {
                this.elements.mainBtnText.textContent = "Start Break";
            }
        }
    }

    /**
     * Advances the pagination dots logic.
     * @param {string} completedMode - 'focus' or 'break' (the mode that just finished)
     */
    advanceDots(completedMode) {
        const dots = this.elements.dots;
        
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const isGreen = dot.classList.contains('active') && !dot.classList.contains('break-active');
            const isBlue = dot.classList.contains('active') && dot.classList.contains('break-active');

            if (completedMode === 'focus' && isGreen) {
                // Turn current Green -> Gray
                dot.classList.remove('active');
                dot.classList.add('inactive');
                
                // Turn Next -> Blue (Break)
                if (i + 1 < dots.length) {
                    dots[i + 1].classList.remove('inactive');
                    dots[i + 1].classList.add('active', 'break-active');
                }
                break;
            } 
            else if (completedMode === 'break' && isBlue) {
                // Turn current Blue -> Gray
                dot.classList.remove('active', 'break-active');
                dot.classList.add('inactive');

                // Turn Next -> Green (Focus)
                if (i + 1 < dots.length) {
                    dots[i + 1].classList.remove('inactive');
                    dots[i + 1].classList.add('active');
                }
                break;
            }
        }
    }
}