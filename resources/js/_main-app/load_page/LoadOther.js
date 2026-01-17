import { loadPage } from '../../router.js';
import { initMainSettings } from '../ImportManager.js';
import { toggleSideBar } from '../../toggleSideBar.js';

export function setupOtherNavigation() {
    // Sidebar Toggle
    const sidebarToggle = document.getElementById("sidebar-toggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", toggleSideBar);
    }

    // Main Settings
    const mainSettingsButton = document.querySelector(".main-settings-button");
    if (mainSettingsButton) {
        mainSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/main-settings/main-settings.html');
            initMainSettings();
        });
    }
}