import { FocusAPI } from "../../api/FocusAPI.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { loadPage } from "../../router.js";
import { initFocusTimer } from "../standard/StandardFocusTimer.js";
import { initFlexibleFocusTimer } from "../flexible/FlexibleFocusTimer.js";

export class ReviewManager {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        
        // Remove time component
        this.today.setHours(0,0,0,0);
        this.currentDate.setHours(0,0,0,0);

        this.tags = [];
        this.currentSessionId = null;
        
        // Default setting (fallback)
        this.startSessionTarget = 'standard'; 

        // Cache DOM
        this.dom = {
            dateDisplay: document.getElementById('display-date'),
            fullDate: document.getElementById('display-full-date'),
            btnPrev: document.getElementById('btn-prev-day'),
            btnNext: document.getElementById('btn-next-day'),
            btnToday: document.getElementById('btn-today-shortcut'),
            list: document.getElementById('session-list'),
            // Stats
            statTime: document.getElementById('stat-total-time'),
            statCount: document.getElementById('stat-count'),
            statGoal: document.getElementById('stat-goal-status'),
            // Modals
            modalEdit: document.getElementById('modal-edit-session'),
            modalDelete: document.getElementById('modal-delete-session'),
            modalChoose: document.getElementById('modal-choose-timer'), // New
            tagSelect: document.getElementById('edit-session-tag-select')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupListeners();
        
        // Load initial data
        FocusAPI.getTags(); 
        SettingsAPI.getSetting('dailyGoal'); 
        SettingsAPI.getSetting('reviewStartSessionTarget'); // Request setting
        
        this.loadDate(this.currentDate);
    }

    bindEvents() {
        this.dom.btnPrev.addEventListener('click', () => this.changeDate(-1));
        this.dom.btnNext.addEventListener('click', () => this.changeDate(1));
        this.dom.btnToday.addEventListener('click', () => {
            this.currentDate = new Date(this.today);
            this.loadDate(this.currentDate);
        });

        // Delete Modal Actions
        document.getElementById('btn-cancel-delete').addEventListener('click', () => this.toggleModal('delete', false));
        document.getElementById('btn-confirm-delete').addEventListener('click', () => this.executeDelete());

        // Edit Modal Actions
        document.getElementById('btn-cancel-edit').addEventListener('click', () => this.toggleModal('edit', false));
        document.getElementById('btn-save-edit').addEventListener('click', () => this.executeEdit());

        // Choose Timer Modal Actions
        if (this.dom.modalChoose) {
            document.getElementById('btn-cancel-choose').addEventListener('click', () => this.toggleModal('choose', false));
            
            document.getElementById('btn-choose-standard').addEventListener('click', async () => {
                this.toggleModal('choose', false);
                await loadPage('./pages/focus/focus-standard.html');
                initFocusTimer();
            });

            document.getElementById('btn-choose-flexible').addEventListener('click', async () => {
                this.toggleModal('choose', false);
                await loadPage('./pages/focus/focus-flexible.html');
                initFlexibleFocusTimer();
            });
        }
    }

    setupListeners() {
        // Data Received
        Neutralino.events.on('receiveFocusSessions', (e) => this.renderList(e.detail));
        
        // Tags Received
        Neutralino.events.on('receiveTags', (e) => {
            this.tags = e.detail;
            this.populateTagSelect();
        });

        // Setting Received
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'reviewStartSessionTarget') {
                this.startSessionTarget = e.detail.value || 'standard';
            }
        });

        // Operation Confirmations -> Reload Data
        Neutralino.events.on('focusSessionUpdated', () => this.loadDate(this.currentDate));
        Neutralino.events.on('focusSessionDeleted', () => {
            this.toggleModal('delete', false);
            this.loadDate(this.currentDate);
        });
    }

    // ... existing date change methods ...
    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        this.loadDate(this.currentDate);
    }

    loadDate(date) {
        this.updateHeaderUI(date);
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);
        const toSQL = (d) => d.toISOString().replace('T', ' ').split('.')[0];
        FocusAPI.getFocusSessions(toSQL(start), toSQL(end));
    }

    updateHeaderUI(date) {
        const isToday = date.getTime() === this.today.getTime();
        this.dom.dateDisplay.textContent = isToday ? "Today" : date.toLocaleDateString('en-US', { weekday: 'long' });
        this.dom.fullDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        this.dom.btnNext.disabled = isToday; 
        this.dom.btnToday.classList.toggle('hidden', isToday);
    }

    renderList(sessions) {
        this.dom.list.innerHTML = '';
        
        // Calc Stats
        let totalSecs = 0;
        sessions.forEach(s => totalSecs += s.focus_seconds);
        
        // Update Stats UI
        this.dom.statCount.textContent = sessions.length;
        this.dom.statTime.textContent = this.formatDuration(totalSecs);
        this.checkGoal(totalSecs);

        if (sessions.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Render Items
        sessions.forEach(session => {
            const el = document.createElement('div');
            el.className = 'session-card';
            
            const utcString = session.created_at.replace(' ', 'T') + 'Z';
            const dateObj = new Date(utcString);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const durationStr = this.formatDuration(session.focus_seconds);
            const tagColor = this.getTagColor(session.tag);

            el.innerHTML = `
                <div class="session-left">
                    <span class="s-time">${timeStr}</span>
                    <span class="s-duration">${durationStr}</span>
                    <div class="s-tag-badge">
                        <div class="s-tag-dot" style="background-color: ${tagColor}"></div>
                        ${session.tag}
                    </div>
                </div>
                <div class="session-actions">
                    <button class="btn-action-icon edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-action-icon delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            el.querySelector('.edit').addEventListener('click', () => this.openEditModal(session));
            el.querySelector('.delete').addEventListener('click', () => this.openDeleteModal(session));

            this.dom.list.appendChild(el);
        });
    }

    renderEmptyState() {
        const div = document.createElement('div');
        div.className = 'empty-history';
        div.innerHTML = `
            <i class="fa-solid fa-wind"></i>
            <h3>No Focus Recorded</h3>
            <p>You haven't logged any sessions for this day.</p>
            <button class="btn-start-focus">Start Session</button>
        `;

        div.querySelector('.btn-start-focus').addEventListener('click', async () => {
            this.handleStartSessionClick();
        });

        this.dom.list.appendChild(div);
    }

    async handleStartSessionClick() {
        const target = this.startSessionTarget;

        if (target === 'ask') {
            this.toggleModal('choose', true);
        } else if (target === 'flexible') {
            await loadPage('./pages/focus/focus-flexible.html');
            initFlexibleFocusTimer();
        } else {
            // Default to Standard
            await loadPage('./pages/focus/focus-standard.html');
            initFocusTimer();
        }
    }

    // --- Actions ---

    openEditModal(session) {
        this.currentSessionId = session.id;
        this.dom.tagSelect.value = session.tag;
        this.toggleModal('edit', true);
    }

    executeEdit() {
        const newTag = this.dom.tagSelect.value;
        if(this.currentSessionId) {
            FocusAPI.updateSession(this.currentSessionId, newTag);
            this.toggleModal('edit', false);
        }
    }

    openDeleteModal(session) {
        this.currentSessionId = session.id;
        this.toggleModal('delete', true);
    }

    executeDelete() {
        if(this.currentSessionId) {
            FocusAPI.deleteSession(this.currentSessionId);
        }
    }

    // --- Helpers ---

    toggleModal(type, show) {
        let modal;
        if (type === 'edit') modal = this.dom.modalEdit;
        else if (type === 'delete') modal = this.dom.modalDelete;
        else if (type === 'choose') modal = this.dom.modalChoose;

        if (modal) modal.classList.toggle('hidden', !show);
    }

    populateTagSelect() {
        this.dom.tagSelect.innerHTML = '';
        const stdOpt = document.createElement('option');
        stdOpt.value = 'Standard';
        stdOpt.textContent = 'Standard';
        this.dom.tagSelect.appendChild(stdOpt);

        this.tags.forEach(t => {
            if (t.name === 'Standard') return;
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.textContent = t.name;
            this.dom.tagSelect.appendChild(opt);
        });
    }

    getTagColor(tagName) {
        const tag = this.tags.find(t => t.name === tagName);
        return tag ? tag.color : '#6b7280'; 
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    checkGoal(totalSecs) {
        const mins = Math.floor(totalSecs / 60);
        if (mins > 0) {
            this.dom.statGoal.textContent = `${mins}m Recorded`;
            this.dom.statGoal.classList.add('text-green');
        } else {
            this.dom.statGoal.textContent = "No Activity";
            this.dom.statGoal.classList.remove('text-green');
        }
    }
}

export function initReviewSessions() {
    new ReviewManager();
}