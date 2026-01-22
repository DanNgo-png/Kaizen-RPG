import { TagTemplates } from "./TagTemplates.js";
import { TagColorPicker } from "./TagColorPicker.js";

export class TagModals {
    constructor({ onSave, onUpdate, onDelete }) {
        this.onSave = onSave;
        this.onUpdate = onUpdate;
        this.onDelete = onDelete;
        
        this.editingTagId = null;
        this.pendingColor = '#10b981'; // Default Green
        this.cachedTags = [];

        this._init();
    }

    _init() {
        if (!document.getElementById('tag-ui-modal-manage')) {
            document.body.insertAdjacentHTML('beforeend', TagTemplates.modals());
        }

        this._cacheDom();

        // Initialize the Color Picker Logic
        const pickerElement = document.getElementById('tag-ui-modal-color');
        if (pickerElement) {
            this.colorPicker = new TagColorPicker(pickerElement, {
                onSelect: (hexColor) => {
                    // Update state immediately upon selection
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
            
            // Form Elements
            inputName: document.getElementById('tag-ui-input-name'),
            formTitle: document.getElementById('tag-ui-form-title'),
            btnSubmit: document.getElementById('tag-ui-btn-submit'),
            btnCancelEdit: document.getElementById('tag-ui-btn-cancel-edit'),
            
            // Color Elements
            btnColorTrigger: document.getElementById('tag-ui-btn-color'),
            previewDot: document.getElementById('tag-ui-preview-dot'),
            previewText: document.getElementById('tag-ui-preview-text'),
            
            // Delete Modal Elements
            modalDelete: document.getElementById('tag-ui-modal-delete'),
            deleteName: document.getElementById('tag-ui-delete-name'),
            deleteConfirm: document.getElementById('tag-ui-delete-confirm'),
            deleteCancel: document.getElementById('tag-ui-delete-cancel')
        };
    }

    _bindEvents() {
        if (!this.dom.manage) return;

        this.dom.closeManage.addEventListener('click', () => this.closeManage());
        this.dom.manage.addEventListener('click', (e) => {
            if (e.target === this.dom.manage) this.closeManage();
        });

        // Submit Button Logic
        this.dom.btnSubmit.addEventListener('click', () => this._handleSubmit());
        
        // Cancel Edit Logic
        this.dom.btnCancelEdit.addEventListener('click', () => this._resetForm());

        // Open Color Picker
        this.dom.btnColorTrigger.addEventListener('click', () => {
            if(this.colorPicker) {
                // Pass current pending color so picker shows correct selection
                this.colorPicker.open(this.pendingColor);
            }
        });

        // Delete Modal Logic
        this.dom.deleteCancel.addEventListener('click', () => this.dom.modalDelete.classList.add('hidden'));
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
        // If modal is open, refresh the list immediately to show changes
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
            // Highlight the item currently being edited
            if (this.editingTagId === t.id) el.classList.add('active');
            
            el.innerHTML = TagTemplates.manageItem(t);
            
            // Click to Edit
            el.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-delete-tag')) {
                    this._loadForEdit(t);
                }
            });

            // Click to Delete
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
        
        // Send data to API
        if (this.editingTagId) {
            if (this.onUpdate) this.onUpdate(this.editingTagId, name, this.pendingColor);
        } else {
            if (this.onSave) this.onSave(name, this.pendingColor);
        }
        
        // Reset form to "Add New" state after submission
        this._resetForm();
    }

    _loadForEdit(tag) {
        this.editingTagId = tag.id;
        this.dom.inputName.value = tag.name;
        
        // CRITICAL: Set pending color to the tag's existing color
        this.pendingColor = tag.color; 
        this._updateColorPreview(tag.color);
        
        // UI Updates
        this.dom.formTitle.textContent = "Edit Tag";
        this.dom.btnSubmit.textContent = "Save Changes";
        this.dom.btnCancelEdit.classList.remove('hidden');
        
        // Re-render list to show active highlight
        this.renderList(); 
    }

    _resetForm() {
        this.editingTagId = null;
        this.dom.inputName.value = '';
        this.dom.formTitle.textContent = "Add New Tag";
        this.dom.btnSubmit.textContent = "Add Tag";
        this.dom.btnCancelEdit.classList.add('hidden');
        
        // Reset color to default green
        this.pendingColor = '#10b981';
        this._updateColorPreview(this.pendingColor);
        
        // Remove highlights
        this.renderList();
    }

    _updateColorPreview(color) {
        this.dom.previewDot.style.backgroundColor = color;
        this.dom.previewText.textContent = color;
    }

    _confirmDelete(tag) {
        this.dom.deleteName.textContent = tag.name;
        this.dom.modalDelete.classList.remove('hidden');

        // Clean event listeners by cloning
        const newBtn = this.dom.deleteConfirm.cloneNode(true);
        this.dom.deleteConfirm.parentNode.replaceChild(newBtn, this.dom.deleteConfirm);
        this.dom.deleteConfirm = newBtn;

        newBtn.addEventListener('click', () => {
            if (this.onDelete) this.onDelete(tag.id);
            this.dom.modalDelete.classList.add('hidden');
            // If we deleted the tag currently being edited, reset the form
            if (this.editingTagId === tag.id) this._resetForm();
        });
    }

    destroy() {
        const modals = ['tag-ui-modal-manage', 'tag-ui-modal-color', 'tag-ui-modal-delete'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });
        if (this.colorPicker && typeof this.colorPicker.destroy === 'function') {
            this.colorPicker.destroy();
        }
        this.dom = {};
    }
}