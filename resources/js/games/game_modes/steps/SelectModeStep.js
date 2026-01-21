import { GAME_MODES } from "../data/GameModeList.js";
import { campaignState } from "../logic/CampaignState.js";
import { DragLogic } from "./logic/DragLogic.js";
import { SettingsAPI } from "../../../api/SettingsAPI.js";
import { ProfileAPI } from "../../../api/ProfileAPI.js";

export class SelectModeStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.listEl = document.getElementById('mode-list');
        this.detailsEl = document.getElementById('mode-details-content');
        this.glider = null;
        this.sortedModes = [...GAME_MODES];
        this.profileSelect = document.getElementById('select-profile-quick');
        this.cachedProfiles = [];
    }

    init() {
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'gameModesOrder' && e.detail.value) {
                try {
                    const orderIds = JSON.parse(e.detail.value);
                    const currentIds = this.sortedModes.map(m => m.id);
                    if (JSON.stringify(currentIds) !== JSON.stringify(orderIds)) {
                        this.applySortOrder(orderIds);
                        this.renderList();
                    }
                } catch (err) {
                    console.error("Error parsing game modes order:", err);
                }
            }
        });

        this.renderList();
        
        new DragLogic(this.listEl, {
            onReorder: (newOrderIds) => {
                this.applySortOrder(newOrderIds);
                SettingsAPI.saveSetting('gameModesOrder', JSON.stringify(newOrderIds));
            },
            onDragStart: () => {
                if (this.glider) this.glider.style.opacity = '0';
            },
            onDragEnd: () => {
                if (this.glider) this.glider.style.opacity = '1';
                this.updateGlider();
            }
        });

        SettingsAPI.getSetting('gameModesOrder');

        setTimeout(() => {
            const currentId = campaignState.get('modeId') || this.sortedModes[0].id;
            this.selectMode(currentId);
        }, 50);

        // Listen for profiles
        Neutralino.events.off('receiveCampaignProfiles', this._onProfilesReceived.bind(this));
        Neutralino.events.on('receiveCampaignProfiles', this._onProfilesReceived.bind(this));

        // Bind Select Change
        if(this.profileSelect) {
            this.profileSelect.addEventListener('change', (e) => this._applyProfile(e.target.value));
        }

        ProfileAPI.getProfiles();
    }

    _onProfilesReceived(e) {
        this.cachedProfiles = e.detail;
        if (!this.profileSelect) return;

        // Keep 'default' option
        this.profileSelect.innerHTML = '<option value="default">Default Settings</option>';

        this.cachedProfiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; // Use ID to lookup in cache
            opt.textContent = p.name;
            this.profileSelect.appendChild(opt);
        });
    }

    _applyProfile(profileId) {
        if (profileId === 'default') {
            // Reset to defaults
            campaignState.set('economy', 'veteran');
            campaignState.set('funds', 'medium');
            campaignState.set('combat', 'veteran');
            campaignState.set('ironman', false);
            campaignState.set('unexplored', true);
            console.log("Reverted to Default Settings");
        } else {
            const profile = this.cachedProfiles.find(p => p.id == profileId);
            if (profile && profile.config) {
                const c = profile.config;
                // Update State
                if(c.economy) campaignState.set('economy', c.economy);
                if(c.funds) campaignState.set('funds', c.funds);
                if(c.combat) campaignState.set('combat', c.combat);
                if(c.ironman !== undefined) campaignState.set('ironman', c.ironman);
                if(c.unexplored !== undefined) campaignState.set('unexplored', c.unexplored);
                
                console.log(`Loaded Profile: ${profile.name}`);
            }
        }
    }

    applySortOrder(orderIds) {
        const map = new Map(GAME_MODES.map(m => [m.id, m]));
        const newOrder = [];
        
        orderIds.forEach(id => {
            if (map.has(id)) {
                newOrder.push(map.get(id));
                map.delete(id);
            }
        });
        
        map.forEach(mode => newOrder.push(mode));
        this.sortedModes = newOrder;
    }

    renderList() {
        const activeId = campaignState.get('modeId');
        
        this.listEl.innerHTML = '';
        
        this.glider = document.createElement('div');
        this.glider.className = 'mode-list-glider';
        this.listEl.appendChild(this.glider);
        
        this.sortedModes.forEach(mode => {
            const el = document.createElement('div');
            el.className = 'mode-list-item';
            if (mode.id === activeId) el.classList.add('active');
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

            el.addEventListener('click', () => {
                this.selectMode(mode.id);
            });

            this.listEl.appendChild(el);
        });

        this.updateGlider();
    }

    selectMode(id) {
        campaignState.set('modeId', id);
        const modeData = GAME_MODES.find(m => m.id === id);

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

        this.updateGlider(selectedEl);
        this.renderDetails(modeData);
    }

    updateGlider(targetEl = null) {
        if (!targetEl) {
            targetEl = this.listEl.querySelector('.mode-list-item.active');
        }

        if (targetEl && this.glider) {
            if (targetEl.offsetHeight > 0) {
                this.glider.style.top = `${targetEl.offsetTop}px`;
                this.glider.style.height = `${targetEl.offsetHeight}px`;
            }
        }
    }

    renderDetails(mode) {
        if (!mode) return;

        this.detailsEl.style.opacity = '0';
        
        setTimeout(() => {
            const featuresHtml = mode.features.map(f => `
                <li class="feature-item">
                    <i class="${f.icon}" style="color: ${f.color}"></i>
                    <span>${f.text}</span>
                </li>
            `).join('');

            // --- VERSION SELECTOR LOGIC ---
            let versionHtml = '';
            if (mode.hasVersions) {
                versionHtml = `
                    <div class="detail-section-title" style="margin-top: 25px;">Select Version</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <button class="btn-version-select" data-ver="barebones" style="background: rgba(255,255,255,0.05); border: 1px solid var(--bg-hover); padding: 15px; border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: 0.2s; display:flex; flex-direction:column; align-items:center; gap:5px; font-family: var(--font-main);">
                            <i class="fa-solid fa-bone" style="font-size: 1.5rem; margin-bottom: 5px;"></i>
                            <div style="font-weight: 700; color: #fff;">Barebones</div>
                            <div style="font-size: 0.8rem;">Minimalist Logic</div>
                        </button>
                        <button class="btn-version-select" data-ver="complex" style="background: rgba(255,255,255,0.05); border: 1px solid var(--bg-hover); padding: 15px; border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: 0.2s; display:flex; flex-direction:column; align-items:center; gap:5px; font-family: var(--font-main);">
                            <i class="fa-solid fa-gears" style="font-size: 1.5rem; margin-bottom: 5px;"></i>
                            <div style="font-weight: 700; color: #fff;">Complex</div>
                            <div style="font-size: 0.8rem;">Full Mechanics</div>
                        </button>
                    </div>
                `;
            }

            this.detailsEl.innerHTML = `
                <div class="detail-header">
                    <div class="detail-icon-large" style="color: ${mode.color}">
                        <i class="${mode.icon}"></i>
                    </div>
                    <h1 class="detail-title">${mode.title}</h1>
                    <span class="detail-badge">${mode.badge}</span>
                </div>
                <div class="detail-lore">${mode.lore}</div>
                
                ${versionHtml}

                <div class="detail-section-title">Key Features</div>
                <ul class="feature-list">${featuresHtml}</ul>
            `;
            this.detailsEl.style.opacity = '1';

            // Bind Version Buttons
            if (mode.hasVersions) {
                const btns = this.detailsEl.querySelectorAll('.btn-version-select');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Visual Feedback
                        btns.forEach(b => {
                            b.style.borderColor = 'var(--bg-hover)';
                            b.style.background = 'rgba(255,255,255,0.05)';
                            b.style.transform = 'scale(1)';
                        });
                        
                        btn.style.borderColor = mode.color;
                        btn.style.background = 'rgba(255,255,255,0.1)';
                        btn.style.transform = 'scale(1.02)';
                        
                        // Placeholder Action
                        const ver = btn.dataset.ver;
                        console.log(`Version Selected: ${ver}`);
                        // In future: campaignState.set('dungeonVersion', ver);
                    });
                });
            }

        }, 150);
    }

    show() { this.container.classList.remove('hidden'); }
    hide() { this.container.classList.add('hidden'); }
}