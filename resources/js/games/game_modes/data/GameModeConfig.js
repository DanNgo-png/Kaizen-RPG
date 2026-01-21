export const UI_CONFIG = {
    ANIMATION_TIMEOUT_MS: 50,
    DRAG_PRESS_DURATION_MS: 200,
    DRAG_END_DELAY_MS: 250,
    RENDER_DELAY_MS: 150,
    SEED_LENGTH: 10
};

export const DEFAULTS = {
    MODE_ID: 'sellswords',
    COMPANY_NAME: '',
    BANNER_INDEX: 0,
    COLOR: '#ef4444', // Red
    CRISIS: 'random',
    ECONOMY: 'veteran',
    FUNDS: 'medium',
    COMBAT: 'veteran',
    IRONMAN: false,
    UNEXPLORED: true,
    SEED: ''
};

export const DIFFICULTY_LEVELS = {
    ECONOMY: {
        BEGINNER: 'beginner',
        VETERAN: 'veteran',
        EXPERT: 'expert',
        LEGENDARY: 'legendary'
    },
    COMBAT: {
        BEGINNER: 'beginner',
        VETERAN: 'veteran',
        EXPERT: 'expert',
        LEGENDARY: 'legendary'
    },
    FUNDS: {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
        NONE: 'none'
    }
};

export const CRISIS_TYPES = {
    RANDOM: 'random',
    NOBLES: 'nobles',
    GREENSKINS: 'greenskins',
    UNDEAD: 'undead',
    HOLYWAR: 'holywar'
};

export const CSS_CLASSES = {
    HIDDEN: 'hidden',
    ACTIVE: 'active',
    SELECTED: 'selected',
    LOADING: 'mode-reorder-charging'
};