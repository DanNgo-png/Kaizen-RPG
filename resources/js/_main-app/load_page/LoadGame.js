import { loadPage } from '../../router.js';
import { initMenuButtons, initParty } from '../ImportManager.js';

export function setupGameNavigation() {
    const playGameButton = document.querySelector(".play-game-button");
    if (playGameButton) {
        playGameButton.addEventListener("click", async () => {
            await loadPage('./pages/games/play-game.html');
            initMenuButtons();
        });
    }

    const partyButton = document.querySelector(".game-party-button");
    if (partyButton) {
        partyButton.addEventListener("click", async () => {
            await loadPage('./pages/games/party.html');
            initParty();
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
            await loadPage('./pages/games/inventory.html');
        });
    }

    const gameSettingsButton = document.querySelector(".game-settings-button");
    if (gameSettingsButton) {
        gameSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/games/game-settings.html');
        });
    }
}