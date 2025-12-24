import { loadPage } from "../router.js";
import { initGameModes } from "./gameModesManager.js";
import { initModsManager } from "../mods/modsManager.js";

export function initMenuButtons() {
    const newCampaignBtn = document.getElementById("btn-new-campaign");
    const loadCampaignBtn = document.getElementById("btn-load-campaign");
    const modsBtn = document.getElementById("btn-mods");
    const settingsBtn = document.getElementById("btn-game-settings");

    // 1. New Campaign -> Navigate to Game Modes
    if (newCampaignBtn) {
        newCampaignBtn.addEventListener("click", async () => {
            await loadPage("./pages/games/game-modes.html");
            initGameModes();
        });
    }

    // 2. Load Game (Placeholder)
    if (loadCampaignBtn) {
        loadCampaignBtn.addEventListener("click", () => {
            console.log("Load Game clicked");
            // await loadPage("./pages/games/load-campaign.html");
        });
    }

    // 3. Mods -> Navigate to Mods Page
    if (modsBtn) {
        modsBtn.addEventListener("click", async () => {
            await loadPage("./pages/mods/mods.html");
            initModsManager(); 
        });
    }

    // 4. Settings -> Navigate to Game Settings
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            await loadPage("./pages/games/game-settings.html");
        });
    }
}