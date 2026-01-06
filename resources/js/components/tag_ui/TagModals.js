import { TagTemplates } from "./TagTemplates.js";
import { TagColorPicker } from "./TagColorPicker.js";

export class TagModals {
    constructor({ onSave, onUpdate, onDelete }) {
        this.onSave = onSave;
        this.onUpdate = onUpdate;
        this.onDelete = onDelete;
        
        this.editingTagId = null;
        this.pendingColor = '#10b981';
        this.cachedTags = [];

        this._init();
    }

    _init() {
        // Only inject if not already present (Singleton pattern check)
        if (!document.getElementById('tag-ui-modal-manage')) {
            document.body.insertAdjacentHTML('beforeend', TagTemplates.modals());
        }

        this._cacheDom();

        const pickerElement = document.getElementById('tag-ui-modal-color');
        if (pickerElement) {
            this.colorPicker = new TagColorPicker(pickerElement, {
                onSelect: (hexColor) => {
                    this.pendingColor = hexColor;
                    this._updateColorPreview(hexColor);
                },
                onCancel: () => {}
            });
        }

        this._bindEvents();
    }

    _cacheDom() {
        this.dom = {
            manage: document.getElementById('tag-ui-modal-manage'),
            list: document.getElementById('tag-ui-manage-list'),
            closeManage: document.getElementById('tag-ui-close-manage'),
            inputName: document.getElementById('tag-ui-input-name'),
            formTitle: document.getElementById('tag-ui-form-title'),
            btnSubmit: document.getElementById('tag-ui-btn-submit'),
            btnCancelEdit: document.getElementById('tag-ui-btn-cancel-edit'),
            btnColorTrigger: document.getElementById('tag-ui-btn-color'),
            previewDot: document.getElementById('tag-ui-preview-dot'),
            previewText: document.getElementById('tag-ui-preview-text'),
            modalDelete: document.getElementById('tag-ui-modal-delete'),
            deleteName: document.getElementById('tag-ui-delete-name'),
            deleteConfirm: document.getElementById('tag-ui-delete-confirm'),
            deleteCancel: document.getElementById('tag-ui-delete-cancel')
        };
    }

    _bindEvents() {
        // Safety check if elements exist
        if (!this.dom.manage) return;

        // Close via 'X' button
        this.dom.closeManage.addEventListener('click', () => this.closeManage());

        // Close via Outside Click (Overlay)
        this.dom.manage.addEventListener('click', (e) => {
            // Only close if the user clicked the overlay div directly, 
            // not the content card inside it.
            if (e.target === this.dom.manage) {
                this.closeManage();
            }
        });

        this.dom.btnSubmit.addEventListener('click', () => this._handleSubmit());
        this.dom.btnCancelEdit.addEventListener('click', () => this._resetForm());
        this.dom.btnColorTrigger.addEventListener('click', () => {
            if(this.colorPicker) this.colorPicker.open(this.pendingColor);
        });
        
        // Delete Modal Events
        this.dom.deleteCancel.addEventListener('click', () => this.dom.modalDelete.classList.add('hidden'));
        
        // Optional: Close Delete Modal via Outside Click as well
        if (this.dom.modalDelete) {
            this.dom.modalDelete.addEventListener('click', (e) => {
                if (e.target === this.dom.modalDelete) {
                    this.dom.modalDelete.classList.add('hidden');
                }
            });
        }
    }

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
        if (this.dom.manage && !this.dom.manage.classList.contains('hidden')) {
            this.renderList();
        }
    }

    renderList() {
        if (!this.dom.list) return;
        this.dom.list.innerHTML = '';
        this.cachedTags.forEach(t => {
            const el = document.createElement('div');
            el.className = 'manage-tag-item';
            el.innerHTML = TagTemplates.manageItem(t);
            
            el.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-delete-tag')) {
                    this._loadForEdit(t);
                }
            });

            el.querySelector('.btn-delete-tag').addEventListener('click', (e) => {
                e.stopPropagation();
                this._confirmDelete(t);
            });

            this.dom.list.appendChild(el);
        });
    }

    _handleSubmit() {
        const name = this.dom.inputName.value.trim();
        if (!name) return;
        
        if (this.editingTagId) {
            if (this.onUpdate) this.onUpdate(this.editingTagId, name, this.pendingColor);
        } else {
            if (this.onSave) this.onSave(name, this.pendingColor);
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
        this.pendingColor = '#10b981';
        this._updateColorPreview(this.pendingColor);
    }

    _updateColorPreview(color) {
        this.dom.previewDot.style.backgroundColor = color;
        this.dom.previewText.textContent = color;
    }

    _confirmDelete(tag) {
        this.dom.deleteName.textContent = tag.name;
        this.dom.modalDelete.classList.remove('hidden');

        const newBtn = this.dom.deleteConfirm.cloneNode(true);
        this.dom.deleteConfirm.parentNode.replaceChild(newBtn, this.dom.deleteConfirm);
        this.dom.deleteConfirm = newBtn;

        newBtn.addEventListener('click', () => {
            if (this.onDelete) this.onDelete(tag.id);
            this.dom.modalDelete.classList.add('hidden');
        });
    }

    /**
     * CLEANUP METHOD:
     * Removes the Modal DOM elements to prevent duplicates on navigation.
     */
    destroy() {
        // Remove the Main Manage Modal
        const manageModal = document.getElementById('tag-ui-modal-manage');
        if (manageModal) manageModal.remove();

        // Remove the Color Picker Modal
        const colorModal = document.getElementById('tag-ui-modal-color');
        if (colorModal) colorModal.remove();

        // Remove the Delete Confirmation Modal
        const deleteModal = document.getElementById('tag-ui-modal-delete');
        if (deleteModal) deleteModal.remove();

        // Clean up child component
        if (this.colorPicker && typeof this.colorPicker.destroy === 'function') {
            this.colorPicker.destroy();
        }

        this.dom = {};
    }
}