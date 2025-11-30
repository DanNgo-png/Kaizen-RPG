import { handleDropdowns } from './js/dropdown.js'
import { toggleSideBar } from './js/toggleSideBar.js'
import { loadPage } from './js/router.js'
import { configureSidebar } from './js/focus/configureSidebar.js'

function app() {
    handleDropdowns()
    
    // Sidebar Toggle
    const sidebarToggle = document.getElementById("sidebar-toggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", toggleSideBar);
    }

    // Setup "Focus" Button
    const focusButton = document.querySelector(".focus-button");
    if (focusButton) {
        focusButton.addEventListener("click", () => {
            loadPage('./pages/focus-standard.html');
        });
    }

    // 3. Setup "Plan" or "Home" Buttons (Optional)
    // If you have a button to go back home, add a listener for './pages/home.html'

    // Event delegation for dynamically loaded content
    document.addEventListener('click', function(event) {
        // Configure Sidebar Button
        if (event.target.closest('#configure-footer-button')) {
            configureSidebar();
            return; // Stop further checks
        }

        // NOTE: You can add more delegated events here in the future
    });
}

app()