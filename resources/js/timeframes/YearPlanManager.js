import { EXTENSION_ID } from "../api/_extension_id.js";

export class YearPlanManager {
    constructor() {
        this.currentDate = new Date();
        this.viewYear = this.currentDate.getFullYear();

        this.dom = {
            yearTitle: document.getElementById('year-title-text'),
            pillarsList: document.getElementById('year-pillars-list'),
            quartersGrid: document.getElementById('year-quarters-grid'),
            btnAddPillar: document.getElementById('btn-add-pillar'),
            modal: document.getElementById('modal-add-pillar'),
            inputPillar: document.getElementById('input-pillar-title'),
            btnSave: document.getElementById('btn-save-pillar'),
            btnCancel: document.getElementById('btn-cancel-pillar')
        };

        // Bind handler once so it can be added/removed cleanly
        this.handleData = (e) => this.render(e.detail);

        this.init();
    }

    init() {
        // Listener Management
        Neutralino.events.off('receiveYearPlanData', this.handleData);
        Neutralino.events.on('receiveYearPlanData', this.handleData);

        // Modal Logic
        if(this.dom.btnAddPillar) {
            // Remove old listener to be safe if init called multiple times (though constructor check handles most)
            const newBtn = this.dom.btnAddPillar.cloneNode(true);
            this.dom.btnAddPillar.parentNode.replaceChild(newBtn, this.dom.btnAddPillar);
            this.dom.btnAddPillar = newBtn;

            this.dom.btnAddPillar.addEventListener('click', () => {
                this.dom.inputPillar.value = '';
                this.dom.modal.classList.remove('hidden');
                this.dom.inputPillar.focus();
            });
        }

        if(this.dom.btnCancel) {
            this.dom.btnCancel.onclick = () => this.dom.modal.classList.add('hidden');
        }

        if(this.dom.btnSave) {
            // Prevent stacking listeners on Save button
            const newSave = this.dom.btnSave.cloneNode(true);
            this.dom.btnSave.parentNode.replaceChild(newSave, this.dom.btnSave);
            this.dom.btnSave = newSave;

            this.dom.btnSave.addEventListener('click', () => {
                const title = this.dom.inputPillar.value.trim();
                if(!title) return;

                Neutralino.extensions.dispatch(EXTENSION_ID, "addTimeframeGoal", {
                    title: title,
                    type: 'pillar',
                    key: this.viewYear.toString()
                });
                this.dom.modal.classList.add('hidden');
            });
        }

        this.fetchData();
    }

    fetchData() {
        Neutralino.extensions.dispatch(EXTENSION_ID, "getYearPlanData", { year: this.viewYear });
    }

    render(data) {
        if (!data) return;
        
        if (this.dom.yearTitle) this.dom.yearTitle.textContent = data.year;
        
        this.renderPillars(data.pillars);
        this.renderQuarters(data.quarters);
    }

    renderPillars(pillars) {
        if (!this.dom.pillarsList) return;
        this.dom.pillarsList.innerHTML = '';

        if (pillars.length === 0) {
            this.dom.pillarsList.innerHTML = `<div style="opacity:0.5; font-style:italic; font-size:0.9rem;">No pillars defined.</div>`;
            return;
        }

        pillars.forEach(p => {
            const iconClass = 'fa-solid fa-star'; // Placeholder
            const colorClass = 'p-blue';

            const el = document.createElement('div');
            el.className = 'pillar-card';
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <div class="pillar-icon ${colorClass}"><i class="${iconClass}"></i></div>
                    <div class="pillar-content">
                        <h4>${p.title}</h4>
                        <span>${p.status === 'done' ? 'Achieved' : 'Ongoing'}</span>
                    </div>
                </div>
                <button class="btn-delete-pillar" style="background:transparent; border:none; color:#ef4444; cursor:pointer; opacity:0.6;"><i class="fa-solid fa-trash"></i></button>
            `;

            el.querySelector('.btn-delete-pillar').addEventListener('click', () => {
                if(confirm(`Remove pillar "${p.title}"?`)) {
                    Neutralino.extensions.dispatch(EXTENSION_ID, "deleteTimeframeGoal", { 
                        id: p.id, 
                        context: 'year', 
                        key: this.viewYear.toString() 
                    });
                }
            });

            this.dom.pillarsList.appendChild(el);
        });
    }

    renderQuarters(quarters) {
        const container = this.dom.quartersGrid;
        if(!container) return;
        container.innerHTML = '';
        
        // Loop 1-4
        for(let i=1; i<=4; i++) {
            const q = quarters[i];
            const el = document.createElement('div');
            
            // Determine visual state based on current date
            const currentQ = Math.floor(new Date().getMonth() / 3) + 1;
            const currentY = new Date().getFullYear();
            let cardClass = 'quarter-card';
            
            if (this.viewYear < currentY || (this.viewYear === currentY && i < currentQ)) {
                cardClass += ' past';
            } else if (this.viewYear === currentY && i === currentQ) {
                cardClass += ' current';
            }

            el.className = cardClass;
            
            let goalsHtml = '';
            if(q.goals.length > 0) {
                q.goals.forEach(g => {
                    const icon = g.status === 'done' ? 'fa-regular fa-square-check' : 'fa-regular fa-square';
                    goalsHtml += `<div class="qc-goal ${g.status === 'done'?'done':'active'}"><i class="${icon}"></i> ${g.title}</div>`;
                });
            } else {
                goalsHtml = `<div class="qc-goal fail" style="opacity:0.5">No objectives</div>`;
            }

            el.innerHTML = `
                <div class="qc-header">
                    <span class="qc-title">${q.title}</span>
                </div>
                <div class="qc-goals">${goalsHtml}</div>
            `;
            container.appendChild(el);
        }
    }
}

export function initYearPlan() {
    new YearPlanManager();
}