class CampaignState {
    constructor() {
        this.reset();
    }

    reset() {
        this.data = {
            modeId: 'sellswords', // Default
            
            // Company Details
            name: '',
            bannerIndex: 0,
            color: '#ef4444',
            crisis: 'random',
            
            // World Settings
            economy: 'veteran',
            funds: 'medium',
            combat: 'veteran',
            ironman: false,
            seed: '',
            unexplored: true
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