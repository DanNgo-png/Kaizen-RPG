import { loadPage } from '../../router.js';
import { 
    initFocusTimer, 
    initFlexibleFocusTimer, 
    initReviewSessions, 
    initFocusSettings, 
    configureSidebar 
} from '../ImportManager.js';

export function setupFocusNavigation() {
    // Focus: Standard
    const focusStandardButton = document.querySelector(".focus-standard-button");
    if (focusStandardButton) {
        focusStandardButton.addEventListener("click", async () => {
            await loadPage('./pages/focus/focus-standard.html');
            initFocusTimer();
        });
    }

    // Focus: Flexible
    const focusFlexibleButton = document.querySelector(".focus-flexible-button");
    if (focusFlexibleButton) {
        focusFlexibleButton.addEventListener("click", async () => {
            await loadPage('./pages/focus/focus-flexible.html');
            initFlexibleFocusTimer();
        });
    }

    // Focus: Review (Sidebar Button)
    const reviewBtn = document.querySelector(".focus-review-button");
    if (reviewBtn) {
        reviewBtn.addEventListener("click", async () => {
            await loadPage('./pages/focus/review-sessions.html');
            initReviewSessions();
        });
    }

    // Focus: Settings
    const focusSettingsButton = document.querySelector(".focus-settings-button");
    if (focusSettingsButton) {
        focusSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/focus/focus-settings.html');
            initFocusSettings();
        });
    }

    // --- DELEGATED LISTENERS (Elements inside pages) ---
    
    // Focus: Standard -> Configure Sidebar
    document.addEventListener('click', function (event) {
        if (event.target.closest('#configure-footer-button')) {
            configureSidebar();
        }
    });

    // Focus: Standard -> Review Log Button
    document.addEventListener('click', async (event) => {
        if (event.target.closest('.log-footer-button')) {
            await loadPage('./pages/focus/review-sessions.html');
            initReviewSessions();
        }
    });
}