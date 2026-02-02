import { getDatabase } from '../connection.mjs';

export class HabitRepository {
    constructor() {
        this.db = getDatabase('habits_data');

        this.statements = {
            getAll: this.db.prepare("SELECT * FROM habits WHERE archived = 0 ORDER BY stack_name, id"),
            getArchived: this.db.prepare("SELECT * FROM habits WHERE archived = 1 ORDER BY stack_name, id"),
            create: this.db.prepare("INSERT INTO habits (title, stack_name, icon, target_days) VALUES (@title, @stack, @icon, @target)"),
            update: this.db.prepare("UPDATE habits SET title = @title, stack_name = @stack, icon = @icon WHERE id = @id"),
            delete: this.db.prepare("DELETE FROM habits WHERE id = ?"),
            
            getLogsRange: this.db.prepare(`
                SELECT * FROM habit_logs 
                WHERE log_date BETWEEN @startDate AND @endDate
            `),
            toggleLog: this.db.prepare(`
                INSERT INTO habit_logs (habit_id, log_date, status) 
                VALUES (@habitId, @date, 1)
                ON CONFLICT(habit_id, log_date) DO UPDATE SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
            `),
            toggleArchive: this.db.prepare("UPDATE habits SET archived = CASE WHEN archived = 0 THEN 1 ELSE 0 END WHERE id = ?"),
            getMeta: this.db.prepare("SELECT value FROM habit_metadata WHERE key = ?"),
            setMeta: this.db.prepare("INSERT OR REPLACE INTO habit_metadata (key, value) VALUES (@key, @value)")
        };
    }

    getHabits() { return this.statements.getAll.all(); }
    getArchivedHabits() { return this.statements.getArchived.all(); }
    createHabit(data) { return this.statements.create.run(data); }
    updateHabit(id, data) { return this.statements.update.run({ ...data, id }); }
    deleteHabit(id) { return this.statements.delete.run(id); }
    getLogs(startDate, endDate) { return this.statements.getLogsRange.all({ startDate, endDate }); }

    toggleDay(habitId, date) {
        this.statements.toggleLog.run({ habitId, date });
        const row = this.db.prepare("SELECT status FROM habit_logs WHERE habit_id = ? AND log_date = ?").get(habitId, date);
        return row ? row.status : 0;
    }

    toggleArchive(id) {
        this.statements.toggleArchive.run(id);
    }

    getStackOrder() {
        const result = this.statements.getMeta.get('stack_order');
        return result ? JSON.parse(result.value) : [];
    }

    saveStackOrder(orderArray) {
        const json = JSON.stringify(orderArray);
        this.statements.setMeta.run({ key: 'stack_order', value: json });
    }

    getStackConfig() {
        const result = this.statements.getMeta.get('stack_config');
        return result ? JSON.parse(result.value) : {};
    }

    saveStackDetails(stackName, icon, color) {
        const config = this.getStackConfig();
        config[stackName] = { icon, color };
        const json = JSON.stringify(config);
        this.statements.setMeta.run({ key: 'stack_config', value: json });
    }

    getGlobalHabitOrder() {
        const result = this.statements.getMeta.get('global_habit_order');
        return result ? JSON.parse(result.value) : [];
    }

    saveGlobalHabitOrder(orderArray) {
        // Ensure we store integers
        const cleanOrder = orderArray.map(id => parseInt(id)).filter(id => !isNaN(id));
        const json = JSON.stringify(cleanOrder);
        this.statements.setMeta.run({ key: 'global_habit_order', value: json });
    }
}