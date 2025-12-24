import { GridMapManager } from "./GridMapManager.js";
import { ResourceManager } from "./ResourceManager.js";
import { RaidManager } from "./RaidManager.js";

export function initEmpireBuilder() {
    console.log("🏰 Initializing Empire Builder Mode...");

    // 1. Initialize Resources (Gold, Influence, etc.)
    const resourceManager = new ResourceManager();
    resourceManager.init();

    // 2. Initialize Grid Map
    const mapContainer = document.getElementById("grid-map-container");
    if (mapContainer) {
        const gridManager = new GridMapManager(mapContainer);
        gridManager.generateWorld();
    }

    // 3. Initialize Raid System (Background check)
    const raidManager = new RaidManager();
    raidManager.startMonitoring();
}