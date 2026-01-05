import { flexManager } from "./FlexibleFocusManager.js";
import { FlexibleTimerUI } from "./FlexibleTimerUI.js";
import { TagUIManager } from "../../components/TagUIManager.js";

class FocusTimerController {
    constructor() {
        this.ui = new FlexibleTimerUI();
        
        // Delegate all tag logic to the UI Manager
        this.tagManager = new TagUIManager({
            triggerId: 'tag-trigger',
            displayId: 'tag-display',
            initialTag: flexManager.getStats().tag, 
            defaultTag: "Flexible", 
            onTagSelected: (tagName) => {
                flexManager.setTag(tagName);
            }
        });
        
        // 1. Initialize Event Listeners
        this.initEventListeners();

        // 2. Sync UI
        this.syncWithGlobalState();
    }

    syncWithGlobalState() {
        const stats = flexManager.getStats();
        this.ui.updateStatsDisplay(stats);
        this.ui.updateVisualState(stats.status);
        
        // Update Tag UI via Manager
        this.tagManager.selectTag(stats.tag, false);

        // Find the matching ratio option to get the correct label (e.g., "3:1 Standard")
        const ratioOpts = this.ui.dom.menus.ratio.querySelectorAll('.ratio-opt');
        let activeLabel = `${stats.ratio}:1`; // Fallback

        ratioOpts.forEach(opt => {
            if (parseFloat(opt.dataset.value) === stats.ratio) {
                opt.classList.add('selected');
                activeLabel = opt.dataset.label; // Use the data-label from HTML
            } else {
                opt.classList.remove('selected');
            }
        });

        // Update the display text
        this.ui.dom.displays.ratio.textContent = activeLabel;
    }

    initEventListeners() {
        // --- 1. Global Tick Listener ---
        this.boundTickHandler = (e) => this.ui.updateStatsDisplay(e.detail);
        document.addEventListener('kaizen:flex-tick', this.boundTickHandler);

        // --- 2. Cleanup ---
        const cleanupObserver = new MutationObserver((mutations) => {
            if (!document.body.contains(this.ui.dom.displays.focus)) {
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
            this.ui.updateVisualState(flexManager.getStats().status);
        });

        this.ui.dom.buttons.finish.addEventListener('click', () => {
            flexManager.stopTicker();
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
                flexManager.setRatio(val);
                this.ui.dom.displays.ratio.textContent = label;
                this.ui.dom.menus.ratio.querySelectorAll('.ratio-opt').forEach(o => o.classList.remove('selected'));
                target.classList.add('selected');
                this.ui.toggleMenu('ratio', false);
            }
        });

        // --- 6. Exception Modal ---
        const btnException = document.getElementById('btn-log-exception');
        if (btnException) {
            btnException.addEventListener('click', () => {
                this.ui.populateModal('exception', flexManager.getStats());
                this.ui.toggleModal('exception', true);
            });
        }

        document.getElementById('btn-exc-apply').addEventListener('click', () => {
            const f = parseInt(document.getElementById('exc-focus-input').value) || 0;
            const b = parseInt(document.getElementById('exc-break-input').value) || 0;
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
            flexManager.startTicker();
        });
    }

    handleCommitSession() {
        const focusVal = document.getElementById('conclude-focus-input').value;
        const breakVal = document.getElementById('conclude-break-input').value;

        const parseToSeconds = (val) => {
            if (typeof val === 'number') return val;
            if (val.includes(':')) {
                const parts = val.split(':').map(Number);
                let seconds = 0;
                if (parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                else if (parts.length === 2) seconds = (parts[0] * 60) + parts[1];
                return seconds;
            }
            return parseInt(val) || 0;
        };

        const fSec = parseToSeconds(focusVal);
        const bSec = parseToSeconds(breakVal);

        flexManager.commitSession(fSec, bSec);

        this.ui.resetUI();
        this.ui.toggleModal('conclusion', false);
        
        // Reset tag to default if needed or keep last used
        // this.tagManager.selectTag("Standard"); 
    }
}

export function initFlexibleFocusTimer() {
    new FocusTimerController();
}