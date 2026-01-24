import { DEFAULTS } from "../data/GameModeConfig.js";
import { PREMADE_MAPS } from "../data/PremadeMaps.js";

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
            unexplored: DEFAULTS.UNEXPLORED,
            mapSource: DEFAULTS.MAP_SOURCE,
            premadeMapId: DEFAULTS.PREMADE_MAP_ID 
        };
    }

    set(key, value) {
        this.data[key] = value;
    }

    get(key) {
        return this.data[key];
    }

    getAll() {
        const config = { ...this.data };
        
        if (config.mapSource === 'premade') {
            const mapObj = PREMADE_MAPS.find(m => m.id === config.premadeMapId);
            if (mapObj) {
                config.premadeNodes = mapObj.nodes; // Pass actual geometry
            }
        }
        
        return config;
    }
}

export const campaignState = new CampaignState();