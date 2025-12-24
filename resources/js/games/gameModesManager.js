import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/empire_builder/empireBuilderManager.js";

export function initGameModes() {
    // 1. Setup "Found Kingdom" Button (Empire Builder)
    const startEmpireBtn = document.getElementById("btn-start-empire");

    if (startEmpireBtn) {
        startEmpireBtn.addEventListener("click", async () => {
            // Navigate to the new HTML page
            await loadPage("./pages/games/empire-builder.html");
            
            // Initialize the game logic
            initEmpireBuilder();
        });
    }

    // 2. Setup "Start Campaign" Button (Sellswords) - Placeholder
    const startSellswordsBtn = document.querySelector(".mode-card.featured .btn-primary");
    if (startSellswordsBtn) {
        startSellswordsBtn.addEventListener("click", () => {
            console.log("Starting Sellswords Campaign...");
            // Logic to start standard campaign would go here
        });
    }
}