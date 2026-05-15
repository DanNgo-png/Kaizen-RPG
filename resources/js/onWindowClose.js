import { standardManager } from "./focus/standard/StandardFocusManager.js";
import { flexManager } from "./focus/flexible/FlexibleFocusManager.js";

function saveAppState() {
    console.log("💾 Saving state snapshot...");
    if (standardManager) { standardManager.saveState(); }
    if (flexManager) { flexManager.saveState(); }

    // Check for active Game World save hook
    if (typeof window.kaizenSaveWorldState === 'function') {
        console.log("💾 Saving Active Game World...");
        window.kaizenSaveWorldState();
    }

    // Check for active Game Progress save hook
    if (typeof window.kaizenSaveGameProgress === 'function') {
        console.log("💾 Saving Active Game Contract Progress...");
        window.kaizenSaveGameProgress();
    }
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
Neutralino.events.on("windowClose", async () => {
    try {
        await onWindowClose();
    } catch (err) {
        await onWindowClose();
        await Neutralino.app.killProcess();
    }
});

// Listener for REFRESH (F5 / Cmd+R)
window.addEventListener("beforeunload", () => {
    saveAppState();
});