import { loadPage } from '../../router.js';
import { initTodoList, initHabitTracker, initKanbanBoard } from '../ImportManager.js';

export function setupPlanNavigation() {
    const todoListsButton = document.querySelector(".todo-lists-button");
    if (todoListsButton) {
        todoListsButton.addEventListener("click", async () => {
            await loadPage('./pages/plans/todo-lists.html');
            initTodoList();
        });
    }

    const habitTrackerButton = document.querySelector(".habit-tracker-button");
    if (habitTrackerButton) {
        habitTrackerButton.addEventListener("click", async () => {
            await loadPage('./pages/plans/habit-tracker.html');
            initHabitTracker();
        });
    }

    const kanbanBoardButton = document.querySelector(".kanban-board-button");
    if (kanbanBoardButton) {
        kanbanBoardButton.addEventListener("click", async () => {
            await loadPage('./pages/plans/kanban-board.html');
            initKanbanBoard();
        });
    }
}