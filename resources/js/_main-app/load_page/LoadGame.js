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
    
    const gameSettingsButton = document.querySelector(".game-settings-button");
    if (gameSettingsButton) {
        gameSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/games/game-settings.html');
        });
    }
}