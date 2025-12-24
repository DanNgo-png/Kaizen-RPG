// To-do list and active habits
import database from '../connection.mjs';

export class TaskRepository {
    constructor() {
        this.statements = {
            // Order by completed (0 first), then priority (p1, p2...), then ID desc
            getAll: database.prepare('SELECT * FROM tasks ORDER BY completed ASC, priority ASC, id DESC'),
            getById: database.prepare('SELECT * FROM tasks WHERE id = ?'),
            insert: database.prepare('INSERT INTO tasks (content, priority) VALUES (@content, @priority)'),
            toggle: database.prepare('UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?'),
            delete: database.prepare('DELETE FROM tasks WHERE id = ?'),
            clearCompleted: database.prepare('DELETE FROM tasks WHERE completed = 1')
        };
    }

    getAllTasks() {
        return this.statements.getAll.all();
    }

    addTask(task) {
        return this.statements.insert.run(task);
    }

    toggleTask(id) {
        return this.statements.toggle.run(id);
    }
    
    removeTask(id) {
        return this.statements.delete.run(id);
    }

    clearCompleted() {
        return this.statements.clearCompleted.run();
    }
}