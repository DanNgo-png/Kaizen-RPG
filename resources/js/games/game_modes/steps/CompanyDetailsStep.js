import { BaseStep } from "./BaseStep.js";
import { campaignState } from "../logic/CampaignState.js";
import { CSS_CLASSES } from "../data/GameModeConfig.js";

export class CompanyDetailsStep extends BaseStep {
    constructor(containerId) {
        super(containerId);
        
        this.dom = {
            inputName: document.getElementById('input-company-name'),
            bannerGrid: document.getElementById('banner-selection'),
            colorRow: document.getElementById('color-selection'),
            crisisList: document.getElementById('crisis-selection')
        };
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        // Name Input
        if (this.dom.inputName) {
            this.dom.inputName.addEventListener('input', (e) => campaignState.set('name', e.target.value));
        }

        // Delegated listener for Banners
        if (this.dom.bannerGrid) {
            this._setupDelegatedSelection(this.dom.bannerGrid, '.banner-opt', (el, index) => {
                this._updateSelection(this.dom.bannerGrid, '.banner-opt', el);
                campaignState.set('bannerIndex', index);
            });
        }

        // Delegated listener for Colors
        if (this.dom.colorRow) {
            this._setupDelegatedSelection(this.dom.colorRow, '.color-opt', (el) => {
                this._updateSelection(this.dom.colorRow, '.color-opt', el);
                campaignState.set('color', el.dataset.color);
            });
        }

        // Delegated listener for Crisis
        if (this.dom.crisisList) {
            this._setupDelegatedSelection(this.dom.crisisList, '.crisis-card', (el) => {
                this._updateSelection(this.dom.crisisList, '.crisis-card', el);
                campaignState.set('crisis', el.dataset.crisis);
            });
        }
    }

    /**
     * Generic helper for grid/list selections
     */
    _setupDelegatedSelection(container, selector, callback) {
        container.addEventListener('click', (e) => {
            const target = e.target.closest(selector);
            if (target) {
                // Find index if needed (convert node list to array)
                const index = Array.from(container.querySelectorAll(selector)).indexOf(target);
                callback(target, index);
            }
        });
    }

    _updateSelection(container, selector, selectedEl) {
        const items = container.querySelectorAll(selector);
        items.forEach(el => el.classList.remove(CSS_CLASSES.SELECTED));
        selectedEl.classList.add(CSS_CLASSES.SELECTED);
    }

    validate() {
        const name = this.dom.inputName.value.trim();
        if (!name) {
            alert("Please enter a company name.");
            this.dom.inputName.focus();
            return false;
        }
        campaignState.set('name', name);
        return true;
    }

    syncFromState() {
        const state = campaignState.getAll();
        
        if (state.name && this.dom.inputName) {
            this.dom.inputName.value = state.name;
        }

        if (state.bannerIndex !== undefined && this.dom.bannerGrid) {
            const banners = this.dom.bannerGrid.querySelectorAll('.banner-opt');
            if(banners[state.bannerIndex]) this._updateSelection(this.dom.bannerGrid, '.banner-opt', banners[state.bannerIndex]);
        }

        if (state.color && this.dom.colorRow) {
            const colors = this.dom.colorRow.querySelectorAll('.color-opt');
            const target = Array.from(colors).find(el => el.dataset.color === state.color);
            if(target) this._updateSelection(this.dom.colorRow, '.color-opt', target);
        }

        if (state.crisis && this.dom.crisisList) {
            const crises = this.dom.crisisList.querySelectorAll('.crisis-card');
            const target = Array.from(crises).find(el => el.dataset.crisis === state.crisis);
            if(target) this._updateSelection(this.dom.crisisList, '.crisis-card', target);
        }
    }
}