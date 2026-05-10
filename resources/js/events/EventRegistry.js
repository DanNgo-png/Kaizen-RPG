import { MercenaryHandler } from "../handlers/MercenaryHandler.js";
import { TaskHandler } from "../handlers/TaskHandler.js";
import { SettingsHandler } from "../handlers/SettingsHandler.js";
import { FocusHandler } from "../handlers/FocusHandler.js";

export const EventRegistry = {
    init: () => {
        // Mercenaries
        Neutralino.events.on("receiveMercenaries", MercenaryHandler.onReceiveData);
        Neutralino.events.on("mercenaryAdded", MercenaryHandler.onCreated);
        Neutralino.events.on("xpGained", MercenaryHandler.onXpGained);

        // Tasks
        Neutralino.events.on("receiveTasks", TaskHandler.onReceiveData);

        // Settings
        Neutralino.events.on("receiveSetting", SettingsHandler.onReceiveSetting);
        Neutralino.events.on("settingSaved", SettingsHandler.onSettingSaved);
        Neutralino.events.on("receiveCustomFonts", SettingsHandler.onReceiveCustomFonts);
        Neutralino.events.on("focusHistoryCleared", SettingsHandler.onFocusHistoryCleared);

        // Focus Sessions
        Neutralino.events.on("receiveFocusSessions", FocusHandler.onReceiveSessions);
        Neutralino.events.on("focusSessionSaved", FocusHandler.onSessionSaved);
        Neutralino.events.on("receiveLifetimeStats", FocusHandler.onReceiveLifetimeStats);
        Neutralino.events.on("receiveCalendarData", FocusHandler.onReceiveCalendarData);

        // Export/Import Events
        Neutralino.events.on("receiveExportData", (event) => {
            const customEvent = new CustomEvent('kaizen:export-data', { detail: event.detail });
            document.dispatchEvent(customEvent);
        });

        Neutralino.events.on("historyImported", (event) => {
            const customEvent = new CustomEvent('kaizen:import-complete', { detail: event.detail });
            document.dispatchEvent(customEvent);
        });
        
        console.log("🔌 Event Registry initialized");
    }
};