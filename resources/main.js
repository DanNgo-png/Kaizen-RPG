import { handleDropdowns } from './js/dropdown.js'
import { toggleSideBar } from './js/toggleSideBar.js'
import { loadPage } from './js/router.js'
import { configureSidebar } from './js/focus/configureSidebar.js'
import { initFocusTimer } from './js/focus/focusTimer.js' 
import { initFlexibleFocusTimer } from './js/focus/flexible/focusTimer.js'

function app() {
    handleDropdowns()

    // Sidebar Toggle
    const sidebarToggle = document.getElementById("sidebar-toggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", toggleSideBar);
    }

    // Setup "Plan: Todo Lists" Button
    const todoListsButton = document.querySelector(".todo-lists-button");
    if (todoListsButton) {
        todoListsButton.addEventListener("click", async () => {
            await loadPage('./pages/plans/todo-lists.html');
            // placeholder(); 
        });
    }

    // Setup "Plan: Kanban Board" Button
    const kanbanBoardButton = document.querySelector(".kanban-board-button");
    if (kanbanBoardButton) {
        kanbanBoardButton.addEventListener("click", async () => {
            await loadPage('./pages/plans/kanban-board.html');
            // placeholder(); 
        });
    }

    // Setup "Focus: Standard" Button
    const focusStandardButton = document.querySelector(".focus-standard-button");
    if (focusStandardButton) {
        focusStandardButton.addEventListener("click", async () => {
            await loadPage('./pages/focus-standard.html');
            initFocusTimer(); 
        });
    }

    // Setup "Focus: Flexible" Button
    const focusFlexibleButton = document.querySelector(".focus-flexible-button");
    if (focusFlexibleButton) {
        focusFlexibleButton.addEventListener("click", async () => {
            await loadPage('./pages/focus-flexible.html');
            initFlexibleFocusTimer(); 
        });
    }

    // Setup "Focus: Settings" Button
    const focusSettingsButton = document.querySelector(".focus-settings-button");
    if (focusSettingsButton) {
        focusSettingsButton.addEventListener("click", async () => {
            await loadPage('./pages/focus-settings.html');
            // placeholder(); 
        });
    }

    // 3. Setup "Home" Buttons (Optional)
    // If you have a button to go back home, add a listener for './pages/home.html'

    // Event delegation for dynamically loaded content
    document.addEventListener('click', function (event) {
        // Configure Sidebar Button
        if (event.target.closest('#configure-footer-button')) {
            configureSidebar();
            return; // Stop further checks
        }

        // NOTE: You can add more delegated events here in the future
    });
}

app()