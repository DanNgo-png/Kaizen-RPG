import { GAME_MODES } from "../data/GameModeList.js";
import { campaignState } from "../logic/CampaignState.js";
import { DragLogic } from "./logic/DragLogic.js";
import { SettingsAPI } from "../../../api/SettingsAPI.js";

export class SelectModeStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.listEl = document.getElementById('mode-list');
        this.detailsEl = document.getElementById('mode-details-content');
        this.glider = null;
        // Local state for ordering, initialized with default order
        this.sortedModes = [...GAME_MODES];
    }

    init() {
        // 1. Listen for Order Setting from Backend
        document.addEventListener('kaizen:setting-update', (e) => {
            if (e.detail.key === 'gameModesOrder' && e.detail.value) {
                try {
                    const orderIds = JSON.parse(e.detail.value);
                    // Compare current order vs new order to avoid unnecessary re-renders
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

        // 2. Initial Render (Default Order)
        this.renderList();
        
        // 3. Initialize Drag Logic
        new DragLogic(this.listEl, {
            onReorder: (newOrderIds) => {
                // Update local state immediately so UI logic is consistent
                this.applySortOrder(newOrderIds);
                // Persist the new order to the database
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

        // 4. Request Saved Order (Will trigger event listener if exists)
        SettingsAPI.getSetting('gameModesOrder');

        // 5. Select Initial State
        setTimeout(() => {
            const currentId = campaignState.get('modeId') || this.sortedModes[0].id;
            this.selectMode(currentId);
        }, 50);
    }

    applySortOrder(orderIds) {
        // Create a map for O(1) lookup
        const map = new Map(GAME_MODES.map(m => [m.id, m]));
        const newOrder = [];
        
        // Add existing IDs in the saved order
        orderIds.forEach(id => {
            if (map.has(id)) {
                newOrder.push(map.get(id));
                map.delete(id);
            }
        });
        
        // Append any remaining modes (e.g., if new modes were added in an update)
        map.forEach(mode => newOrder.push(mode));
        
        this.sortedModes = newOrder;
    }

    renderList() {
        // Save current selection to restore active class
        const activeId = campaignState.get('modeId');
        
        this.listEl.innerHTML = '';
        
        // 1. Glider Animation Element
        this.glider = document.createElement('div');
        this.glider.className = 'mode-list-glider';
        this.listEl.appendChild(this.glider);
        
        // 2. Render Modes in Sorted Order
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

        // Update glider position after render
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
            // Ensure metrics are available
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
            this.detailsEl.style.opacity = '1';
        }, 150);
    }

    show() { this.container.classList.remove('hidden'); }
    hide() { this.container.classList.add('hidden'); }
}