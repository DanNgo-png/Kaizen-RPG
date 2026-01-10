import { standardManager } from "./focus/standard/StandardFocusManager.js";
import { flexManager } from "./focus/flexible/FlexibleFocusManager.js";

async function onWindowClose() {
    console.log("💾 Saving state before exit...");

    // 1. Standard Timer: Pause and Save
    if (standardManager) {
        standardManager.stopTicker(); // Stop interval
        standardManager.saveState();  // Serialize to DB
    }

    // 2. Flexible Timer: Pause and Save
    if (flexManager) {
        flexManager.stopTicker();     // Stop interval
        flexManager.saveState();      // Serialize to DB
    }

    // 3. Small delay to ensure Neutralino message dispatch sends before process kill
    await new Promise(r => setTimeout(r, 50));

    Neutralino.app.exit();
}

Neutralino.init();
Neutralino.events.on("windowClose", onWindowClose);