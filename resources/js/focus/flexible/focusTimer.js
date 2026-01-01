import { FlexibleSessionState } from "./FlexibleSessionState.js";
import { FlexibleTimerUI } from "./FlexibleTimerUI.js";

class FocusTimerController {
    constructor() {
        this.state = new FlexibleSessionState({ ratio: 3.0 });
        this.ui = new FlexibleTimerUI();
        this.timerInterval = null;

        this.initEventListeners();
    }

    initEventListeners() {
        // --- Main Controls ---
        this.ui.dom.buttons.main.addEventListener('click', () => this.handleMainAction());
        this.ui.dom.buttons.finish.addEventListener('click', () => this.handleFinishAction());

        // --- Dropdowns (Event Delegation) ---
        
        // 1. Ratio Trigger (Fixed Toggle Logic)
        this.ui.dom.buttons.ratioTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = this.ui.dom.menus.ratio;
            const isOpen = menu.classList.contains('open');

            if (isOpen) {
                this.ui.toggleMenu('ratio', false);
            } else {
                this.ui.toggleMenu('ratio', true);
                this._setupOutsideClick('ratio');
            }
        });

        this.ui.dom.menus.ratio.addEventListener('click', (e) => {
            const target = e.target.closest('.ratio-opt');
            if (target) {
                const val = target.dataset.value;
                const label = target.dataset.label;
                this.state.setRatio(val);
                this.ui.dom.displays.ratio.textContent = label;
                
                // Update selection visual
                this.ui.dom.menus.ratio.querySelectorAll('.ratio-opt').forEach(o => o.classList.remove('selected'));
                target.classList.add('selected');
                
                // Force UI update immediately to reflect balance change
                if(this.state.status !== 'idle') this.tick();
                
                this.ui.toggleMenu('ratio', false);
            }
        });

        // 2. Tag Trigger (Fixed Toggle Logic)
        this.ui.dom.buttons.tagTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = this.ui.dom.menus.tag;
            const isOpen = menu.classList.contains('open');

            if (isOpen) {
                this.ui.toggleMenu('tag', false);
            } else {
                this.ui.toggleMenu('tag', true);
                this._setupOutsideClick('tag');
            }
        });

        // Add Custom Tag
        this.ui.dom.buttons.addTag.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addCustomTag();
        });
        
        // Select Tag
        this.ui.dom.menus.tagList.addEventListener('click', (e) => {
            const target = e.target.closest('.tag-opt');
            if (target) {
                const tag = target.dataset.value;
                this.state.setTag(tag);
                this.ui.updateTagListSelection(tag);
                this.ui.toggleMenu('tag', false);
            }
        });

        // --- Exception Modal ---
        const btnException = document.getElementById('btn-log-exception');
        if (btnException) {
            btnException.addEventListener('click', () => {
                this.ui.populateModal('exception', this.state.getStats());
                this.ui.toggleModal('exception', true);
            });
        }

        document.getElementById('btn-exc-apply').addEventListener('click', () => {
            const f = parseInt(document.getElementById('exc-focus-input').value) || 0;
            const b = parseInt(document.getElementById('exc-break-input').value) || 0;
            this.state.adjustTotals(f * 60000, b * 60000);
            this.tick();
            this.ui.toggleModal('exception', false);
        });

        document.getElementById('btn-exc-cancel').addEventListener('click', () => {
            this.ui.toggleModal('exception', false);
        });

        // --- Conclusion Modal ---
        document.getElementById('btn-conclude-save').addEventListener('click', () => this.commitSession());
        
        document.getElementById('btn-conclude-cancel').addEventListener('click', () => {
            this.ui.toggleModal('conclusion', false);
            this.startTicker(); // Resume
        });

        // BIND SLIDERS: Pass IDs and specific colors
        // Focus = Green (#438e66), Break = Blue (#5b85b7)
        this._bindSliderInput('conclude-focus-slider', 'conclude-focus-input', '#438e66');
        this._bindSliderInput('conclude-break-slider', 'conclude-break-input', '#5b85b7');
    }

    // --- Actions ---

    handleMainAction() {
        if (this.state.status === 'idle') {
            this.state.switchStatus('focus');
            this.ui.updateSessionStartTime(new Date());
            this.startTicker();
        } else if (this.state.status === 'break') {
            this.state.switchStatus('focus');
        } else {
            this.state.switchStatus('break');
        }
        
        this.ui.updateVisualState(this.state.status);
        this.tick();
    }

    handleFinishAction() {
        this.stopTicker();
        this.state._commitCurrentSegment(); // Ensure logic is up to date
        this.ui.populateModal('conclusion', this.state.getStats());
        this.ui.toggleModal('conclusion', true);
    }

    commitSession() {
        // Read final values from inputs (parsing MM:SS or raw seconds)
        const focusVal = document.getElementById('conclude-focus-input').value;
        const breakVal = document.getElementById('conclude-break-input').value;

        // Helper to convert string input to Seconds
        const parseToSeconds = (val) => {
            if(typeof val === 'number') return val;
            if(val.includes(':')) {
                const parts = val.split(':').map(Number);
                let seconds = 0;
                if(parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2]; // HH:MM:SS
                else if(parts.length === 2) seconds = (parts[0] * 60) + parts[1]; // MM:SS
                return seconds;
            }
            return parseInt(val) || 0; // Assume seconds if just a number? Or minutes? 
            // In this specific UI context, the slider drives seconds, so let's treat raw numbers as seconds for consistency with the slider
        };

        const finalFocusSecs = parseToSeconds(focusVal);
        const finalBreakSecs = parseToSeconds(breakVal);

        // In a real app, this sends data to the Backend/Database
        console.log("💾 Saving Session:", {
            tag: this.state.currentTag,
            focusSeconds: finalFocusSecs,
            breakSeconds: finalBreakSecs,
            focusFormatted: this.ui._formatTime(finalFocusSecs * 1000, false),
            timestamp: new Date().toISOString()
        });

        alert(`Session Saved!\nFocus: ${this.ui._formatTime(finalFocusSecs * 1000, false)}`);

        // Reset
        this.state.reset();
        this.ui.resetUI();
        this.ui.toggleModal('conclusion', false);
    }

    addCustomTag() {
        const input = this.ui.dom.inputs.newTag;
        const val = input.value.trim();
        if (!val) return;

        // Add to DOM
        const btn = this.ui.addTagOption(val);
        // Select it immediately
        this.state.setTag(val);
        this.ui.updateTagListSelection(val);
        this.ui.toggleMenu('tag', false);
        input.value = '';
    }

    // --- Ticker Loop ---

    startTicker() {
        if (this.timerInterval) return;
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }

    stopTicker() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    tick() {
        const stats = this.state.getStats();
        this.ui.updateStatsDisplay(stats);
    }

    // --- Helpers ---

    _setupOutsideClick(menuName) {
        const handler = (e) => {
            const menu = this.ui.dom.menus[menuName];
            const trigger = this.ui.dom.buttons[`${menuName}Trigger`];
            
            // If click is NOT on menu AND NOT on trigger
            if (menu && !menu.contains(e.target) && !trigger.contains(e.target)) {
                this.ui.toggleMenu(menuName, false);
                document.removeEventListener('click', handler);
            }
        };
        // Defer to avoid immediate trigger
        setTimeout(() => document.addEventListener('click', handler), 0);
    }

    // Helper to bind Slider (Seconds) <-> Input (MM:SS)
    _bindSliderInput(sliderId, inputId, color) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if(!slider || !input) return;

        // Function to update the background gradient (The "Fill")
        const updateFill = () => {
            const val = parseInt(slider.value) || 0;
            const max = parseInt(slider.max) || 100;
            const percentage = max > 0 ? (val / max) * 100 : 0;
            
            // Gradient: Color from 0% to Val%, Grey from Val% to 100%
            slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #333 ${percentage}%, #333 100%)`;
        };

        // 1. Slider Move
        slider.addEventListener('input', (e) => {
            const seconds = parseInt(e.target.value);
            input.value = this.ui._formatTime(seconds * 1000, false);
            updateFill();
        });

        // 2. Input Change
        input.addEventListener('change', (e) => {
            const val = e.target.value;
            let seconds = 0;

            if (val.includes(':')) {
                // Parse MM:SS
                const parts = val.split(':').reverse(); // [SS, MM, HH]
                seconds += parseInt(parts[0] || 0);
                seconds += (parseInt(parts[1] || 0) * 60);
                seconds += (parseInt(parts[2] || 0) * 3600);
            } else {
                seconds = parseInt(val) || 0;
            }

            // Clamp
            if (seconds > parseInt(slider.max)) seconds = parseInt(slider.max);
            
            slider.value = seconds;
            // Re-format for consistency
            input.value = this.ui._formatTime(seconds * 1000, false);
            updateFill();
        });
    }
}

export function initFlexibleFocusTimer() {
    new FocusTimerController();
}