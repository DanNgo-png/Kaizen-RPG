export class TagColorPicker {
    constructor(modalElement, { onSelect, onCancel }) {
        this.modal = modalElement;
        this.onSelect = onSelect;
        this.onCancel = onCancel;
        this.pendingColor = '#10b981';
        
        this._cacheDom();
        this._bindEvents();
    }

    _cacheDom() {
        this.dom = {
            swatches: this.modal.querySelectorAll('.color-swatch'),
            inputHex: this.modal.querySelector('#tag-ui-hex-input'),
            btnConfirm: this.modal.querySelector('#tag-ui-color-confirm'),
            btnCancel: this.modal.querySelector('#tag-ui-color-cancel')
        };
    }

    _bindEvents() {
        // 1. Swatches
        this.dom.swatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this._setInternalColor(color);
            });
        });

        // 2. Hex Input (Manual Entry)
        if (this.dom.inputHex) {
            this.dom.inputHex.addEventListener('input', (e) => {
                let val = e.target.value;
                // Basic Hex validation/format logic could go here
                if (!val.startsWith('#')) val = '#' + val;
                this.pendingColor = val;
                
                // Deselect swatches since manual might not match presets
                this.dom.swatches.forEach(s => s.classList.remove('selected'));
            });
        }

        // 3. Confirm
        if (this.dom.btnConfirm) {
            this.dom.btnConfirm.addEventListener('click', () => {
                // Prefer input value if typed, else pending swatch click
                const finalColor = this.dom.inputHex.value || this.pendingColor;
                if (this.onSelect) this.onSelect(finalColor);
                this.close();
            });
        }

        // 4. Cancel
        if (this.dom.btnCancel) {
            this.dom.btnCancel.addEventListener('click', () => {
                if (this.onCancel) this.onCancel();
                this.close();
            });
        }
    }

    _setInternalColor(color) {
        this.pendingColor = color;
        if (this.dom.inputHex) this.dom.inputHex.value = color;
        
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