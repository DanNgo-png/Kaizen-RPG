import { CustomMenuManager } from "../../components/CustomMenuManager.js";
import { TaskAPI } from "../../api/TaskAPI.js";

const menuManager = new CustomMenuManager();

/**
 * Menu for Sidebar Lists
 */
export function handleTodoListContextMenu(event, list, callbacks) {  
    const { onDelete } = callbacks || {};
    const isDeletable = (list.id !== 1 && list.is_default !== 1);

    const items = [
        {
            label: "Create Sub-list",
            icon: '<i class="fa-solid fa-turn-up fa-rotate-90"></i>', // L-shaped arrow
            action: () => {
                const name = prompt(`New list inside "${list.title}":`);
                if (name?.trim()) {
                    TaskAPI.addTodoList(name.trim(), "fa-solid fa-list", list.id);
                }
            }
        }
    ];

    // Only add delete option for non-default lists
    if (isDeletable) {
        items.push({ separator: true });
        items.push({
            label: "Delete List",
            icon: '<i class="fa-solid fa-trash"></i>',
            danger: true,
            action: () => {
                if (confirm(`Delete list "${list.title}" and all its tasks?`)) {
                    TaskAPI.deleteTodoList(list.id);
                    if (onDelete) onDelete(list.id);
                }
            }
        });
    }

    menuManager.show(event, items);
}

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