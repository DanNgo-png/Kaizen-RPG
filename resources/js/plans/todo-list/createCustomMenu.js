import { CustomMenuManager } from "../../components/CustomMenuManager.js";
import { TaskAPI } from "../../api/TaskAPI.js";

const menuManager = new CustomMenuManager();

/**
 * Menu for Sidebar Lists
 */
export function handleTodoListContextMenu(event, list, callbacks) {
    // Prevent context menu on Inbox (ID 1)
    if (list.id === 1 || list.is_default === 1) return;

    const { onDelete } = callbacks || {};

    const items = [
        {
            label: "Delete List",
            icon: '<i class="fa-solid fa-trash"></i>',
            danger: true,
            action: () => {
                if (confirm(`Delete list "${list.title}" and all its tasks?`)) {
                    TaskAPI.deleteTodoList(list.id);
                    if (onDelete) onDelete(list.id);
                }
            }
        }
    ];

    menuManager.show(event, items);
}

/**
 * Menu for Tasks
 */
export function handleTaskContextMenu(event, task, callbacks) {
    const { onEdit, onDelete, onToggle } = callbacks || {};

    const items = [
        {
            label: "Edit Task",
            icon: '<i class="fa-solid fa-pen"></i>',
            action: () => {
                if (onEdit) onEdit(task);
            }
        },
        {
            label: task.completed ? "Mark Incomplete" : "Mark Complete",
            icon: task.completed ? '<i class="fa-regular fa-square"></i>' : '<i class="fa-solid fa-check"></i>',
            action: () => {
                if (onToggle) onToggle(task.id);
            }
        },
        { separator: true },
        {
            label: "Delete Task",
            icon: '<i class="fa-solid fa-trash"></i>',
            danger: true,
            action: () => {
                if (confirm("Delete this task?")) {
                    if (onDelete) onDelete(task.id);
                }
            }
        }
    ];

    menuManager.show(event, items);
}