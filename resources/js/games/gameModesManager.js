import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/empire_builder/empireBuilderManager.js";

export function initGameModes() {
    // 1. Setup "Found Kingdom" Button (Empire Builder)
    const startEmpireBtn = document.getElementById("btn-start-empire");
    const modalOverlay = document.getElementById("empire-modal-overlay");
    const confirmBtn = document.getElementById("btn-confirm-empire");
    const cancelBtn = document.getElementById("btn-cancel-empire");

    if (startEmpireBtn && modalOverlay) {
        
        // Show Modal on Card Click
        startEmpireBtn.addEventListener("click", () => {
            modalOverlay.classList.remove("hidden");
        });

        // Hide Modal on Cancel
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                modalOverlay.classList.add("hidden");
            });
        }

        // Hide Modal on Outside Click
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.add("hidden");
            }
        });

        // Initialize Game on Confirm
        if (confirmBtn) {
            confirmBtn.addEventListener("click", async () => {
                // Load the actual game page
                await loadPage("./pages/games/empire-builder.html");
                
                // Initialize game logic
                initEmpireBuilder();
            });
        }
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