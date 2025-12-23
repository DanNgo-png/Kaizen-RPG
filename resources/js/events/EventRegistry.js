import { MercenaryHandler } from "../handlers/MercenaryHandler.js";
import { TaskHandler } from "../handlers/TaskHandler.js";

export const EventRegistry = {
    init: () => {
        // Map backend event names to frontend handler functions

        // Mercenaries
        Neutralino.events.on("receiveMercenaries", MercenaryHandler.onReceiveData);
        Neutralino.events.on("mercenaryAdded", MercenaryHandler.onCreated);

        // Tasks
        Neutralino.events.on("receiveTasks", TaskHandler.onReceiveData);

        // Add other domain handlers here (e.g., InventoryHandler, QuestHandler)
        // Neutralino.events.on("receiveInventory", InventoryHandler.onUpdate);

        console.log("🔌 Event Registry initialized");
    }
};