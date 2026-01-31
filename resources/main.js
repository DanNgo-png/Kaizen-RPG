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

        // Initialize Core Systems
        EventRegistry.init();
        initGlobalInputListeners();
        
        // Initialize Focus Engine (Singleton Background Logic)
        standardManager.initialize();
        flexManager.initialize();
        initGlobalFocusListener();

        // Pre-load Global Data
        SettingsAPI.getSetting('fontFamily');

        // Initialize UI Components
        handleDropdowns();
        initSidebarTooltips();
        
        // Setup Navigation
        LoadPageManager.init();

        // Check for Updates
        setTimeout(() => {
            // Define a one-time listener for the setting response
            const checkUpdateHandler = async (e) => {
                const { key, value } = e.detail;
                
                if (key === 'enableUpdateReminder') {
                    // Clean up listener immediately
                    document.removeEventListener('kaizen:setting-update', checkUpdateHandler);
                    
                    // Default to true if not set yet
                    const shouldCheck = (value === null || value === undefined || value === true || value === 'true');
                    
                    if (shouldCheck) {
                        const manifest = await updateManager.check();
                        if (manifest) {
                            notifier.show(
                                "Update Available",
                                `Version ${manifest.version} is ready. Go to Settings to install.`,
                                "fa-solid fa-wand-magic-sparkles"
                            );
                        }
                    } else {
                        console.log("🔕 Update reminders disabled by user.");
                    }
                }
            };

            // Register listener
            document.addEventListener('kaizen:setting-update', checkUpdateHandler);
            
            // Trigger the request
            SettingsAPI.getSetting('enableUpdateReminder');
        }, 5000);

    } catch (error) {
        console.error("❌ App initialization failed:", error);
    }
}

app();