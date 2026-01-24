import { standardManager } from "./focus/standard/StandardFocusManager.js";
import { flexManager } from "./focus/flexible/FlexibleFocusManager.js";

function saveAppState() {
    console.log("💾 Saving state snapshot...");
    if (standardManager) { standardManager.saveState(); }
    if (flexManager) { flexManager.saveState(); }
}

async function onWindowClose() {
    if (standardManager) standardManager.stopTicker();
    if (flexManager) flexManager.stopTicker();

    saveAppState();

    // Small delay to ensure Neutralino message dispatch sends to Node backend before the process is killed.
    await new Promise(r => setTimeout(r, 50));

    Neutralino.app.exit();
}

Neutralino.init();
Neutralino.events.on("windowClose", onWindowClose);

// Listener for REFRESH (F5 / Cmd+R)
window.addEventListener("beforeunload", () => {
    saveAppState();
});