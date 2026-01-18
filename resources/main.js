import { EventRegistry } from "./js/events/EventRegistry.js";
import { SettingsAPI } from './js/api/SettingsAPI.js';
import { initGlobalInputListeners } from './js/_global-managers/GlobalInputListener.js';
import { updateManager } from "./js/_global-managers/UpdateManager.js";
import { notifier } from "./js/_global-managers/NotificationManager.js"; 

// Global Managers
import { standardManager } from './js/focus/standard/StandardFocusManager.js';
import { flexManager } from './js/focus/flexible/FlexibleFocusManager.js';
import { initGlobalFocusListener } from './js/focus/GlobalFocusListener.js';

// UI Managers
import { handleDropdowns } from './js/dropdown.js';
import { initSidebarTooltips } from './js/sidebarTooltip.js';
import { LoadPageManager } from './js/_main-app/LoadPageManager.js';

async function app() {
    try {
        console.log("🚀 Starting Kaizen RPG...");

        // 1. Initialize Core Systems
        EventRegistry.init();
        initGlobalInputListeners();
        
        // 2. Initialize Focus Engine (Singleton Background Logic)
        standardManager.initialize();
        flexManager.initialize();
        initGlobalFocusListener();

        // 3. Pre-load Global Data
        SettingsAPI.getSetting('fontFamily');

        // 4. Initialize UI Components
        handleDropdowns();
        initSidebarTooltips();
        
        // 5. Setup Navigation
        LoadPageManager.init();

        // 6. Check for Updates (Delayed)
        setTimeout(async () => {
            const manifest = await updateManager.check();
            if (manifest) {
                notifier.show(
                    "Update Available",
                    `Version ${manifest.version} is ready. Go to Settings to install.`,
                    "fa-solid fa-wand-magic-sparkles"
                );
            }
        }, 5000);

    } catch (error) {
        console.error("❌ App initialization failed:", error);
    }
}

app();