import { MercenaryHandler } from "../handlers/MercenaryHandler.js";
import { TaskHandler } from "../handlers/TaskHandler.js";
import { SettingsHandler } from "../handlers/SettingsHandler.js";

export const EventRegistry = {
    init: () => {
        // Map backend event names to frontend handler functions

        // Mercenaries
        Neutralino.events.on("receiveMercenaries", MercenaryHandler.onReceiveData);
        Neutralino.events.on("mercenaryAdded", MercenaryHandler.onCreated);

        // Tasks
        Neutralino.events.on("receiveTasks", TaskHandler.onReceiveData);

        // Settings (NEW)
        Neutralino.events.on("receiveSetting", SettingsHandler.onReceiveSetting);
        Neutralino.events.on("settingSaved", SettingsHandler.onSettingSaved);
        Neutralino.events.on("receiveCustomFonts", SettingsHandler.onReceiveCustomFonts); 
        
        // Add other domain handlers here (e.g., InventoryHandler, QuestHandler)
        // Neutralino.events.on("receiveInventory", InventoryHandler.onUpdate);

        console.log("🔌 Event Registry initialized");
    }
};