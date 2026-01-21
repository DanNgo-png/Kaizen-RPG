import { DEFAULTS } from "../data/GameModeConfig.js";

class CampaignState {
    constructor() {
        this.data = {};
        this.reset();
    }

    reset() {
        this.data = {
            modeId: DEFAULTS.MODE_ID,
            
            // Company Details
            name: DEFAULTS.COMPANY_NAME,
            bannerIndex: DEFAULTS.BANNER_INDEX,
            color: DEFAULTS.COLOR,
            crisis: DEFAULTS.CRISIS,
            
            // World Settings
            economy: DEFAULTS.ECONOMY,
            funds: DEFAULTS.FUNDS,
            combat: DEFAULTS.COMBAT,
            ironman: DEFAULTS.IRONMAN,
            seed: DEFAULTS.SEED,
            unexplored: DEFAULTS.UNEXPLORED
        };
    }

    set(key, value) {
        this.data[key] = value;
    }

    get(key) {
        return this.data[key];
    }

    getAll() {
        return { ...this.data };
    }
}

export const campaignState = new CampaignState();