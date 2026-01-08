import { EXTENSION_ID } from "../api/_extension_id.js";

export class QuarterPlanManager {
    constructor() {
        this.currentDate = new Date();
        this.viewYear = this.currentDate.getFullYear();
        this.viewQuarter = Math.floor(this.currentDate.getMonth() / 3) + 1; // 1-4

        this.dom = {
            title: document.getElementById('quarter-title'),
            dateRange: document.getElementById('quarter-date-range'),
            goalsList: document.getElementById('quarter-goals-list'),
            board: document.getElementById('quarter-board-scroll'),
            modal: document.getElementById('modal-add-goal'),
            inputTitle: document.getElementById('input-goal-title'),
            btnAdd: document.getElementById('btn-add-goal'),
            btnSave: document.getElementById('btn-save-goal'),
            btnCancel: document.getElementById('btn-cancel-goal'),
            btnPrev: document.getElementById('btn-prev-q'),
            btnNext: document.getElementById('btn-next-q'),
            progText: document.getElementById('qp-progress-text'),
            progFill: document.getElementById('qp-progress-fill')
        };

        // Bind handler
        this.handleData = (e) => this.render(e.detail);

        this.init();
    }

    init() {
        if (!this.dom.board) return;

        // Clean Navigation Events
        this._bindButton(this.dom.btnPrev, () => this.changeQuarter(-1));
        this._bindButton(this.dom.btnNext, () => this.changeQuarter(1));

        // Clean Modal Events
        this._bindButton(this.dom.btnAdd, () => {
            this.dom.inputTitle.value = '';
            this.dom.modal.classList.remove('hidden');
            this.dom.inputTitle.focus();
        });

        this._bindButton(this.dom.btnCancel, () => this.dom.modal.classList.add('hidden'));

        this._bindButton(this.dom.btnSave, () => {
            const title = this.dom.inputTitle.value.trim();
            if(!title) return;
            
            const key = `${this.viewYear}-Q${this.viewQuarter}`;
            Neutralino.extensions.dispatch(EXTENSION_ID, "addTimeframeGoal", {
                title: title,
                type: 'quarter',
                key: key
            });
            this.dom.modal.classList.add('hidden');
        });

        // Backend Events
        Neutralino.events.off('receiveQuarterData', this.handleData);
        Neutralino.events.on('receiveQuarterData', this.handleData);

        this.loadData();
    }

    _bindButton(elem, handler) {
        if (!elem) return;
        // Clone to strip old listeners
        const newElem = elem.cloneNode(true);
        elem.parentNode.replaceChild(newElem, elem);
        // Update reference
        // Note: For this.dom.btnPrev etc to persist, we need to map keys back or just rely on IDs next time.
        // Since we are in init(), cloning works fine as long as we don't access the old reference later.
        // Better pattern: Re-query or update DOM reference.
        // For brevity in this fix:
        newElem.addEventListener('click', handler);
        
        // Update 'this.dom' reference to point to new element
        // Find which key in dom has this element
        for(let key in this.dom) {
            if(this.dom[key] === elem) this.dom[key] = newElem;
        }
    }

    changeQuarter(delta) {
        this.viewQuarter += delta;
        if (this.viewQuarter > 4) { this.viewQuarter = 1; this.viewYear++; }
        if (this.viewQuarter < 1) { this.viewQuarter = 4; this.viewYear--; }
        this.loadData();
    }

    loadData() {
        const ranges = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];
        this.dom.title.textContent = `Q${this.viewQuarter} ${this.viewYear}`;
        this.dom.dateRange.textContent = ranges[this.viewQuarter - 1];

        Neutralino.extensions.dispatch(EXTENSION_ID, "getQuarterData", { 
            year: this.viewYear, 
            quarter: this.viewQuarter 
        });
    }

    render(data) {
        this.renderGoals(data.goals || []);
    }

    renderGoals(goals) {
        this.dom.goalsList.innerHTML = '';
        
        const total = goals.length;
        const done = goals.filter(g => g.status === 'done').length;
        const pct = total > 0 ? Math.round((done/total)*100) : 0;
        
        if(this.dom.progText) this.dom.progText.textContent = `${pct}%`;
        if(this.dom.progFill) this.dom.progFill.style.width = `${pct}%`;

        if (goals.length === 0) {
            this.dom.goalsList.innerHTML = `<div style="text-align:center; color:#666; margin-top:20px; font-style:italic;">No objectives set for Q${this.viewQuarter}.</div>`;
            return;
        }

        goals.forEach(g => {
            const el = document.createElement('div');
            el.className = 'goal-card';
            const isDone = g.status === 'done';
            
            el.innerHTML = `
                <div class="goal-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="goal-title" style="${isDone ? 'text-decoration:line-through; color:#6b7280;' : ''}">${g.title}</span>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-icon-sm btn-check" style="color:${isDone ? '#10b981' : '#6b7280'}">
                            <i class="fa-solid ${isDone ? 'fa-check-circle' : 'fa-circle'}"></i>
                        </button>
                        <button class="btn-icon-sm btn-delete" style="color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;

            el.querySelector('.btn-check').addEventListener('click', () => {
                const key = `${this.viewYear}-Q${this.viewQuarter}`;
                Neutralino.extensions.dispatch(EXTENSION_ID, "toggleTimeframeGoal", { id: g.id, context: 'quarter', key });
            });

            el.querySelector('.btn-delete').addEventListener('click', () => {
                if(confirm("Delete this objective?")) {
                    const key = `${this.viewYear}-Q${this.viewQuarter}`;
                    Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTimeframeGoal", { id: g.id, context: 'quarter', key });
                }
            });

            this.dom.goalsList.appendChild(el);
        });
    }
}

export function initQuarterView() {
    new QuarterPlanManager();
}