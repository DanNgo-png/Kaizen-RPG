import { EventRegistry } from "./js/events/EventRegistry.js";
import { GameAPI } from "./js/api/GameAPI.js";

// UI Routers
import { handleDropdowns } from './js/dropdown.js'
import { toggleSideBar } from './js/toggleSideBar.js'
import { loadPage } from './js/router.js'
import { configureSidebar } from './js/focus/configureSidebar.js'
import { initTodoList } from './js/plans/todoListManager.js'
import { initFocusTimer } from './js/focus/focusTimer.js'
import { initFlexibleFocusTimer } from './js/focus/flexible/focusTimer.js'
import { initSidebarTooltips } from './js/sidebarTooltip.js'
import { initHeatmap } from './js/analyze/heat-map.js'

async function app() {
    try {
        EventRegistry.init();
        await GameAPI.getMercenaries();
        handleDropdowns()
        initSidebarTooltips()

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
                initTodoList();
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
                await loadPage('./pages/focus/focus-standard.html');
                initFocusTimer();
            });
        }

        // Focus: Standard; Configure Sidebar
        document.addEventListener('click', function (event) {
            // Configure Sidebar Button
            if (event.target.closest('#configure-footer-button')) {
                configureSidebar();
                return; // Stop further checks
            }
            // NOTE: You can add more delegated events here in the future
        });

        // Setup "Focus: Flexible" Button
        const focusFlexibleButton = document.querySelector(".focus-flexible-button");
        if (focusFlexibleButton) {
            focusFlexibleButton.addEventListener("click", async () => {
                await loadPage('./pages/focus/focus-flexible.html');
                initFlexibleFocusTimer();
            });
        }

        // Setup "Focus: Settings" Button
        const focusSettingsButton = document.querySelector(".focus-settings-button");
        if (focusSettingsButton) {
            focusSettingsButton.addEventListener("click", async () => {
                await loadPage('./pages/focus/focus-settings.html');
                // placeholder(); 
            });
        }

        // "Timeframe: Today"
        const todayTimeframeButton = document.querySelector(".today-timeframe-button");
        if (todayTimeframeButton) {
            todayTimeframeButton.addEventListener("click", async () => {
                await loadPage('./pages/timeframes/today.html');
                // placeholder(); 
            });
        }

        // "Timeframe: This Week"
        const weekTimeframeButton = document.querySelector(".week-timeframe-button");
        if (weekTimeframeButton) {
            weekTimeframeButton.addEventListener("click", async () => {
                await loadPage('./pages/timeframes/this-week.html');
                // placeholder(); 
            });
        }

        // "Timeframe: This Quarter"
        const quarterTimeframeButton = document.querySelector(".quarter-timeframe-button");
        if (quarterTimeframeButton) {
            quarterTimeframeButton.addEventListener("click", async () => {
                await loadPage('./pages/timeframes/this-quarter.html');
                // placeholder(); 
            });
        }

        // "Timeframe: This Year"
        const yearTimeframeButton = document.querySelector(".year-timeframe-button");
        if (yearTimeframeButton) {
            yearTimeframeButton.addEventListener("click", async () => {
                await loadPage('./pages/timeframes/this-year.html');
                // placeholder(); 
            });
        }

        // "Analyze: Overview"
        const analyzeOverview = document.querySelector(".analyze-overview-button");
        if (analyzeOverview) {
            analyzeOverview.addEventListener("click", async () => {
                await loadPage('./pages/analyze/overview.html');
                // placeholder(); 
            });
        }

        // "Analyze: Day"
        const analyzeDay = document.querySelector(".analyze-day-button");
        if (analyzeDay) {
            analyzeDay.addEventListener("click", async () => {
                await loadPage('./pages/analyze/day.html');
                // placeholder(); 
            });
        }

        // "Analyze: Week"
        const analyzeWeek = document.querySelector(".analyze-week-button");
        if (analyzeWeek) {
            analyzeWeek.addEventListener("click", async () => {
                await loadPage('./pages/analyze/week.html');
                // placeholder(); 
            });
        }

        // "Analyze: Month"
        const analyzeMonth = document.querySelector(".analyze-month-button");
        if (analyzeMonth) {
            analyzeMonth.addEventListener("click", async () => {
                await loadPage('./pages/analyze/month.html');
                // placeholder(); 
            });
        }

        // "Analyze: Year"
        const analyzeYear = document.querySelector(".analyze-year-button");
        if (analyzeYear) {
            analyzeYear.addEventListener("click", async () => {
                await loadPage('./pages/analyze/year.html');
                initHeatmap(); 
            });
        }

        // "Analyze: Custom"
        const analyzeCustom = document.querySelector(".analyze-custom-button");
        if (analyzeCustom) {
            analyzeCustom.addEventListener("click", async () => {
                await loadPage('./pages/analyze/custom.html');
                // placeholder(); 
            });
        }

        const gameModeButton = document.querySelector(".game-modes-button");
        if (gameModeButton) {
            gameModeButton.addEventListener("click", async () => {
                await loadPage('./pages/games/game-modes.html');
                // placeholder(); 
            });
        }

        const partyButton = document.querySelector(".game-party-button");
        if (partyButton) {
            partyButton.addEventListener("click", async () => {
                await loadPage('./pages/games/party.html');
                // placeholder(); 
            });
        }

        const questButton = document.querySelector(".game-quests-button");
        if (questButton) {
            questButton.addEventListener("click", async () => {
                await loadPage('./pages/games/quests.html');
                // placeholder(); 
            });
        }

        const inventoryButton = document.querySelector(".game-inventory-button");
        if (inventoryButton) {
            inventoryButton.addEventListener("click", async () => {
                await loadPage('./pages/games/inventory.html');
                // placeholder(); 
            });
        }

        const gameSettingsButton = document.querySelector(".game-settings-button");
        if (gameSettingsButton) {
            gameSettingsButton.addEventListener("click", async () => {
                await loadPage('./pages/games/game-settings.html');
                // placeholder(); 
            });
        }

        const mainSettingsButton = document.querySelector(".main-settings-button");
        if (mainSettingsButton) {
            mainSettingsButton.addEventListener("click", async () => {
                await loadPage('./pages/main-settings/main-settings.html');
                // placeholder(); 
            });
        }
    } catch (error) {
        console.error("App initialization failed:", error);
    }
}

app()