import { loadPage } from '../../router.js';
import { initMenuButtons, initManagement } from '../ImportManager.js';

export function setupGameNavigation() {
    const playGameButton = document.querySelector(".play-game-button");
    if (playGameButton) {
        playGameButton.addEventListener("click", async () => {
            await loadPage('./pages/games/play-game.html');
            initMenuButtons();
        });
    }

    const managementButton = document.querySelector(".game-party-button");
    if (managementButton) {
        managementButton.addEventListener("click", async () => {
            await loadPage('./pages/games/management.html'); 
            initManagement();
        });
    }

    const questButton = document.querySelector(".game-quests-button");
    if (questButton) {
        questButton.addEventListener("click", async () => {
            await loadPage('./pages/games/quests.html');
        });
    }

    const inventoryButton = document.querySelector(".game-inventory-button");
    if (inventoryButton) {
        inventoryButton.addEventListener("click", async () => {
            await loadPage('./pages/games/management.html');
            initManagement();
        });
    }
    
    const gameSettingsButton = document.querySelector(".game-settings-button");
    if (gameSettingsButton) {
        gameSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/games/game-settings.html');
        });
    }
}