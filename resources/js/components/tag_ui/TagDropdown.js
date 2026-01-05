import { TagTemplates } from "./TagTemplates.js";

export class TagDropdown {
    constructor({ triggerEl, displayEl, defaultTag, onSelect, onManage }) {
        this.triggerEl = triggerEl;
        this.displayEl = displayEl;
        this.defaultTag = defaultTag || "Standard"; 
        this.onSelect = onSelect;
        this.onManage = onManage;
        
        this.dom = {};
        
        // Store bound function reference for removal later
        this.boundOutsideClick = this._handleOutsideClick.bind(this);

        this._init();
    }

    _init() {
        // 1. Inject HTML if missing
        if (!this.triggerEl.nextElementSibling || !this.triggerEl.nextElementSibling.classList.contains('selector-menu')) {
            this.triggerEl.insertAdjacentHTML('afterend', TagTemplates.dropdown());
        }

        // 2. Cache Elements
        this.dom.menu = this.triggerEl.nextElementSibling;
        this.dom.list = this.dom.menu.querySelector('.tag-list-container');
        this.dom.btnClear = this.dom.menu.querySelector('.js-btn-clear');
        this.dom.btnManage = this.dom.menu.querySelector('.js-btn-manage');

        // 3. Bind Events
        this._bindEvents();
    }

    _bindEvents() {
        // Toggle Menu
        this.triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on Outside Click (Using bound reference)
        document.addEventListener('click', this.boundOutsideClick);

        // Tag Selection
        this.dom.list.addEventListener('click', (e) => {
            const btn = e.target.closest('.selector-opt');
            if (btn) {
                this._handleSelection(btn.dataset.value);
            }
        });

        // "Clear Selection" Button
        if (this.dom.btnClear) {
            this.dom.btnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleSelection(this.defaultTag); 
            });
        }

        // "Manage Tags" Button
        if (this.dom.btnManage) {
            this.dom.btnManage.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
                if (this.onManage) this.onManage();
            });
        }
    }

    _handleOutsideClick(e) {
        // Check if menu exists before checking contains (safety)
        if (!this.dom.menu) return;

        const isClickInside = this.dom.menu.contains(e.target) || this.triggerEl.contains(e.target);
        if (this.dom.menu.classList.contains('open') && !isClickInside) {
            this.close();
        }
    }

    render(tags, currentTag) {
        if (!this.dom.list) return;

        this.dom.list.innerHTML = '';
        
        tags.forEach(t => {
            if (t.name !== "Standard" && t.name !== this.defaultTag) {
                const btn = document.createElement('button');
                btn.className = 'selector-opt';
                btn.dataset.value = t.name;
                btn.innerHTML = TagTemplates.dropdownItem(t.name, t.color);
                
                if (t.name === currentTag) btn.classList.add('selected');
                
                this.dom.list.appendChild(btn);
            }
        });

        this.updateSelectionUI(currentTag);
    }

    toggle() {
        if(this.dom.menu) this.dom.menu.classList.toggle('open');
        this.triggerEl.classList.toggle('active');
    }

    close() {
        if(this.dom.menu) this.dom.menu.classList.remove('open');
        this.triggerEl.classList.remove('active');
    }

    updateSelectionUI(tagName) {
        if (this.displayEl) {
            this.displayEl.textContent = tagName;
        }

        if (this.dom.list) {
            const opts = this.dom.list.querySelectorAll('.selector-opt');
            opts.forEach(o => {
                if (o.dataset.value === tagName) o.classList.add('selected');
                else o.classList.remove('selected');
            });
        }

        if (this.dom.btnClear) {
            if (tagName === this.defaultTag || tagName === "Standard") {
                this.dom.btnClear.classList.add('hidden');
            } else {
                this.dom.btnClear.classList.remove('hidden');
            }
        }
    }

    _handleSelection(tagName) {
        this.updateSelectionUI(tagName);
        this.close();
        if (this.onSelect) this.onSelect(tagName);
    }

    /**
     * CLEANUP METHOD: Called by TagUIManager.js
     */
    destroy() {
        // Remove global listener
        document.removeEventListener('click', this.boundOutsideClick);
        
        // Clear references
        this.dom = {};
        this.triggerEl = null;
        this.displayEl = null;
    }
}