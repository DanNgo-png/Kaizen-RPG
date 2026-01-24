import { BaseStep } from "./BaseStep.js";
import { campaignState } from "../logic/CampaignState.js";
import { generateRandomSeed } from "./logic/GenerateRandomSeed.js";
import { ProfileAPI } from "../../../api/ProfileAPI.js";
import { DEFAULTS } from "../data/GameModeConfig.js";
import { PREMADE_MAPS } from "../data/PremadeMaps.js";

export class WorldSettingsStep extends BaseStep {
    constructor(containerId) {
        super(containerId);
        this.dom = {
            economy: document.getElementById('input-economy'),
            funds: document.getElementById('input-funds'),
            combat: document.getElementById('input-combat'),
            ironman: document.getElementById('input-ironman'),
            seed: document.getElementById('input-map-seed'),
            unexplored: document.getElementById('input-unexplored'),
            mapSource: document.getElementById('input-map-source'),
            btnSaveProfile: document.getElementById('btn-save-current-profile'),
            btnRandomSeed: document.getElementById('btn-random-seed'),
            
            // Containers
            containerProcedural: document.getElementById('container-procedural'),
            containerPremade: document.getElementById('container-premade'),
            mapList: document.getElementById('premade-map-list')
        };
    }

    init() {
        this.randomizeSeed();
        this._renderMapList();
        this._bindEvents();
        this._toggleSourceUI('procedural'); // Default state
    }

    _bindEvents() {
        // --- INPUT LISTENERS (Update State) ---
        const bindInput = (el, key, isCheckbox = false) => {
            if(el) {
                el.addEventListener(isCheckbox ? 'change' : 'input', (e) => {
                    const val = isCheckbox ? e.target.checked : e.target.value;
                    campaignState.set(key, val);
                });
            }
        };

        bindInput(this.dom.economy, 'economy');
        bindInput(this.dom.funds, 'funds');
        bindInput(this.dom.combat, 'combat');
        bindInput(this.dom.ironman, 'ironman', true);
        bindInput(this.dom.unexplored, 'unexplored', true);
        bindInput(this.dom.seed, 'seed');
        
        // Map Source Toggle
        if (this.dom.mapSource) {
            this.dom.mapSource.addEventListener('change', (e) => {
                const val = e.target.value;
                campaignState.set('mapSource', val);
                this._toggleSourceUI(val);
            });
        }

        // Random Seed
        if(this.dom.btnRandomSeed) {
            this.dom.btnRandomSeed.addEventListener('click', () => this.randomizeSeed());
        }

        // Seed Input
        // if(this.dom.seed) {
        //     this.dom.seed.addEventListener('input', (e) => campaignState.set('seed', e.target.value));
        // }

        // --- SAVE PROFILE ---
        if(this.dom.btnSaveProfile) {
            this.dom.btnSaveProfile.addEventListener('click', () => this.saveCurrentAsProfile());
        }
    }

    _toggleSourceUI(source) {
        const showProcedural = (source === 'procedural');

        if (this.dom.containerProcedural) {
            if (showProcedural) this.dom.containerProcedural.classList.remove('hidden');
            else this.dom.containerProcedural.classList.add('hidden');
        }

        if (this.dom.containerPremade) {
            if (showProcedural) this.dom.containerPremade.classList.add('hidden');
            else this.dom.containerPremade.classList.remove('hidden');
        }
    }

    _renderMapList() {
        if (!this.dom.mapList) return;
        this.dom.mapList.innerHTML = '';

        PREMADE_MAPS.forEach(map => {
            const el = document.createElement('div');
            // Reusing existing CSS classes for consistent look
            el.className = 'mode-list-item'; 
            el.dataset.id = map.id;
            el.style.padding = "10px"; // Override slightly for compact list
            
            el.innerHTML = `
                <div class="mode-info" style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:#fff;">${map.name}</h4>
                        <span class="detail-badge" style="font-size:0.7rem;">${map.difficulty}</span>
                    </div>
                    <span style="font-size:0.8rem; color:#9ca3af; display:block; margin-top:4px;">${map.description}</span>
                </div>
            `;

            el.addEventListener('click', () => {
                this._selectMap(map.id);
            });

            this.dom.mapList.appendChild(el);
        });
    }

    _selectMap(mapId) {
        campaignState.set('premadeMapId', mapId);
        
        // Update Visuals
        const items = this.dom.mapList.querySelectorAll('.mode-list-item');
        items.forEach(el => {
            if (el.dataset.id === mapId) {
                el.classList.add('active'); // Reusing .active from game-modes.css
                el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                el.style.borderColor = 'var(--accent-active-text)';
            } else {
                el.classList.remove('active');
                el.style.backgroundColor = 'transparent';
                el.style.borderColor = 'transparent';
            }
        });
    }

    randomizeSeed() {
        const seed = generateRandomSeed();
        if(this.dom.seed) this.dom.seed.value = seed;
        campaignState.set('seed', seed);
    }

    saveCurrentAsProfile() {
        const name = prompt("Enter a name for this profile:");
        if(name) {
            const allState = campaignState.getAll();
            
            const config = {
                ...allState,
                economy: this.dom.economy ? this.dom.economy.value : DEFAULTS.ECONOMY,
                funds: this.dom.funds ? this.dom.funds.value : DEFAULTS.FUNDS,
                combat: this.dom.combat ? this.dom.combat.value : DEFAULTS.COMBAT,
                ironman: this.dom.ironman ? this.dom.ironman.checked : DEFAULTS.IRONMAN,
                unexplored: this.dom.unexplored ? this.dom.unexplored.checked : DEFAULTS.UNEXPLORED,
                seed: this.dom.seed ? this.dom.seed.value : '',
                mapSource: this.dom.mapSource ? this.dom.mapSource.value : DEFAULTS.MAP_SOURCE
            };
            
            ProfileAPI.saveProfile(name, config);
            alert(`Profile "${name}" saved!`);
        }
    }

    syncFromState() {
        if(this.dom.economy) this.dom.economy.value = campaignState.get('economy') || DEFAULTS.ECONOMY;
        if(this.dom.funds) this.dom.funds.value = campaignState.get('funds') || DEFAULTS.FUNDS;
        if(this.dom.combat) this.dom.combat.value = campaignState.get('combat') || DEFAULTS.COMBAT;
        if(this.dom.ironman) this.dom.ironman.checked = campaignState.get('ironman') || DEFAULTS.IRONMAN;
        
        const unex = campaignState.get('unexplored');
        if(this.dom.unexplored) this.dom.unexplored.checked = (unex !== undefined) ? unex : DEFAULTS.UNEXPLORED;

        const source = campaignState.get('mapSource') || DEFAULTS.MAP_SOURCE;
        if(this.dom.mapSource) {
            this.dom.mapSource.value = source;
            this._toggleSourceUI(source);
        }

        const mapId = campaignState.get('premadeMapId') || DEFAULTS.PREMADE_MAP_ID;
        this._selectMap(mapId);
        
        const savedSeed = campaignState.get('seed');
        if (savedSeed && this.dom.seed) this.dom.seed.value = savedSeed;
    }
}