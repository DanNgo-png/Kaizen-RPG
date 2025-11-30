import { handleDropdowns } from './js/dropdown.js'
import { toggleSideBar } from './js/toggleSideBar.js'
import { loadPage } from './js/router.js'

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
            loadPage('./pages/focus.html');
        });
    }

    // 3. Setup "Plan" or "Home" Buttons (Optional)
    // If you have a button to go back home, add a listener for './pages/home.html'
}

app()