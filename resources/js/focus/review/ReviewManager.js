import { FocusAPI } from "../../api/FocusAPI.js";
import { SettingsAPI } from "../../api/SettingsAPI.js";
import { loadPage } from "../../router.js";
import { initFocusTimer } from "../standard/StandardFocusTimer.js";
import { initFlexibleFocusTimer } from "../flexible/FlexibleFocusTimer.js";

// Helper: robustly format Local Date to SQL String (YYYY-MM-DD HH:MM:SS)
const formatToLocalSQL = (d) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export class ReviewManager {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        
        // Remove time component to lock to Midnight Local Time
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
            modalChoose: document.getElementById('modal-choose-timer'), 
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
        const btnCancelDelete = document.getElementById('btn-cancel-delete');
        if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => this.toggleModal('delete', false));
        
        const btnConfirmDelete = document.getElementById('btn-confirm-delete');
        if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', () => this.executeDelete());

        // Edit Modal Actions
        const btnCancelEdit = document.getElementById('btn-cancel-edit');
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => this.toggleModal('edit', false));
        
        const btnSaveEdit = document.getElementById('btn-save-edit');
        if (btnSaveEdit) btnSaveEdit.addEventListener('click', () => this.executeEdit());

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
        // CHANGED: Listen to specific event for Review Page to avoid data pollution
        Neutralino.events.on('receiveReviewData', (e) => this.renderList(e.detail));
        
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

    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        this.loadDate(this.currentDate);
    }

    loadDate(date) {
        this.updateHeaderUI(date);
        
        // Explicitly set start to 00:00:00.000
        const start = new Date(date);
        start.setHours(0,0,0,0);
        
        // Explicitly set end to 23:59:59.999
        const end = new Date(date);
        end.setHours(23,59,59,999);

        // Use the new robust formatter
        const startStr = formatToLocalSQL(start);
        const endStr = formatToLocalSQL(end);
        
        // CHANGED: Pass 3rd arg 'receiveReviewData' for namespacing
        FocusAPI.getFocusSessions(startStr, endStr, 'receiveReviewData');
    }

    updateHeaderUI(date) {
        const isToday = date.getTime() === this.today.getTime();
        this.dom.dateDisplay.textContent = isToday ? "Today" : date.toLocaleDateString('en-US', { weekday: 'long' });
        this.dom.fullDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        this.dom.btnNext.disabled = isToday; 
        this.dom.btnToday.classList.toggle('hidden', isToday);
    }

    renderList(sessions) {
        if (!this.dom.list) return;
        this.dom.list.innerHTML = '';
        
        // Calc Stats
        let totalSecs = 0;
        sessions.forEach(s => totalSecs += s.focus_seconds);
        
        // Update Stats UI
        if (this.dom.statCount) this.dom.statCount.textContent = sessions.length;
        if (this.dom.statTime) this.dom.statTime.textContent = this.formatDuration(totalSecs);
        this.checkGoal(totalSecs);

        if (sessions.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Render Items
        sessions.forEach(session => {
            const el = document.createElement('div');
            el.className = 'session-card';
            
            // Handle date parsing safely
            const localString = session.created_at.replace(' ', 'T');
            const dateObj = new Date(localString);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const durationStr = this.formatDuration(session.focus_seconds);
            const tagColor = this.getTagColor(session.tag);

            // Determine Icon based on timer_type
            let typeIcon = '<i class="fa-regular fa-clock" title="Standard Timer"></i>';
            if (session.timer_type === 'flexible') {
                typeIcon = '<i class="fa-solid fa-stopwatch" title="Flexible Timer"></i>';
            } else if (session.timer_type === 'stopwatch') {
                typeIcon = '<i class="fa-solid fa-hourglass-half" title="Stopwatch"></i>';
            }

            el.innerHTML = `
                <div class="session-left">
                    <span class="s-type-icon" style="margin-right: 15px; color: #6b7280; font-size: 1.1rem; width: 20px; text-align: center;">
                        ${typeIcon}
                    </span>
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