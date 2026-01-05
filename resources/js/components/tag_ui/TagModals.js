import { TagTemplates } from "./TagTemplates.js";
import { TagColorPicker } from "./TagColorPicker.js";

export class TagModals {
    /**
     * @param {Object} callbacks
     * @param {Function} callbacks.onSave - (name, color) => void
     * @param {Function} callbacks.onUpdate - (id, name, color) => void
     * @param {Function} callbacks.onDelete - (id) => void
     */
    constructor({ onSave, onUpdate, onDelete }) {
        // Store callbacks (Logic is delegated to the Manager)
        this.onSave = onSave;
        this.onUpdate = onUpdate;
        this.onDelete = onDelete;
        
        // Internal UI State
        this.editingTagId = null;
        this.pendingColor = '#10b981'; // Default Green
        this.cachedTags = [];

        this._init();
    }

    _init() {
        // 1. Ensure HTML structure exists in DOM
        if (!document.getElementById('tag-ui-modal-manage')) {
            document.body.insertAdjacentHTML('beforeend', TagTemplates.modals());
        }

        this._cacheDom();

        // 2. Initialize Sub-Component (Color Picker)
        const pickerElement = document.getElementById('tag-ui-modal-color');
        this.colorPicker = new TagColorPicker(pickerElement, {
            onSelect: (hexColor) => {
                this.pendingColor = hexColor;
                this._updateColorPreview(hexColor);
            },
            onCancel: () => {
                // Optional: logic on cancel
            }
        });

        // 3. Bind Main Modal Events
        this._bindEvents();
    }

    _cacheDom() {
        this.dom = {
            // Main Manage Modal
            manage: document.getElementById('tag-ui-modal-manage'),
            list: document.getElementById('tag-ui-manage-list'),
            closeManage: document.getElementById('tag-ui-close-manage'),
            
            // Add/Edit Form Elements
            inputName: document.getElementById('tag-ui-input-name'),
            formTitle: document.getElementById('tag-ui-form-title'),
            btnSubmit: document.getElementById('tag-ui-btn-submit'),
            btnCancelEdit: document.getElementById('tag-ui-btn-cancel-edit'),
            
            // Color Trigger Button (Opens Picker)
            btnColorTrigger: document.getElementById('tag-ui-btn-color'),
            previewDot: document.getElementById('tag-ui-preview-dot'),
            previewText: document.getElementById('tag-ui-preview-text'),

            // Delete Confirmation Modal
            modalDelete: document.getElementById('tag-ui-modal-delete'),
            deleteName: document.getElementById('tag-ui-delete-name'),
            deleteConfirm: document.getElementById('tag-ui-delete-confirm'),
            deleteCancel: document.getElementById('tag-ui-delete-cancel')
        };
    }

    _bindEvents() {
        // --- Manage Modal Interactions ---
        this.dom.closeManage.addEventListener('click', () => this.closeManage());

        // --- Form Actions ---
        this.dom.btnSubmit.addEventListener('click', () => this._handleSubmit());
        this.dom.btnCancelEdit.addEventListener('click', () => this._resetForm());

        // --- Open Color Picker ---
        this.dom.btnColorTrigger.addEventListener('click', () => {
            this.colorPicker.open(this.pendingColor);
        });

        // --- Delete Modal Interactions ---
        this.dom.deleteCancel.addEventListener('click', () => this.dom.modalDelete.classList.add('hidden'));
    }

    // --- Public Methods ---

    openManage() {
        this._resetForm();
        this.renderList();
        this.dom.manage.classList.remove('hidden');
    }

    closeManage() {
        this.dom.manage.classList.add('hidden');
    }

    updateTags(tags) {
        this.cachedTags = tags;
        // Refresh list immediately if modal is open
        if (!this.dom.manage.classList.contains('hidden')) {
            this.renderList();
        }
    }

    // --- Render Logic ---

    renderList() {
        this.dom.list.innerHTML = '';
        
        this.cachedTags.forEach(t => {
            // Create item wrapper
            const el = document.createElement('div');
            el.className = 'manage-tag-item';
            el.innerHTML = TagTemplates.manageItem(t);

            // Click Body -> Edit Mode
            el.addEventListener('click', (e) => {
                // Ignore if clicking the delete icon
                if(!e.target.closest('.btn-delete-tag')) {
                    this._loadForEdit(t);
                }
            });

            // Click Trash -> Delete Confirmation
            el.querySelector('.btn-delete-tag').addEventListener('click', (e) => {
                e.stopPropagation();
                this._confirmDelete(t);
            });

            this.dom.list.appendChild(el);
        });
    }

    // --- Internal Helpers ---

    _handleSubmit() {
        const name = this.dom.inputName.value.trim();
        if (!name) return;
        
        // Execute Callback (Data persistence handled by TagUIManager)
        if (this.editingTagId) {
            if (this.onUpdate) {
                this.onUpdate(this.editingTagId, name, this.pendingColor);
            }
        } else {
            if (this.onSave) {
                this.onSave(name, this.pendingColor);
            }
        }
        
        this._resetForm();
    }

    _loadForEdit(tag) {
        this.editingTagId = tag.id;
        this.dom.inputName.value = tag.name;
        this.pendingColor = tag.color;
        this._updateColorPreview(tag.color);
        
        this.dom.formTitle.textContent = "Edit Tag";
        this.dom.btnSubmit.textContent = "Save Changes";
        this.dom.btnCancelEdit.classList.remove('hidden');
    }

    _resetForm() {
        this.editingTagId = null;
        this.dom.inputName.value = '';
        this.dom.formTitle.textContent = "Add New Tag";
        this.dom.btnSubmit.textContent = "Add Tag";
        this.dom.btnCancelEdit.classList.add('hidden');
        this.pendingColor = '#10b981'; // Default
        this._updateColorPreview(this.pendingColor);
    }

    _updateColorPreview(color) {
        this.dom.previewDot.style.backgroundColor = color;
        this.dom.previewText.textContent = color;
    }

    _confirmDelete(tag) {
        this.dom.deleteName.textContent = tag.name;
        this.dom.modalDelete.classList.remove('hidden');

        // Clone button to strip previous event listeners (Simple way to prevent multiple binds)
        const newBtn = this.dom.deleteConfirm.cloneNode(true);
        this.dom.deleteConfirm.parentNode.replaceChild(newBtn, this.dom.deleteConfirm);
        this.dom.deleteConfirm = newBtn;

        newBtn.addEventListener('click', () => {
            if (this.onDelete) {
                this.onDelete(tag.id);
            }
            this.dom.modalDelete.classList.add('hidden');
        });
    }
}