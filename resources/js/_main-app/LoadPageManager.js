import { setupPlanNavigation } from './load_page/LoadPlan.js';
import { setupFocusNavigation } from './load_page/LoadFocus.js';
import { setupTimeframesNavigation } from './load_page/LoadTimeframes.js';
import { setupAnalyzeNavigation } from './load_page/LoadAnalyze.js';
import { setupGameNavigation } from './load_page/LoadGame.js';
import { setupOtherNavigation } from './load_page/LoadOther.js';

export const LoadPageManager = {
    init: () => {
        console.log("🧭 Initializing Navigation...");
        setupPlanNavigation();
        setupFocusNavigation();
        setupTimeframesNavigation();
        setupAnalyzeNavigation();
        setupGameNavigation();
        setupOtherNavigation();
    }
};