import { getDatabase } from '../connection.mjs'; // Import the factory, not the default db

export class TaskRepository {
    constructor() {
        this.db = getDatabase('user_tasks'); 

        this.statements = {
            // TASKS
            getAll: this.db.prepare('SELECT * FROM tasks WHERE list_id = @listId ORDER BY completed ASC, priority ASC, id DESC'),
            getById: this.db.prepare('SELECT * FROM tasks WHERE id = ?'),
            insert: this.db.prepare('INSERT INTO tasks (content, priority, list_id) VALUES (@content, @priority, @listId)'),
            toggle: this.db.prepare('UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?'),
            delete: this.db.prepare('DELETE FROM tasks WHERE id = ?'),
            clearCompleted: this.db.prepare('DELETE FROM tasks WHERE completed = 1 AND list_id = @listId'),
            updateDescription: this.db.prepare('UPDATE tasks SET description = @description WHERE id = @id'),

            // LISTS
            getLists: this.db.prepare('SELECT * FROM todo_lists ORDER BY is_default DESC, id ASC'),
            addList: this.db.prepare('INSERT INTO todo_lists (title, icon) VALUES (@title, @icon)'),
            deleteList: this.db.prepare('DELETE FROM todo_lists WHERE id = ? AND is_default = 0') // Protect Inbox
        };
    }
    
    addTask(task) { 
        return this.statements.insert.run({
            content: task.content,
            priority: task.priority,
            listId: task.listId || 1 // Default to list_id 1 (Inbox) if not provided
        }); 
    }
    getTasksByList(listId) { return this.statements.getAll.all({ listId }); }
    getAllTasks() { return this.statements.getAll.all(); }
    toggleTask(id) { return this.statements.toggle.run(id); }
    removeTask(id) { return this.statements.delete.run(id); }
    clearCompleted(listId) { return this.statements.clearCompleted.run({ listId }); }
    getLists() { return this.statements.getLists.all(); }
    addList(title, icon) { return this.statements.addList.run({ title, icon }); }
    deleteList(id) { return this.statements.deleteList.run(id); }
    updateTaskDescription(id, description) { return this.statements.updateDescription.run({ id, description }); }
}