import { FocusAPI } from "../api/FocusAPI.js";

export class TagUIManager {
    /**
     * @param {Object} config
     * @param {string} config.triggerId - ID of the button to open dropdown
     * @param {string} config.displayId - ID of the span to show selected text
     * @param {string} config.initialTag - The currently selected tag
     * @param {Function} config.onTagSelected - Callback(tagName)
     */
    constructor({ triggerId, displayId, initialTag, onTagSelected }) {
        this.triggerEl = document.getElementById(triggerId);
        this.displayEl = document.getElementById(displayId);
        
        // Internal State
        this.onTagSelected = onTagSelected;
        this.currentTag = initialTag || "Standard";
        this.cachedTags = [];
        this.pendingColor = '#10b981';
        this.editingTagId = null;

        // Ensure shared Modals exist in DOM (Singleton-ish check)
        this.injectModalsIfNeeded();

        this.init();
    }

    init() {
        if (!this.triggerEl) return;

        // 1. Create Dropdown HTML Structure next to trigger if not exists
        this.ensureDropdownStructure();

        // 2. Cache new DOM elements
        this.dom = {
            menu: this.triggerEl.nextElementSibling,
            list: this.triggerEl.nextElementSibling.querySelector('.tag-list-container'),
            btnManage: document.getElementById('tag-ui-btn-manage')
        };

        // 3. Listeners
        this.triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        document.addEventListener('click', (e) => {
            if (this.dom.menu && !this.dom.menu.contains(e.target) && !this.triggerEl.contains(e.target)) {
                this.closeMenu();
            }
        });

        this.dom.list.addEventListener('click', (e) => {
            const btn = e.target.closest('.selector-opt');
            if (btn) {
                this.selectTag(btn.dataset.value);
                this.closeMenu();
            }
        });

        // 4. Data Binding
        Neutralino.events.on('receiveTags', (e) => {
            this.cachedTags = e.detail;
            this.renderDropdown();
            // If management modal is open, refresh it
            if(!document.getElementById('tag-ui-modal-manage').classList.contains('hidden')) {
                this.renderManageList();
            }
        });

        FocusAPI.getTags(); // Initial Fetch

        // 5. Setup Modal Logic
        this.bindModalEvents();
    }

    ensureDropdownStructure() {
        // Only add if not already there
        if (this.triggerEl.nextElementSibling && this.triggerEl.nextElementSibling.classList.contains('selector-menu')) return;

        const menuHtml = `
            <div class="selector-menu">
                <div class="tag-list-container"></div>
                <div class="menu-footer-action">
                    <button id="tag-ui-btn-manage" class="btn-block-text">
                        <i class="fa-solid fa-gear"></i> Manage Tags
                    </button>
                </div>
            </div>
        `;
        this.triggerEl.insertAdjacentHTML('afterend', menuHtml);
    }

    injectModalsIfNeeded() {
        if (document.getElementById('tag-ui-modal-manage')) return;

        const modalsHTML = `
            <!-- Manage Tags Modal -->
            <div id="tag-ui-modal-manage" class="modal-overlay hidden">
                <div class="focus-flexible-modal-content large-modal">
                    <div class="modal-header">
                        <h3>Manage Tags</h3>
                        <button id="tag-ui-close-manage" class="btn-icon-sm"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="manage-layout">
                        <div class="manage-sidebar">
                            <h4 class="section-title current-tags">Current Tags</h4>
                            <div id="tag-ui-manage-list" class="manage-list-container"></div>
                        </div>
                        <div class="manage-form-area">
                            <h4 id="tag-ui-form-title" class="section-title add-new-tag">Add New Tag</h4>
                            <div class="form-group">
                                <label>Tag Name</label>
                                <input type="text" id="tag-ui-input-name" placeholder="e.g. Deep Work">
                            </div>
                            <div class="form-group">
                                <label>Color</label>
                                <button id="tag-ui-btn-color" class="color-preview-btn">
                                    <span id="tag-ui-preview-dot" class="preview-dot" style="background:#10b981"></span>
                                    <span id="tag-ui-preview-text">#10b981</span>
                                </button>
                            </div>
                            <div class="form-actions">
                                <button id="tag-ui-btn-cancel-edit" class="btn-flex-secondary hidden">Cancel</button>
                                <button id="tag-ui-btn-submit" class="btn-flex-primary">Add Tag</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Color Picker -->
            <div id="tag-ui-modal-color" class="modal-overlay hidden nested-overlay">
                <div class="focus-flexible-modal-content compact-modal">
                    <h3>Pick Color</h3>
                    <div class="color-presets">
                        <div class="color-swatch" data-color="#3b82f6" style="background: #3b82f6;"></div>
                        <div class="color-swatch" data-color="#10b981" style="background: #10b981;"></div>
                        <div class="color-swatch" data-color="#f59e0b" style="background: #f59e0b;"></div>
                        <div class="color-swatch" data-color="#ef4444" style="background: #ef4444;"></div>
                        <div class="color-swatch" data-color="#a855f7" style="background: #a855f7;"></div>
                        <div class="color-swatch" data-color="#ec4899" style="background: #ec4899;"></div>
                    </div>
                    <div class="input-row">
                        <label>Hex Code</label>
                        <input type="text" id="tag-ui-hex-input" placeholder="#FFFFFF">
                    </div>
                    <div class="modal-actions">
                        <button id="tag-ui-color-cancel" class="btn-flex-secondary">Cancel</button>
                        <button id="tag-ui-color-confirm" class="btn-flex-primary">Select</button>
                    </div>
                </div>
            </div>

            <!-- Delete Confirm -->
            <div id="tag-ui-modal-delete" class="modal-overlay hidden">
                <div class="focus-flexible-modal-content" style="text-align: center; width: 350px;">
                    <div class="modal-header-icon" style="color:#ef4444; font-size: 2rem; margin-bottom:10px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h3>Delete Tag?</h3>
                    <p>Delete <b id="tag-ui-delete-name"></b>? This cannot be undone.</p>
                    <div class="modal-actions" style="justify-content: center;">
                        <button id="tag-ui-delete-cancel" class="btn-flex-secondary">Cancel</button>
                        <button id="tag-ui-delete-confirm" class="btn-flex-primary" style="background:#ef4444; border-color:#ef4444">Delete</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    bindModalEvents() {
        const dom = {
            manage: document.getElementById('tag-ui-modal-manage'),
            manageBtn: document.getElementById('tag-ui-btn-manage'), // Inside dropdown
            closeManage: document.getElementById('tag-ui-close-manage'),
            submit: document.getElementById('tag-ui-btn-submit'),
            cancelEdit: document.getElementById('tag-ui-btn-cancel-edit'),
            inputName: document.getElementById('tag-ui-input-name'),
            // Color
            btnColor: document.getElementById('tag-ui-btn-color'),
            modalColor: document.getElementById('tag-ui-modal-color'),
            btnColorConfirm: document.getElementById('tag-ui-color-confirm'),
            btnColorCancel: document.getElementById('tag-ui-color-cancel')
        };

        // Open Management
        dom.manageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeMenu();
            this.resetForm();
            this.renderManageList();
            dom.manage.classList.remove('hidden');
        });

        dom.closeManage.addEventListener('click', () => dom.manage.classList.add('hidden'));

        // Submit Add/Edit
        dom.submit.addEventListener('click', () => {
            const name = dom.inputName.value.trim();
            if (!name) return;
            
            if (this.editingTagId) FocusAPI.updateTag(this.editingTagId, name, this.pendingColor);
            else FocusAPI.saveTag(name, this.pendingColor);
            
            this.resetForm();
        });

        dom.cancelEdit.addEventListener('click', () => this.resetForm());

        // Color Picker
        dom.btnColor.addEventListener('click', () => dom.modalColor.classList.remove('hidden'));
        
        dom.btnColorConfirm.addEventListener('click', () => {
            const hex = document.getElementById('tag-ui-hex-input').value || this.pendingColor;
            this.updatePreview(hex);
            this.pendingColor = hex;
            dom.modalColor.classList.add('hidden');
        });

        dom.btnColorCancel.addEventListener('click', () => dom.modalColor.classList.add('hidden'));

        document.querySelectorAll('.color-swatch').forEach(s => {
            s.addEventListener('click', (e) => {
                document.getElementById('tag-ui-hex-input').value = e.target.dataset.color;
            });
        });
    }

    // --- RENDER LOGIC ---

    renderDropdown() {
        this.dom.list.innerHTML = '';
        this.addDropdownItem("Standard", "#6b7280");
        this.cachedTags.forEach(t => {
            if(t.name !== "Standard") this.addDropdownItem(t.name, t.color);
        });
        this.selectTag(this.currentTag, false); // Re-highlight without callback
    }

    addDropdownItem(name, color) {
        const btn = document.createElement('button');
        btn.className = 'selector-opt selector-opt';
        btn.dataset.value = name;
        btn.innerHTML = `<span class="opt-dot" style="background-color: ${color};"></span> ${name}`;
        this.dom.list.appendChild(btn);
    }

    renderManageList() {
        const container = document.getElementById('tag-ui-manage-list');
        container.innerHTML = '';
        this.cachedTags.forEach(t => {
            const el = document.createElement('div');
            el.className = 'manage-tag-item';
            el.innerHTML = `
                <div class="tag-info"><span class="opt-dot" style="background-color:${t.color}"></span> ${t.name}</div>
                <button class="btn-delete-tag"><i class="fa-solid fa-trash"></i></button>
            `;
            // Edit
            el.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-delete-tag')) this.loadForEdit(t);
            });
            // Delete
            el.querySelector('.btn-delete-tag').addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDelete(t);
            });
            container.appendChild(el);
        });
    }

    // --- HELPERS ---

    toggleMenu() {
        this.dom.menu.classList.toggle('open');
        this.triggerEl.classList.toggle('active');
    }

    closeMenu() {
        this.dom.menu.classList.remove('open');
        this.triggerEl.classList.remove('active');
    }

    selectTag(name, emitCallback = true) {
        this.currentTag = name;
        if(this.displayEl) this.displayEl.textContent = name;
        
        const opts = this.dom.list.querySelectorAll('.selector-opt');
        opts.forEach(o => {
            if(o.dataset.value === name) o.classList.add('selected');
            else o.classList.remove('selected');
        });

        if (emitCallback && this.onTagSelected) {
            this.onTagSelected(name);
        }
    }

    resetForm() {
        this.editingTagId = null;
        document.getElementById('tag-ui-input-name').value = '';
        document.getElementById('tag-ui-form-title').textContent = "Add New Tag";
        document.getElementById('tag-ui-btn-submit').textContent = "Add Tag";
        document.getElementById('tag-ui-btn-cancel-edit').classList.add('hidden');
        this.updatePreview('#10b981');
    }

    loadForEdit(tag) {
        this.editingTagId = tag.id;
        document.getElementById('tag-ui-input-name').value = tag.name;
        this.pendingColor = tag.color;
        this.updatePreview(tag.color);
        document.getElementById('tag-ui-form-title').textContent = "Edit Tag";
        document.getElementById('tag-ui-btn-submit').textContent = "Save Changes";
        document.getElementById('tag-ui-btn-cancel-edit').classList.remove('hidden');
    }

    updatePreview(color) {
        document.getElementById('tag-ui-preview-dot').style.backgroundColor = color;
        document.getElementById('tag-ui-preview-text').textContent = color;
    }

    confirmDelete(tag) {
        const modal = document.getElementById('tag-ui-modal-delete');
        document.getElementById('tag-ui-delete-name').textContent = tag.name;
        modal.classList.remove('hidden');

        // Clone button to strip old listeners
        const btnConf = document.getElementById('tag-ui-delete-confirm');
        const newBtn = btnConf.cloneNode(true);
        btnConf.parentNode.replaceChild(newBtn, btnConf);

        newBtn.addEventListener('click', () => {
            FocusAPI.deleteTag(tag.id);
            modal.classList.add('hidden');
            if(this.currentTag === tag.name) this.selectTag("Standard");
        });

        document.getElementById('tag-ui-delete-cancel').onclick = () => modal.classList.add('hidden');
    }
}