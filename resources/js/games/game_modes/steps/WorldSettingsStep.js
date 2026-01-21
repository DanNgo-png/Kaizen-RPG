import { campaignState } from "../logic/CampaignState.js";
import { generateRandomSeed } from "../logic/GenerateRandomSeed.js";
import { ProfileAPI } from "../../../api/ProfileAPI.js";

export class WorldSettingsStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
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
        
        // --- INPUT LISTENERS (Update State) ---
        this.dom.economy.addEventListener('change', (e) => campaignState.set('economy', e.target.value));
        this.dom.funds.addEventListener('change', (e) => campaignState.set('funds', e.target.value));
        this.dom.combat.addEventListener('change', (e) => campaignState.set('combat', e.target.value));
        this.dom.ironman.addEventListener('change', (e) => campaignState.set('ironman', e.target.checked));
        this.dom.unexplored.addEventListener('change', (e) => campaignState.set('unexplored', e.target.checked));
        this.dom.seed.addEventListener('input', (e) => campaignState.set('seed', e.target.value));
        this.dom.btnRandomSeed.addEventListener('click', () => this.randomizeSeed());

        // --- SAVE PROFILE ---
        this.dom.btnSaveProfile.addEventListener('click', () => {
            const name = prompt("Enter a name for this profile:");
            if(name) {
                const config = {
                    economy: this.dom.economy.value,
                    funds: this.dom.funds.value,
                    combat: this.dom.combat.value,
                    ironman: this.dom.ironman.checked,
                    unexplored: this.dom.unexplored.checked
                };
                ProfileAPI.saveProfile(name, config);
                alert(`Profile "${name}" saved! It is now available in the Start Screen.`);
            }
        });
    }

    randomizeSeed() {
        const seed = generateRandomSeed();
        this.dom.seed.value = seed;
        campaignState.set('seed', seed);
    }

    // --- SYNC ON SHOW ---
    show() { 
        this.container.classList.remove('hidden');
        this.syncFromState(); // CRITICAL: Updates inputs based on what was loaded in Step 1
    }

    hide() { 
        this.container.classList.add('hidden'); 
    }

    syncFromState() {
        // Reads from CampaignState (which might have been updated by a profile in Step 1)
        this.dom.economy.value = campaignState.get('economy') || 'veteran';
        this.dom.funds.value = campaignState.get('funds') || 'medium';
        this.dom.combat.value = campaignState.get('combat') || 'veteran';
        this.dom.ironman.checked = campaignState.get('ironman') || false;
        this.dom.unexplored.checked = campaignState.get('unexplored') !== false;
    }
}