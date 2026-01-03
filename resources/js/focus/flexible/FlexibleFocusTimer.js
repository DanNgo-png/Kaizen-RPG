import { flexManager } from "./FlexibleFocusManager.js";
import { FlexibleTimerUI } from "./FlexibleTimerUI.js";
import { FocusAPI } from "../../api/FocusAPI.js";

class FocusTimerController {
    constructor() {
        this.ui = new FlexibleTimerUI();

        // --- Local UI State (Management) ---
        this.cachedTags = []; 
        this.editingTagId = null; 
        this.pendingColor = '#10b981'; 

        // 1. Initialize Event Listeners (Buttons, Modals, Menus)
        this.initEventListeners();

        // 2. Initialize Data (Tags)
        this.initData();

        // 3. Sync UI with current Global State immediately
        // (This handles the case where you return to the page while a timer is running)
        this.syncWithGlobalState();
    }

    initData() {
        // Listen for tag updates from backend
        Neutralino.events.on("receiveTags", (evt) => {
            this.cachedTags = evt.detail;
            this.ui.renderTagList(this.cachedTags);
            
            // If manage modal is open, refresh that list too
            const manageModal = document.getElementById('manage-tags-modal');
            if(manageModal && !manageModal.classList.contains('hidden')) {
                this.refreshManageList();
            }
        });
        
        // Fetch initial list
        FocusAPI.getTags();
    }

    /**
     * Updates the UI based on the Manager's existing state on page load.
     */
    syncWithGlobalState() {
        const stats = flexManager.getStats();
        
        // Update Time Displays
        this.ui.updateStatsDisplay(stats);
        
        // Update Visual State (Colors, Icons)
        this.ui.updateVisualState(stats.status);
        
        // Update Dropdown Labels
        this.ui.dom.displays.ratio.textContent = `${stats.ratio}:1`; // Simplified label update
        this.ui.updateTagListSelection(stats.tag);

        // Update Ratio Menu Selection Visuals
        const ratioOpts = this.ui.dom.menus.ratio.querySelectorAll('.ratio-opt');
        ratioOpts.forEach(opt => {
            if(parseFloat(opt.dataset.value) === stats.ratio) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    initEventListeners() {
        // --- 1. Global Tick Listener ---
        // The manager fires this event every second. We update the UI in response.
        this.boundTickHandler = (e) => this.ui.updateStatsDisplay(e.detail);
        document.addEventListener('kaizen:flex-tick', this.boundTickHandler);

        // --- 2. Cleanup (MutationObserver) ---
        // Detect when this page is removed from DOM (navigation) and remove listeners
        const cleanupObserver = new MutationObserver((mutations) => {
            if(!document.body.contains(this.ui.dom.displays.focus)) {
                document.removeEventListener('kaizen:flex-tick', this.boundTickHandler);
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        // --- 3. Main Controls ---
        
        this.ui.dom.buttons.main.addEventListener('click', () => {
            const currentStatus = flexManager.getStats().status;
            if (currentStatus === 'idle' || currentStatus === 'break') {
                flexManager.switchState('focus');
                this.ui.updateSessionStartTime(new Date()); 
            } else {
                flexManager.switchState('break');
            }
            // Update UI immediately for responsiveness
            this.ui.updateVisualState(flexManager.getStats().status);
        });

        this.ui.dom.buttons.finish.addEventListener('click', () => {
            flexManager.stopTicker(); // Pause timer while user reviews
            this.ui.populateModal('conclusion', flexManager.getStats());
            this.ui.toggleModal('conclusion', true);
        });

        // --- 4. Ratio Menu ---
        this.ui.dom.buttons.ratioTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this.ui.dom.menus.ratio.classList.contains('open');
            this.ui.toggleMenu('ratio', !isOpen);
            if (!isOpen) this.ui._setupOutsideClick('ratio');
        });

        this.ui.dom.menus.ratio.addEventListener('click', (e) => {
            const target = e.target.closest('.ratio-opt');
            if (target) {
                const val = target.dataset.value;
                const label = target.dataset.label;
                
                flexManager.setRatio(val); // Update Global Manager
                
                this.ui.dom.displays.ratio.textContent = label;
                this.ui.dom.menus.ratio.querySelectorAll('.ratio-opt').forEach(o => o.classList.remove('selected'));
                target.classList.add('selected');
                this.ui.toggleMenu('ratio', false);
            }
        });

        // --- 5. Tag Menu ---
        this.ui.dom.buttons.tagTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this.ui.dom.menus.tag.classList.contains('open');
            this.ui.toggleMenu('tag', !isOpen);
            if (!isOpen) this.ui._setupOutsideClick('tag');
        });

        this.ui.dom.menus.tagList.addEventListener('click', (e) => {
            const target = e.target.closest('.tag-opt');
            if (target) {
                const tag = target.dataset.value;
                flexManager.setTag(tag); // Update Global Manager
                this.ui.updateTagListSelection(tag);
                this.ui.toggleMenu('tag', false);
            }
        });

        // --- 6. Exception Modal (Manual Adjustments) ---
        const btnException = document.getElementById('btn-log-exception');
        if (btnException) {
            btnException.addEventListener('click', () => {
                // Populate with current live stats
                this.ui.populateModal('exception', flexManager.getStats());
                this.ui.toggleModal('exception', true);
            });
        }

        document.getElementById('btn-exc-apply').addEventListener('click', () => {
            const f = parseInt(document.getElementById('exc-focus-input').value) || 0;
            const b = parseInt(document.getElementById('exc-break-input').value) || 0;
            
            // Send adjustments to manager (minutes -> ms)
            flexManager.adjustTotals(f * 60000, b * 60000);
            
            this.ui.toggleModal('exception', false);
        });

        document.getElementById('btn-exc-cancel').addEventListener('click', () => {
            this.ui.toggleModal('exception', false);
        });

        // --- 7. Conclusion Modal ---
        document.getElementById('btn-conclude-save').addEventListener('click', () => this.handleCommitSession());
        
        document.getElementById('btn-conclude-cancel').addEventListener('click', () => {
            this.ui.toggleModal('conclusion', false);
            flexManager.startTicker(); // Resume if cancelled
        });

        // --- 8. Management Logic (Tags / Colors) ---
        this.setupManagementEvents();
        
        // Bind Sliders for Conclusion Modal
        this._bindSliderInput('conclude-focus-slider', 'conclude-focus-input', '#438e66');
        this._bindSliderInput('conclude-break-slider', 'conclude-break-input', '#5b85b7');
    }

    handleCommitSession() {
        const focusVal = document.getElementById('conclude-focus-input').value;
        const breakVal = document.getElementById('conclude-break-input').value;

        // Helper to parse "MM:SS" or raw number to seconds
        const parseToSeconds = (val) => {
            if(typeof val === 'number') return val;
            if(val.includes(':')) {
                const parts = val.split(':').map(Number);
                let seconds = 0;
                if(parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2]; // HH:MM:SS
                else if(parts.length === 2) seconds = (parts[0] * 60) + parts[1]; // MM:SS
                return seconds;
            }
            return parseInt(val) || 0;
        };

        const fSec = parseToSeconds(focusVal);
        const bSec = parseToSeconds(breakVal);

        // Commit to DB via Manager (handles saving and resetting)
        flexManager.commitSession(fSec, bSec); 

        this.ui.resetUI();
        this.ui.toggleModal('conclusion', false);
    }

    // =========================================================
    // MANAGEMENT LOGIC (Tags, Colors, Modals)
    // =========================================================

    setupManagementEvents() {
        // Open Manage Modal
        const btnManage = document.getElementById('btn-open-manage-tags');
        if(btnManage) {
            btnManage.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ui.toggleMenu('tag', false);
                this.resetManageForm();
                this.refreshManageList();
                document.getElementById('manage-tags-modal').classList.remove('hidden');
            });
        }

        // Close Manage Modal
        document.getElementById('btn-close-manage-tags').addEventListener('click', () => {
            document.getElementById('manage-tags-modal').classList.add('hidden');
        });

        // Submit (Add or Edit)
        document.getElementById('btn-submit-tag').addEventListener('click', () => {
            const nameInput = document.getElementById('manage-tag-name');
            const name = nameInput.value.trim();
            if(!name) return;

            if (this.editingTagId) {
                FocusAPI.updateTag(this.editingTagId, name, this.pendingColor);
            } else {
                FocusAPI.saveTag(name, this.pendingColor);
            }
            this.resetManageForm();
        });

        // Cancel Edit Mode
        document.getElementById('btn-cancel-edit-tag').addEventListener('click', () => {
            this.resetManageForm();
        });

        // --- COLOR PICKER ---
        document.getElementById('btn-open-color-picker').addEventListener('click', () => {
            this.openColorPicker();
        });

        document.getElementById('btn-confirm-color').addEventListener('click', () => {
            this.updateColorPreview(this.pendingColor);
            document.getElementById('color-picker-overlay').classList.add('hidden');
        });

        document.getElementById('btn-cancel-color').addEventListener('click', () => {
            document.getElementById('color-picker-overlay').classList.add('hidden');
        });

        // Opacity Slider
        document.getElementById('color-opacity').addEventListener('input', (e) => {
            const opacity = e.target.value;
            document.getElementById('opacity-val').textContent = `${opacity}%`;
            this.updatePendingColorAlpha(opacity);
        });

        // Color Presets
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');
                
                const hex = e.target.dataset.color;
                document.getElementById('custom-hex-input').value = hex;
                
                const opacity = document.getElementById('color-opacity').value;
                this.pendingColor = this.hexToRgba(hex, opacity);
            });
        });

        // Hex Input
        document.getElementById('custom-hex-input').addEventListener('input', (e) => {
            const hex = e.target.value;
            // Basic hex validation
            if(/^#[0-9A-F]{6}$/i.test(hex)) {
                const opacity = document.getElementById('color-opacity').value;
                this.pendingColor = this.hexToRgba(hex, opacity);
            }
        });
    }

    refreshManageList() {
        this.ui.renderManageList(this.cachedTags, 
            (tag) => this.loadTagForEditing(tag), // On Select
            (id) => FocusAPI.deleteTag(id)        // On Delete
        );
    }

    loadTagForEditing(tag) {
        this.editingTagId = tag.id;
        
        // Update Form UI
        document.getElementById('manage-form-title').textContent = "Edit Tag";
        document.getElementById('btn-submit-tag').textContent = "Submit Edit";
        document.getElementById('btn-cancel-edit-tag').classList.remove('hidden');
        document.getElementById('manage-tag-name').value = tag.name;
        
        // Setup Color
        this.pendingColor = tag.color || '#10b981';
        this.updateColorPreview(this.pendingColor);
    }

    resetManageForm() {
        this.editingTagId = null;
        
        // Reset Form UI
        document.getElementById('manage-form-title').textContent = "Add New Tag";
        document.getElementById('btn-submit-tag').textContent = "Add Tag";
        document.getElementById('btn-cancel-edit-tag').classList.add('hidden');
        document.getElementById('manage-tag-name').value = '';
        
        // Reset Selection Visual
        const activeItem = document.querySelector('.manage-tag-item.active');
        if(activeItem) activeItem.classList.remove('active');

        // Reset Color (Default Green 70%)
        this.pendingColor = this.hexToRgba('#10b981', 70); 
        this.updateColorPreview(this.pendingColor);
    }

    openColorPicker() {
        const modal = document.getElementById('color-picker-overlay');
        modal.classList.remove('hidden');
        
        // Reset Inputs to default state
        document.getElementById('color-opacity').value = 70;
        document.getElementById('opacity-val').textContent = '70%';
        document.getElementById('custom-hex-input').value = '#10b981';
    }

    updateColorPreview(colorStr) {
        document.getElementById('color-preview-dot').style.backgroundColor = colorStr;
        document.getElementById('color-preview-text').textContent = colorStr;
    }

    updatePendingColorAlpha(opacity) {
        let hex = document.getElementById('custom-hex-input').value;
        if(!/^#[0-9A-F]{6}$/i.test(hex)) hex = '#10b981'; // Fallback
        this.pendingColor = this.hexToRgba(hex, opacity);
    }

    hexToRgba(hex, opacity) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        const alpha = opacity / 100;
        
        return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : hex;
    }

    _bindSliderInput(sliderId, inputId, color) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if(!slider || !input) return;

        const updateFill = () => {
            const val = parseInt(slider.value) || 0;
            const max = parseInt(slider.max) || 100;
            const percentage = max > 0 ? (val / max) * 100 : 0;
            slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #333 ${percentage}%, #333 100%)`;
        };

        slider.addEventListener('input', (e) => {
            const seconds = parseInt(e.target.value);
            input.value = this.ui._formatTime(seconds * 1000, false);
            updateFill();
        });

        input.addEventListener('change', (e) => {
            const val = e.target.value;
            let seconds = 0;

            if (val.includes(':')) {
                const parts = val.split(':').reverse();
                seconds += parseInt(parts[0] || 0);
                seconds += (parseInt(parts[1] || 0) * 60);
                seconds += (parseInt(parts[2] || 0) * 3600);
            } else {
                seconds = parseInt(val) || 0;
            }

            if (seconds > parseInt(slider.max)) seconds = parseInt(slider.max);
            
            slider.value = seconds;
            input.value = this.ui._formatTime(seconds * 1000, false);
            updateFill();
        });
    }
}

export function initFlexibleFocusTimer() {
    new FocusTimerController();
}