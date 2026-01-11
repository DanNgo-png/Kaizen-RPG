import { initTodoList, renderTasks } from "../../plans/todoListManager.js";
import { initKanbanBoard, renderKanbanView } from "../../plans/kanbanManager.js";

export class FocusOverlayManager {
    constructor() {
        this.dom = {
            btnOpen: document.getElementById('btn-open-todo-modal'),
            overlay: document.getElementById('todo-overlay'),
            btnClose: document.getElementById('btn-close-todo-modal'),
            tabButtons: document.querySelectorAll('.modal-tab-btn'),
            tabContents: document.querySelectorAll('.tab-content')
        };
    }

    init() {
        if (!this.dom.btnOpen || !this.dom.overlay) return;

        this._bindEvents();
    }

    _bindEvents() {
        this.dom.btnOpen.addEventListener('click', () => {
            this.dom.overlay.classList.remove('hidden');
            this._initializeContent();
        });

        this.dom.btnClose.addEventListener('click', () => {
            this.dom.overlay.classList.add('hidden');
        });

        this.dom.overlay.addEventListener('click', (e) => {
            if (e.target === this.dom.overlay) this.dom.overlay.classList.add('hidden');
        });

        this.dom.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this._handleTabClick(btn));
        });
    }

    _initializeContent() {
        initTodoList();
        initKanbanBoard();
        
        // Listen for updates specifically for this overlay
        Neutralino.events.off('receiveTasks', this._handleTaskData);
        Neutralino.events.on('receiveTasks', this._handleTaskData);
    }

    _handleTaskData(e) {
        const tasks = e.detail;
        if (typeof renderTasks === 'function') renderTasks(tasks);
        if (typeof renderKanbanView === 'function') renderKanbanView(tasks);
    }

    _handleTabClick(clickedBtn) {
        this.dom.tabButtons.forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        
        const targetId = clickedBtn.getAttribute('data-tab');
        this.dom.tabContents.forEach(content => {
            if (content.id === targetId) content.classList.add('active');
            else content.classList.remove('active');
        });
    }
}