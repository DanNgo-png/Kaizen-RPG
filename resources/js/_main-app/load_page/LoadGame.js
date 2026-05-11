import { loadPage } from '../../router.js';
import { 
    initMenuButtons, 
    initGameSettings, 
    initWorldMap, 
    initGameModes, 
    initLoadCampaign 
} from '../ImportManager.js';

export function setupGameNavigation() {
    const playGameButton = document.querySelector(".play-game-button");
    if (playGameButton) {
        playGameButton.addEventListener("click", async () => {
            // Determine the last active game page (default to Main Menu)
            const targetPage = sessionStorage.getItem('kaizen_active_game_page') || './pages/games/play-game.html';
            
            await loadPage(targetPage);

            // Fire the correct init function based on the URL retrieved
            if (targetPage.includes('world-map.html')) {
                initWorldMap();
            } else if (targetPage.includes('game-modes.html')) {
                initGameModes();
            } else if (targetPage.includes('load-campaign.html')) {
                initLoadCampaign();
            } else {
                initMenuButtons();
            }
        });
    }
    
    const gameSettingsButton = document.querySelector(".game-settings-button");
    if (gameSettingsButton) {
        gameSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/games/game-settings.html');
            initGameSettings();
        });
    }
}