import { campaignState } from "../logic/CampaignState.js";

export class CompanyDetailsStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
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
        this.dom.inputName.addEventListener('input', (e) => campaignState.set('name', e.target.value));

        // Banner Selection
        const banners = this.dom.bannerGrid.querySelectorAll('.banner-opt');
        banners.forEach((el, index) => {
            el.addEventListener('click', () => {
                banners.forEach(b => b.classList.remove('selected'));
                el.classList.add('selected');
                campaignState.set('bannerIndex', index);
            });
        });

        // Color Selection
        const colors = this.dom.colorRow.querySelectorAll('.color-opt');
        colors.forEach(el => {
            el.addEventListener('click', () => {
                colors.forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                campaignState.set('color', el.dataset.color);
            });
        });

        // Crisis Selection
        const crises = this.dom.crisisList.querySelectorAll('.crisis-card');
        crises.forEach(el => {
            el.addEventListener('click', () => {
                crises.forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                campaignState.set('crisis', el.dataset.crisis);
            });
        });
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

    show() { this.container.classList.remove('hidden'); }
    hide() { this.container.classList.add('hidden'); }
}