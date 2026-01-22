import { BaseStep } from "./BaseStep.js";
import { GAME_MODES } from "../data/GameModeList.js";
import { campaignState } from "../logic/CampaignState.js";
import { DragLogic } from "./logic/DragLogic.js";
import { DragAndDropManager } from "../../../components/DragAndDropManager.js"; 
import { SettingsAPI } from "../../../api/SettingsAPI.js";
import { ProfileAPI } from "../../../api/ProfileAPI.js";
import { UI_CONFIG, CSS_CLASSES } from "../data/GameModeConfig.js";

export class SelectModeStep extends BaseStep {
    constructor(containerId) {
        super(containerId);
        
        this.dom = {
            list: document.getElementById('mode-list'),
            details: document.getElementById('mode-details-content'),
            profileSelect: document.getElementById('select-profile-quick'),
            btnManageProfiles: document.getElementById('btn-manage-profiles'),
            modalProfiles: document.getElementById('modal-profiles'),
            profileListContainer: document.getElementById('profile-list-container'),
            btnCloseProfiles: document.getElementById('btn-close-profiles'),
            btnSortAlpha: document.getElementById('btn-sort-alpha'),
            btnSortDate: document.getElementById('btn-sort-date')
        };

        this.glider = null;
        this.sortedModes = [...GAME_MODES];
        this.cachedProfiles = [];
        this.profileOrder = []; 
        this.profileDragManager = null;
    }

    init() {
        this._setupSettingsListeners();
        this._setupDragAndDrop();
        this._setupProfiles();
        
        // Initial Selection (Delayed slightly for DOM paint)
        setTimeout(() => {
            const currentId = campaignState.get('modeId') || this.sortedModes[0].id;
            this.selectMode(currentId);
        }, UI_CONFIG.ANIMATION_TIMEOUT_MS);
    }

    // --- SETUP & LISTENERS ---

    _setupSettingsListeners() {
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            
            if (key === 'gameModesOrder' && value) {
                this._handleModeOrderUpdate(value);
            }
            
            if (key === 'campaignProfileOrder' && value) {
                this._handleProfileOrderUpdate(value);
            }
        });

        SettingsAPI.getSetting('gameModesOrder');
        SettingsAPI.getSetting('campaignProfileOrder');
    }

    _setupDragAndDrop() {
        this.renderList();
        
        new DragLogic(this.dom.list, {
            onReorder: (newOrderIds) => {
                this.applySortOrder(newOrderIds);
                SettingsAPI.saveSetting('gameModesOrder', JSON.stringify(newOrderIds));
            },
            onDragStart: () => { if (this.glider) this.glider.style.opacity = '0'; },
            onDragEnd: () => { if (this.glider) this.glider.style.opacity = '1'; this.updateGlider(); }
        });
    }

    _setupProfiles() {
        Neutralino.events.off('receiveCampaignProfiles', this._onProfilesReceived.bind(this));
        Neutralino.events.on('receiveCampaignProfiles', this._onProfilesReceived.bind(this));

        if (this.dom.profileSelect) {
            this.dom.profileSelect.addEventListener('change', (e) => this._applyProfile(e.target.value));
        }

        if (this.dom.btnManageProfiles) {
            this.dom.btnManageProfiles.addEventListener('click', () => this.openManageModal());
        }

        if (this.dom.btnCloseProfiles) {
            this.dom.btnCloseProfiles.addEventListener('click', () => this.dom.modalProfiles.classList.add(CSS_CLASSES.HIDDEN));
        }

        // Close Modal on Outside Click
        if (this.dom.modalProfiles) {
            this.dom.modalProfiles.addEventListener('click', (e) => {
                if (e.target === this.dom.modalProfiles) {
                    this.dom.modalProfiles.classList.add(CSS_CLASSES.HIDDEN);
                }
            });
        }

        if (this.dom.btnSortAlpha) this.dom.btnSortAlpha.addEventListener('click', () => this.sortProfiles('alpha'));
        if (this.dom.btnSortDate) this.dom.btnSortDate.addEventListener('click', () => this.sortProfiles('date'));

        ProfileAPI.getProfiles();
    }

    // --- GAME MODES LOGIC ---

    _handleModeOrderUpdate(jsonValue) {
        try {
            const orderIds = JSON.parse(jsonValue);
            const currentIds = this.sortedModes.map(m => m.id);
            if (JSON.stringify(currentIds) !== JSON.stringify(orderIds)) {
                this.applySortOrder(orderIds);
                this.renderList();
            }
        } catch (err) {
            console.error("Error parsing game modes order:", err);
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
        this.dom.list.innerHTML = '';
        
        // Create Glider (Visual Background)
        this.glider = document.createElement('div');
        this.glider.className = 'mode-list-glider';
        this.dom.list.appendChild(this.glider);
        
        this.sortedModes.forEach(mode => {
            const el = document.createElement('div');
            el.className = 'mode-list-item';
            if (mode.id === activeId) el.classList.add(CSS_CLASSES.ACTIVE);
            el.dataset.id = mode.id;
            
            el.innerHTML = `
                <div class="mode-thumb" style="color: ${mode.color}"><i class="${mode.icon}"></i></div>
                <div class="mode-info">
                    <h4>${mode.title}</h4>
                    <span>${mode.subtitle}</span>
                </div>
            `;

            el.addEventListener('click', () => this.selectMode(mode.id));
            this.dom.list.appendChild(el);
        });

        this.updateGlider();
    }

    selectMode(id) {
        campaignState.set('modeId', id);
        const modeData = GAME_MODES.find(m => m.id === id);

        const items = this.dom.list.querySelectorAll('.mode-list-item');
        let selectedEl = null;

        items.forEach(el => {
            if (el.dataset.id === id) {
                el.classList.add(CSS_CLASSES.ACTIVE);
                selectedEl = el;
            } else {
                el.classList.remove(CSS_CLASSES.ACTIVE);
            }
        });

        this.updateGlider(selectedEl);
        this.renderDetails(modeData);
    }

    updateGlider(targetEl = null) {
        if (!targetEl) targetEl = this.dom.list.querySelector('.mode-list-item.active');
        if (targetEl && this.glider && targetEl.offsetHeight > 0) {
            this.glider.style.top = `${targetEl.offsetTop}px`;
            this.glider.style.height = `${targetEl.offsetHeight}px`;
        }
    }

    renderDetails(mode) {
        if (!mode) return;

        this.dom.details.style.opacity = '0';
        
        setTimeout(() => {
            const featuresHtml = mode.features.map(f => `
                <li class="feature-item">
                    <i class="${f.icon}" style="color: ${f.color}"></i>
                    <span>${f.text}</span>
                </li>
            `).join('');

            // Optional: Version Selector for complex modes
            const versionHtml = mode.hasVersions ? this._buildVersionSelector(mode) : '';

            this.dom.details.innerHTML = `
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
            this.dom.details.style.opacity = '1';

            this._bindVersionButtons(mode);

        }, UI_CONFIG.RENDER_DELAY_MS);
    }

    // --- PROFILE LOGIC ---

    _handleProfileOrderUpdate(jsonValue) {
        try {
            this.profileOrder = JSON.parse(jsonValue);
            this._renderProfileDropdown();
        } catch(err) { console.error(err); }
    }

    _onProfilesReceived(e) {
        this.cachedProfiles = e.detail;
        this._renderProfileDropdown();
        if (!this.dom.modalProfiles.classList.contains(CSS_CLASSES.HIDDEN)) {
            this._renderManageList();
        }
    }

    _renderProfileDropdown() {
        if (!this.dom.profileSelect) return;
        const sortedProfiles = this._getSortedProfiles();

        this.dom.profileSelect.innerHTML = '<option value="default">Default Settings</option>';
        sortedProfiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            this.dom.profileSelect.appendChild(opt);
        });
    }

    _applyProfile(profileId) {
        if (profileId === 'default') {
            campaignState.reset();
            const modeId = campaignState.get('modeId');
            if(modeId) this.selectMode(modeId); 
        } else {
            const profile = this.cachedProfiles.find(p => p.id == profileId);
            if (profile && profile.config) {
                // Apply all keys from profile to CampaignState
                Object.entries(profile.config).forEach(([key, val]) => {
                    campaignState.set(key, val);
                });
                
                if (profile.config.modeId) this.selectMode(profile.config.modeId);
            }
        }
    }

    // --- MANAGE PROFILES MODAL ---

    openManageModal() {
        this.dom.modalProfiles.classList.remove(CSS_CLASSES.HIDDEN);
        this._renderManageList();
        
        if (!this.profileDragManager) {
            this.profileDragManager = new DragAndDropManager({
                container: this.dom.profileListContainer,
                itemSelector: '.profile-list-item',
                handleSelector: '.drag-handle',
                onReorder: (newOrderIds) => {
                    this.profileOrder = newOrderIds;
                    SettingsAPI.saveSetting('campaignProfileOrder', JSON.stringify(this.profileOrder));
                    this._renderProfileDropdown();
                }
            });
        } else {
            this.profileDragManager.init();
        }
    }

    _renderManageList() {
        this.dom.profileListContainer.innerHTML = '';
        const sorted = this._getSortedProfiles();

        if (sorted.length === 0) {
            this.dom.profileListContainer.innerHTML = '<div class="profile-empty-state">No custom profiles found.</div>';
            return;
        }

        sorted.forEach(p => {
            const el = document.createElement('div');
            el.className = 'profile-list-item'; // New class
            el.dataset.id = p.id;
            
            // Clean HTML using new classes
            el.innerHTML = `
                <div class="profile-drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="profile-name">${p.name}</div>
                <button class="btn-delete-profile"><i class="fa-solid fa-trash"></i></button>
            `;
            
            el.querySelector('.btn-delete-profile').addEventListener('click', () => {
                if(confirm(`Delete profile "${p.name}"?`)) ProfileAPI.deleteProfile(p.id);
            });
            this.dom.profileListContainer.appendChild(el);
        });
    }

    _getSortedProfiles() {
        if (!this.profileOrder || this.profileOrder.length === 0) return [...this.cachedProfiles];
        
        const map = new Map(this.cachedProfiles.map(p => [String(p.id), p]));
        const sorted = [];
        
        this.profileOrder.forEach(id => {
            if (map.has(String(id))) {
                sorted.push(map.get(String(id)));
                map.delete(String(id));
            }
        });
        map.forEach(p => sorted.push(p));
        return sorted;
    }

    sortProfiles(method) {
        let sorted = [...this.cachedProfiles];
        if (method === 'alpha') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else if (method === 'date') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        this.profileOrder = sorted.map(p => String(p.id));
        SettingsAPI.saveSetting('campaignProfileOrder', JSON.stringify(this.profileOrder));
        
        this._renderManageList();
        this._renderProfileDropdown();
    }

    // --- HELPERS ---

    _buildVersionSelector(mode) {
        return `
            <div class="detail-section-title" style="margin-top: 25px;">Select Version</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <button class="btn-version-select" data-ver="barebones">
                    <i class="fa-solid fa-bone"></i> <div>Barebones</div>
                </button>
                <button class="btn-version-select" data-ver="complex">
                    <i class="fa-solid fa-gears"></i> <div>Complex</div>
                </button>
            </div>
        `;
    }

    _bindVersionButtons(mode) {
        if (!mode.hasVersions) return;
        
        const btns = this.dom.details.querySelectorAll('.btn-version-select');
        
        // Helper to reset styles
        const resetBtns = () => {
            btns.forEach(b => {
                b.style.borderColor = 'var(--bg-hover)';
                b.style.color = 'var(--text-secondary)';
                b.style.backgroundColor = 'var(--bg-sidebar-inner)';
            });
        };

        // Helper to activate a button
        const activateBtn = (btn) => {
            resetBtns();
            btn.style.borderColor = mode.color;
            btn.style.color = '#fff';
            // Slight tint of the mode color for background
            btn.style.backgroundColor = `${mode.color}15`; // Hex opacity ~10%
        };

        // Select first by default
        if (btns.length > 0) {
            activateBtn(btns[0]);
        }

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                activateBtn(btn);
                // Save version to state if needed: campaignState.set('version', btn.dataset.ver);
            });
        });
    }
}