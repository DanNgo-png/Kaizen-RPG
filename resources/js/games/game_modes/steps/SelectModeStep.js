import { GAME_MODES } from "../data/GameModeList.js";
import { campaignState } from "../logic/CampaignState.js";

export class SelectModeStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.listEl = document.getElementById('mode-list');
        this.detailsEl = document.getElementById('mode-details-content');
        this.glider = null;
    }

    init() {
        this.renderList();
        // Select initial state or default
        this.selectMode(campaignState.get('modeId') || GAME_MODES[0].id);
    }

    renderList() {
        this.listEl.innerHTML = '';
        
        // 1. Glider Animation Element
        this.glider = document.createElement('div');
        this.glider.className = 'mode-list-glider';
        this.listEl.appendChild(this.glider);
        
        // 2. Render Modes
        GAME_MODES.forEach(mode => {
            const el = document.createElement('div');
            el.className = 'mode-list-item';
            el.dataset.id = mode.id;
            
            el.innerHTML = `
                <div class="mode-thumb" style="color: ${mode.color}">
                    <i class="${mode.icon}"></i>
                </div>
                <div class="mode-info">
                    <h4>${mode.title}</h4>
                    <span>${mode.subtitle}</span>
                </div>
            `;

            el.addEventListener('click', () => this.selectMode(mode.id));
            this.listEl.appendChild(el);
        });
    }

    selectMode(id) {
        // Update State
        campaignState.set('modeId', id);
        
        const modeData = GAME_MODES.find(m => m.id === id);

        // UI Updates
        const items = this.listEl.querySelectorAll('.mode-list-item');
        let selectedEl = null;

        items.forEach(el => {
            if (el.dataset.id === id) {
                el.classList.add('active');
                selectedEl = el;
            } else {
                el.classList.remove('active');
            }
        });

        // Move Glider
        if (selectedEl && this.glider) {
            this.glider.style.top = `${selectedEl.offsetTop}px`;
            this.glider.style.height = `${selectedEl.offsetHeight}px`;
        }

        this.renderDetails(modeData);
    }

    renderDetails(mode) {
        if (!mode) return;

        const featuresHtml = mode.features.map(f => `
            <li class="feature-item">
                <i class="${f.icon}" style="color: ${f.color}"></i>
                <span>${f.text}</span>
            </li>
        `).join('');

        this.detailsEl.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon-large" style="color: ${mode.color}">
                    <i class="${mode.icon}"></i>
                </div>
                <h1 class="detail-title">${mode.title}</h1>
                <span class="detail-badge">${mode.badge}</span>
            </div>
            <div class="detail-lore">${mode.lore}</div>
            <div class="detail-section-title">Key Features</div>
            <ul class="feature-list">${featuresHtml}</ul>
        `;
    }

    show() { this.container.classList.remove('hidden'); }
    hide() { this.container.classList.add('hidden'); }
}