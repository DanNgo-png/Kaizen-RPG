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
                conclusion: document.getElementById('conclusion-modal'),
                deleteTag: document.getElementById('delete-tag-modal') // Added
            }
        };
        
        this.activeMenuListeners = new Map();
    }

    // ... [Previous methods: updateStatsDisplay, updateVisualState, updateSessionStartTime, renderTagList] ...

    renderTagList(tags) {
        const list = this.dom.menus.tagList;
        list.innerHTML = ''; 

        // Default "No Tag"
        const defBtn = document.createElement('button');
        defBtn.className = 'selector-opt tag-opt';
        defBtn.dataset.value = "No Tag";
        defBtn.innerHTML = `<span class="opt-dot" style="background-color: #6b7280;"></span> No Tag`;
        list.appendChild(defBtn);

        // Render DB Tags
        tags.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'selector-opt tag-opt';
            btn.dataset.value = t.name;
            const displayColor = t.color || '#6b7280';
            btn.innerHTML = `<span class="opt-dot" style="background-color: ${displayColor};"></span> ${t.name}`;
            list.appendChild(btn);
        });
    }

    renderManageList(tags, onSelect, onDelete) {
        const container = document.getElementById('manage-tag-list');
        if(!container) return;
        container.innerHTML = '';

        tags.forEach(t => {
            const el = document.createElement('div');
            el.className = 'manage-tag-item';
            el.dataset.id = t.id;
            
            const displayColor = t.color || '#6b7280';

            el.innerHTML = `
                <div class="tag-info">
                    <span class="opt-dot" style="background-color: ${displayColor}"></span>
                    <span>${t.name}</span>
                </div>
                <button class="btn-delete-tag"><i class="fa-solid fa-trash"></i></button>
            `;

            // Select Event (Background click)
            el.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-delete-tag')) {
                    container.querySelectorAll('.manage-tag-item').forEach(i => i.classList.remove('active'));
                    el.classList.add('active');
                    onSelect(t);
                }
            });

            // Delete Event - UPDATED to use custom modal
            const delBtn = el.querySelector('.btn-delete-tag');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDeleteTagModal(t, onDelete);
            });

            container.appendChild(el);
        });
    }

    /**
     * Opens the visual delete confirmation modal
     */
    openDeleteTagModal(tag, confirmCallback) {
        const modal = this.dom.modals.deleteTag;
        const nameDisplay = document.getElementById('del-tag-name-display');
        const btnConfirm = document.getElementById('btn-confirm-delete-tag');
        const btnCancel = document.getElementById('btn-cancel-delete-tag');

        if (!modal || !nameDisplay) return;

        // Set Content
        nameDisplay.textContent = `"${tag.name}"`;
        
        // Clone buttons to strip old event listeners (cleanest way without managing named references)
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
        
        const newBtnCancel = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

        // Bind New Events
        newBtnConfirm.addEventListener('click', () => {
            confirmCallback(tag.id);
            modal.classList.add('hidden');
        });

        newBtnCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };

        // Show
        modal.classList.remove('hidden');
    }

    // ... [Rest of the file: toggleMenu, _setupOutsideClick, populateModal, etc.] ...
    
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
            this._removeOutsideClickListener(menuName);
        }
    }

    _setupOutsideClick(menuName) {
        const menu = this.dom.menus[menuName];
        const trigger = this.dom.buttons[`${menuName}Trigger`];
        
        this._removeOutsideClickListener(menuName);

        const outsideClickListener = (e) => {
            if (!menu.contains(e.target) && !trigger.contains(e.target)) {
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

    updateTagListSelection(tagValue) {
        this.dom.displays.tag.textContent = tagValue;
        const opts = this.dom.menus.tagList.querySelectorAll('.tag-opt');
        opts.forEach(el => {
            if (el.dataset.value === tagValue) el.classList.add('selected');
            else el.classList.remove('selected');
        });
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
            const fSec = Math.floor(data.focusMs / 1000);
            const bSec = Math.floor(data.breakMs / 1000);
            
            const inputF = document.getElementById('conclude-focus-input');
            const inputB = document.getElementById('conclude-break-input');
            const rangeF = document.getElementById('conclude-focus-slider');
            const rangeB = document.getElementById('conclude-break-slider');
            
            rangeF.max = fSec > 0 ? fSec : 60; 
            rangeF.value = fSec; 
            
            rangeB.max = bSec > 0 ? bSec : 60;
            rangeB.value = bSec;

            inputF.value = this._formatTime(data.focusMs, false);
            inputB.value = this._formatTime(data.breakMs, false);

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