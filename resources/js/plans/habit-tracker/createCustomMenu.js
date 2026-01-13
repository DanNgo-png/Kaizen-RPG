import { CustomMenuManager } from "../../components/CustomMenuManager.js";
import { HabitAPI } from "../../api/HabitAPI.js";

const menuManager = new CustomMenuManager();

export function handleHabitContextMenu(event, habit, onEditCallback) {
    const isMastered = habit.archived === 1;

    const items = [
        {
            label: "Edit Habit",
            icon: '<i class="fa-solid fa-pen"></i>',
            action: () => {
                if (onEditCallback) onEditCallback(habit);
            }
        },
        {
            label: isMastered ? "Restore to Active" : "Archive (Mastered)",
            icon: isMastered ? '<i class="fa-solid fa-box-open"></i>' : '<i class="fa-solid fa-trophy"></i>',
            action: () => {
                HabitAPI.toggleArchive(habit.id);
            }
        },
        { separator: true },
        {
            label: "Delete Permanently",
            icon: '<i class="fa-solid fa-trash"></i>',
            danger: true,
            action: () => {
                if (confirm(`Delete "${habit.title}"? This cannot be undone.`)) {
                    HabitAPI.deleteHabit(habit.id);
                }
            }
        }
    ];

    menuManager.show(event, items);
}