import { renderTasks } from "../plans/todoListManager.js";

export const TaskHandler = {
    /**
    * Handle 'receiveTasks' from server
    * @param {CustomEvent} event
    */
    onReceiveData: (event) => {
        const tasks = event.detail;
        console.log("📦 Tasks received:", tasks);
        // Call the UI renderer in todoListManager
        renderTasks(tasks);
    }
};