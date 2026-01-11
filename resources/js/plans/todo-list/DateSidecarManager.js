import { CalendarWidget } from "../../components/CalendarWidget.js";

export class DateSidecarManager {
    constructor({ onDateSelect, onRepeatChange }) {
        this.onDateSelect = onDateSelect;
        this.onRepeatChange = onRepeatChange;
        this.calendarWidget = null;
        
        // DOM is cached in init() now
        this.dom = {};
        
        this.init();
    }

    init() {
        this.dom = {
            sidecar: document.getElementById('sidecar-date-picker'),
            btnClose: document.getElementById('btn-close-sidecar'),
            btnToggleRepeat: document.getElementById('btn-toggle-repeat'),
            repeatMenu: document.getElementById('repeat-options-overlay'),
            modalCard: document.getElementById('todo-modal-card') 
        };

        this._bindEvents();
    }

    _bindEvents() {
        if (!this.dom.sidecar) return;

        // Close Button
        if (this.dom.btnClose) {
            this.dom.btnClose.onclick = (e) => {
                e.stopPropagation();
                this.close();
            };
        }
    }

    initWidget(dueDate, repeatRule) {
        // Cleanup old instance
        if (this.calendarWidget) {
            if (typeof this.calendarWidget.destroy === 'function') {
                this.calendarWidget.destroy();
            }
            this.calendarWidget = null;
        }

        // Create new instance
        this.calendarWidget = new CalendarWidget({
            onDateSelect: (dateStr) => {
                this.onDateSelect(dateStr);
            },
            onRepeatChange: (rule) => {
                this.onRepeatChange(rule);
            }
        });

        // Load Data
        this.calendarWidget.loadTaskData(dueDate, repeatRule);
    }

    toggle(triggerElement) {
        if (this.dom.sidecar && this.dom.sidecar.classList.contains('visible')) {
            this.close();
        } else {
            this.open(triggerElement);
        }
    }

    open(triggerElement) {
        if (!this.dom.sidecar || !this.dom.modalCard) return;

        // Positioning Logic
        const cardRect = this.dom.modalCard.getBoundingClientRect();
        
        const topPos = cardRect.top;
        const leftPos = cardRect.right + 15;

        this.dom.sidecar.style.top = `${topPos}px`;
        this.dom.sidecar.style.left = `${leftPos}px`;

        this.dom.sidecar.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            this.dom.sidecar.classList.add('visible');
        });

        if (triggerElement) triggerElement.classList.add('active');
    }

    close() {
        if (!this.dom.sidecar) return;
        
        this.dom.sidecar.classList.remove('visible');
        
        const trigger = document.getElementById('btn-trigger-date-sidecar');
        if(trigger) trigger.classList.remove('active');

        setTimeout(() => {
            if(this.dom.sidecar) this.dom.sidecar.classList.add('hidden');
        }, 200);
    }

    destroy() {
        if (this.calendarWidget && typeof this.calendarWidget.destroy === 'function') {
            this.calendarWidget.destroy();
        }
        this.dom = {};
    }
}