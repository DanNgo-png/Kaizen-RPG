import { BaseStep } from "./BaseStep.js";
import { campaignState } from "../logic/CampaignState.js";
import { generateRandomSeed } from "./logic/GenerateRandomSeed.js";
import { ProfileAPI } from "../../../api/ProfileAPI.js";
import { DEFAULTS } from "../data/GameModeConfig.js";

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
            btnSaveProfile: document.getElementById('btn-save-current-profile'),
            btnRandomSeed: document.getElementById('btn-random-seed')
        };
    }

    init() {
        this.randomizeSeed();
        this._bindEvents();
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

        if(this.dom.btnRandomSeed) {
            this.dom.btnRandomSeed.addEventListener('click', () => this.randomizeSeed());
        }

        // --- SAVE PROFILE ---
        if(this.dom.btnSaveProfile) {
            this.dom.btnSaveProfile.addEventListener('click', () => this.saveCurrentAsProfile());
        }
    }

    randomizeSeed() {
        const seed = generateRandomSeed();
        if(this.dom.seed) this.dom.seed.value = seed;
        campaignState.set('seed', seed);
    }

    saveCurrentAsProfile() {
        const name = prompt("Enter a name for this profile:");
        if(name) {
            // Get ALL state (includes Step 1 & 2 data)
            const allState = campaignState.getAll();
            
            // Ensure current DOM values are captured
            const config = {
                ...allState,
                economy: this.dom.economy.value,
                funds: this.dom.funds.value,
                combat: this.dom.combat.value,
                ironman: this.dom.ironman.checked,
                unexplored: this.dom.unexplored.checked,
                seed: this.dom.seed.value
            };
            
            ProfileAPI.saveProfile(name, config);
            alert(`Profile "${name}" saved!`);
        }
    }

    syncFromState() {
        // Reads from CampaignState, falling back to GameModeConfig defaults
        if(this.dom.economy) this.dom.economy.value = campaignState.get('economy') || DEFAULTS.ECONOMY;
        if(this.dom.funds) this.dom.funds.value = campaignState.get('funds') || DEFAULTS.FUNDS;
        if(this.dom.combat) this.dom.combat.value = campaignState.get('combat') || DEFAULTS.COMBAT;
        if(this.dom.ironman) this.dom.ironman.checked = campaignState.get('ironman') || DEFAULTS.IRONMAN;
        
        // Unexplored might not be set in state yet, check explicitly against boolean
        const unex = campaignState.get('unexplored');
        if(this.dom.unexplored) this.dom.unexplored.checked = (unex !== undefined) ? unex : DEFAULTS.UNEXPLORED;
    }
}