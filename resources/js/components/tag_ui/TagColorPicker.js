export class TagColorPicker {
    constructor(modalElement, { onSelect, onCancel }) {
        this.modal = modalElement;
        this.onSelect = onSelect;
        this.onCancel = onCancel;
        
        // Internal state
        this.pendingColor = '#10b981'; // Default green
        
        this._cacheDom();
        this._bindEvents();
    }

    _cacheDom() {
        // We scope queries to 'this.modal' to decouple from global document IDs where possible
        this.dom = {
            swatches: this.modal.querySelectorAll('.color-swatch'),
            inputHex: this.modal.querySelector('#tag-ui-hex-input'), // ID from template
            btnConfirm: this.modal.querySelector('#tag-ui-color-confirm'),
            btnCancel: this.modal.querySelector('#tag-ui-color-cancel')
        };
    }

    _bindEvents() {
        // 1. Handle Swatch Clicks
        this.dom.swatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this._setInternalColor(color);
            });
        });

        // 2. Handle Hex Input Changes
        if (this.dom.inputHex) {
            this.dom.inputHex.addEventListener('input', (e) => {
                this.pendingColor = e.target.value;
                // Optional: You could add validation here to check if it's a valid hex
            });
        }

        // 3. Confirm Action
        if (this.dom.btnConfirm) {
            this.dom.btnConfirm.addEventListener('click', () => {
                // Validate final value or fallback
                const finalColor = this.dom.inputHex.value || this.pendingColor;
                if (this.onSelect) this.onSelect(finalColor);
                this.close();
            });
        }

        // 4. Cancel Action
        if (this.dom.btnCancel) {
            this.dom.btnCancel.addEventListener('click', () => {
                if (this.onCancel) this.onCancel();
                this.close();
            });
        }
    }

    _setInternalColor(color) {
        this.pendingColor = color;
        if (this.dom.inputHex) {
            this.dom.inputHex.value = color;
        }
        
        // Visual feedback on swatches
        this.dom.swatches.forEach(s => {
            if (s.dataset.color === color) s.classList.add('selected');
            else s.classList.remove('selected');
        });
    }

    open(currentColor) {
        this._setInternalColor(currentColor || '#10b981');
        this.modal.classList.remove('hidden');
    }

    close() {
        this.modal.classList.add('hidden');
    }

    destroy() {
        this.modal = null;
    }
}