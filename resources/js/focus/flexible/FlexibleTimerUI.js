export class FlexibleTimerUI {
    constructor() {
        // Cache DOM Elements to avoid repetitive lookups
        this.dom = {
            displays: {
                focus: document.getElementById('disp-focus'),
                break: document.getElementById('disp-break'),
                balance: document.getElementById('disp-balance'),
                msgBalance: document.getElementById('msg-balance'),
                sessionStart: document.getElementById('session-start-time'),
                ratio: document.getElementById('ratio-display'),
                tag: document.getElementById('tag-display')
            },
            cards: {
                focus: document.getElementById('card-focus'),
                break: document.getElementById('card-break'),
                balance: document.getElementById('card-balance')
            },
            buttons: {
                main: document.getElementById('btn-flex-main'),
                finish: document.getElementById('btn-flex-finish'),
                ratioTrigger: document.getElementById('ratio-trigger')
                // tagTrigger removed from here, handled by TagUIManager or independent logic
            },
            menus: {
                ratio: document.getElementById('ratio-menu')
                // tag/tagList removed
            },
            modals: {
                exception: document.getElementById('exception-modal'),
                conclusion: document.getElementById('conclusion-modal')
            }
        };
        
        this.activeMenuListeners = new Map();
    }

    /**
     * Updates the time numbers and balance status (Banked/Overdrawn).
     * @param {Object} stats - { focusMs, breakMs, balanceMs, status }
     */
    updateStatsDisplay(stats) {
        if (!this.dom.displays.focus) return;

        this.dom.displays.focus.textContent = this._formatTime(stats.focusMs);
        this.dom.displays.break.textContent = this._formatTime(stats.breakMs);
        
        const balancePrefix = stats.balanceMs >= 0 ? '+' : '-';
        this.dom.displays.balance.textContent = balancePrefix + this._formatTime(stats.balanceMs, false);

        // Determine Status Label
        let msg = "Banked";
        let isDebt = false;

        if (stats.balanceMs < 0) {
            isDebt = true;
            msg = "Overdrawn";
        }

        // Context-aware messaging
        if (stats.balanceMs === 0) {
            msg = "Bank is empty";
        } else if (stats.status === 'idle') {
            // Non-zero balance while idle implies carried over time or paused session
            msg = isDebt ? "Debt Carried Over" : "Bank Carried Over";
        }

        this.dom.displays.msgBalance.textContent = msg;

        // Visual Styling
        if (isDebt) {
            this.dom.cards.balance.classList.add('debt');
            this.dom.cards.balance.classList.remove('surplus');
        } else {
            this.dom.cards.balance.classList.add('surplus');
            this.dom.cards.balance.classList.remove('debt');
        }
    }

    /**
     * Updates button text and card highlighting based on state.
     * @param {string} status - 'idle', 'focus', 'break'
     */
    updateVisualState(status) {
        if (!this.dom.cards.focus) return;

        // Reset active classes
        this.dom.cards.focus.classList.remove('active');
        this.dom.cards.break.classList.remove('active');
        this.dom.buttons.main.classList.remove('is-focusing');
        this.dom.buttons.finish.classList.add('hidden'); // Default hide

        if (status === 'focus') {
            this.dom.cards.focus.classList.add('active');
            this.dom.buttons.main.textContent = "Switch to Break";
            this.dom.buttons.main.classList.add('is-focusing');
            this.dom.buttons.main.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Take a Break`;
            this.dom.buttons.finish.classList.remove('hidden');
        } 
        else if (status === 'break') {
            this.dom.cards.break.classList.add('active');
            this.dom.buttons.main.textContent = "Resume Focus";
            this.dom.buttons.main.innerHTML = `<i class="fa-solid fa-brain"></i> Resume Focus`;
            this.dom.buttons.finish.classList.remove('hidden');
        } 
        else {
            // Idle
            this.dom.buttons.main.textContent = "Start Focus";
            this.dom.buttons.main.innerHTML = `<i class="fa-solid fa-play"></i> Start Focus`;
        }
    }

    /**
     * Updates the "Session Started: 10:00 AM" text.
     */
    updateSessionStartTime(date) {
        if (!this.dom.displays.sessionStart) return;
        
        if (date) {
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.dom.displays.sessionStart.textContent = timeStr;
        } else {
            this.dom.displays.sessionStart.textContent = "--:--";
        }
    }

    toggleMenu(menuName, show) {
        const menu = this.dom.menus[menuName];
        const trigger = (menuName === 'ratio') ? this.dom.buttons.ratioTrigger : null;
        
        if (!menu || !trigger) return;

        if (show) {
            menu.classList.add('open');
            trigger.classList.add('active');
        } else {
            menu.classList.remove('open');
            trigger.classList.remove('active');
            this._removeOutsideClickListener(menuName);
        }
    }

    _setupOutsideClick(menuName) {
        const menu = this.dom.menus[menuName];
        const trigger = (menuName === 'ratio') ? this.dom.buttons.ratioTrigger : null;
        
        this._removeOutsideClickListener(menuName);

        const outsideClickListener = (e) => {
            if (menu && !menu.contains(e.target) && trigger && !trigger.contains(e.target)) {
                this.toggleMenu(menuName, false);
            }
        };

        this.activeMenuListeners.set(menuName, outsideClickListener);
        setTimeout(() => {
            document.addEventListener('click', outsideClickListener);
        }, 0);
    }

    _removeOutsideClickListener(menuName) {
        if (this.activeMenuListeners.has(menuName)) {
            const listener = this.activeMenuListeners.get(menuName);
            document.removeEventListener('click', listener);
            this.activeMenuListeners.delete(menuName);
        }
    }

    toggleModal(name, show) {
        const modal = this.dom.modals[name];
        if (modal) {
            modal.classList.toggle('hidden', !show);
        }
    }

    populateModal(name, data) {
        if (name === 'exception') {
            document.getElementById('exc-display-focus').textContent = this._formatTime(data.focusMs);
            document.getElementById('exc-display-break').textContent = this._formatTime(data.breakMs);
            document.getElementById('exc-focus-input').value = '';
            document.getElementById('exc-break-input').value = '';
        } 
        else if (name === 'conclusion') {
            const inputF = document.getElementById('conclude-focus-input');
            const inputB = document.getElementById('conclude-break-input');
            
            inputF.value = this._formatTime(data.focusMs, false);
            inputB.value = this._formatTime(data.breakMs, false);
        }
    }

    resetUI() {
        this.dom.displays.focus.textContent = "0:00:00";
        this.dom.displays.break.textContent = "0:00:00";
        this.dom.displays.balance.textContent = "+0:00";
        this.dom.displays.msgBalance.textContent = "Bank is empty";
        this.updateSessionStartTime(null);
        this.updateVisualState('idle');
    }

    _formatTime(ms, showHours = true) {
        const seconds = Math.floor(Math.abs(ms) / 1000);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const strM = m.toString().padStart(2, '0');
        const strS = s.toString().padStart(2, '0');

        if (showHours) {
            return `${h}:${strM}:${strS}`;
        }
        return `${h > 0 ? h + ':' : ''}${strM}:${strS}`;
    }
}