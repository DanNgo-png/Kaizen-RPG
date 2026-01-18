import { campaignState } from "../logic/CampaignState.js";
import { generateRandomSeed } from "../logic/GenerateRandomSeed.js";

export class WorldSettingsStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dom = {
            economy: document.getElementById('input-economy'),
            funds: document.getElementById('input-funds'),
            combat: document.getElementById('input-combat'),
            ironman: document.getElementById('input-ironman'),
            seed: document.getElementById('input-map-seed'),
            randomSeedBtn: document.getElementById('btn-random-seed'),
            unexplored: document.getElementById('input-unexplored')
        };
    }

    init() {
        // Generate initial seed
        this.randomizeSeed();

        this.dom.randomSeedBtn.addEventListener('click', () => this.randomizeSeed());
        
        // Listeners to update state immediately
        this.dom.economy.addEventListener('change', (e) => campaignState.set('economy', e.target.value));
        this.dom.funds.addEventListener('change', (e) => campaignState.set('funds', e.target.value));
        this.dom.combat.addEventListener('change', (e) => campaignState.set('combat', e.target.value));
        this.dom.ironman.addEventListener('change', (e) => campaignState.set('ironman', e.target.checked));
        this.dom.unexplored.addEventListener('change', (e) => campaignState.set('unexplored', e.target.checked));
        this.dom.seed.addEventListener('input', (e) => campaignState.set('seed', e.target.value));
    }

    randomizeSeed() {
        const seed = generateRandomSeed();
        this.dom.seed.value = seed;
        campaignState.set('seed', seed);
    }

    show() { this.container.classList.remove('hidden'); }
    hide() { this.container.classList.add('hidden'); }
}