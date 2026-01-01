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
                ratioTrigger: document.getElementById('ratio-trigger'),
                tagTrigger: document.getElementById('tag-trigger'),
                addTag: document.getElementById('btn-add-custom-tag')
            },
            menus: {
                ratio: document.getElementById('ratio-menu'),
                tag: document.getElementById('tag-menu'),
                tagList: document.getElementById('tag-list')
            },
            inputs: {
                newTag: document.getElementById('new-tag-input')
            },
            modals: {
                exception: document.getElementById('exception-modal'),
                conclusion: document.getElementById('conclusion-modal')
            }
        };
    }

    /**
     * Main render loop update
     */
    updateStatsDisplay(stats) {
        this.dom.displays.focus.textContent = this._formatTime(stats.focusMs);
        this.dom.displays.break.textContent = this._formatTime(stats.breakMs);
        
        const prefix = stats.balanceMs >= 0 ? '+' : '-';
        this.dom.displays.balance.textContent = prefix + this._formatTime(stats.balanceMs, false);

        // Balance State (Colors)
        if (stats.balanceMs < 0) {
            this.dom.cards.balance.classList.add('debt');
            this.dom.cards.balance.classList.remove('surplus');
            this.dom.displays.msgBalance.textContent = "Overdrawn";
        } else {
            this.dom.cards.balance.classList.add('surplus');
            this.dom.cards.balance.classList.remove('debt');
            this.dom.displays.msgBalance.textContent = "Banked";
        }
    }

    updateVisualState(status) {
        // Card Highlighting
        this.dom.cards.focus.classList.toggle('active', status === 'focus');
        this.dom.cards.break.classList.toggle('active', status === 'break');

        // Button State
        const btn = this.dom.buttons.main;
        if (status === 'focus') {
            btn.textContent = "Switch to Break";
            btn.classList.add('is-focusing');
            btn.innerHTML = `<i class="fa-solid fa-mug-hot"></i> Take a Break`;
        } else if (status === 'break') {
            btn.textContent = "Resume Focus";
            btn.classList.remove('is-focusing');
            btn.innerHTML = `<i class="fa-solid fa-brain"></i> Resume Focus`;
        } else {
            btn.classList.remove('is-focusing');
            btn.innerHTML = `<i class="fa-solid fa-play"></i> Start Focus`;
        }

        // Visibility of Finish button
        if (status === 'idle') {
            this.dom.buttons.finish.classList.add('hidden');
        } else {
            this.dom.buttons.finish.classList.remove('hidden');
        }
    }

    updateSessionStartTime(dateObj) {
        if (this.dom.displays.sessionStart) {
            this.dom.displays.sessionStart.textContent = dateObj 
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "--:--";
        }
    }

    // --- Menu Logic ---

    toggleMenu(menuName, show) {
        const menu = this.dom.menus[menuName];
        const trigger = this.dom.buttons[`${menuName}Trigger`];
        if (!menu || !trigger) return;

        if (show) {
            menu.classList.add('open');
            trigger.classList.add('active');
        } else {
            menu.classList.remove('open');
            trigger.classList.remove('active');
        }
    }

    updateTagListSelection(tagValue) {
        this.dom.displays.tag.textContent = tagValue;
        const opts = this.dom.menus.tagList.querySelectorAll('.tag-opt');
        opts.forEach(el => {
            if (el.dataset.value === tagValue) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }

    addTagOption(tagName) {
        const btn = document.createElement('button');
        btn.className = 'selector-opt tag-opt';
        btn.dataset.value = tagName;
        btn.innerHTML = `<span class="opt-dot color-grey"></span> ${tagName}`;
        
        // Insert after the input box
        this.dom.menus.tagList.insertBefore(btn, this.dom.menus.tagList.children[1]);
        return btn;
    }

    // --- Modal Logic ---

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
            const fSec = Math.floor(data.focusMs / 1000);
            const bSec = Math.floor(data.breakMs / 1000);
            
            const inputF = document.getElementById('conclude-focus-input');
            const inputB = document.getElementById('conclude-break-input');
            const rangeF = document.getElementById('conclude-focus-slider');
            const rangeB = document.getElementById('conclude-break-slider');
            
            // 1. Configure Focus Slider
            // Ensure max is at least 60 seconds so slider isn't broken on 0
            rangeF.max = fSec > 0 ? fSec : 60; 
            rangeF.value = fSec; // Default to full right (Total time)
            
            // 2. Configure Break Slider
            rangeB.max = bSec > 0 ? bSec : 60;
            rangeB.value = bSec; // Default to full right (Total time)

            // 3. Populate Inputs with formatted time (MM:SS)
            inputF.value = this._formatTime(data.focusMs, false);
            inputB.value = this._formatTime(data.breakMs, false);

            // 4. Trigger visual update (Gradient Fill)
            rangeF.dispatchEvent(new Event('input'));
            rangeB.dispatchEvent(new Event('input'));
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

    // --- Utilities ---

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