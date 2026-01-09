import { getDatabase } from '../connection.mjs'; // Import the factory, not the default db

export class TaskRepository {
    constructor() {
        this.db = getDatabase('user_tasks'); 

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM tasks ORDER BY completed ASC, priority ASC, id DESC'),
            getById: this.db.prepare('SELECT * FROM tasks WHERE id = ?'),
            insert: this.db.prepare('INSERT INTO tasks (content, priority) VALUES (@content, @priority)'),
            toggle: this.db.prepare('UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?'),
            delete: this.db.prepare('DELETE FROM tasks WHERE id = ?'),
            clearCompleted: this.db.prepare('DELETE FROM tasks WHERE completed = 1'),
            updateDescription: this.db.prepare('UPDATE tasks SET description = @description WHERE id = @id')
        };
    }

    getAllTasks() { return this.statements.getAll.all(); }
    addTask(task) { return this.statements.insert.run(task); }
    toggleTask(id) { return this.statements.toggle.run(id); }
    removeTask(id) { return this.statements.delete.run(id); }
    clearCompleted() { return this.statements.clearCompleted.run(); }
    updateTaskDescription(id, description) { return this.statements.updateDescription.run({ id, description }); }
}