import { getDatabase } from '../connection.mjs';

export class HabitRepository {
    constructor() {
        this.db = getDatabase('habits_data');

        this.statements = {
            getAll: this.db.prepare("SELECT * FROM habits WHERE archived = 0 ORDER BY stack_name, id"),
            create: this.db.prepare("INSERT INTO habits (title, stack_name, icon, target_days) VALUES (@title, @stack, @icon, @target)"),
            delete: this.db.prepare("DELETE FROM habits WHERE id = ?"),
            
            // Logs
            getLogsRange: this.db.prepare(`
                SELECT * FROM habit_logs 
                WHERE log_date BETWEEN @startDate AND @endDate
            `),
            toggleLog: this.db.prepare(`
                INSERT INTO habit_logs (habit_id, log_date, status) 
                VALUES (@habitId, @date, 1)
                ON CONFLICT(habit_id, log_date) DO UPDATE SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
            `),
            
            // Stats
            getStreak: this.db.prepare(`
                SELECT count(*) as count FROM habit_logs WHERE habit_id = ? AND status = 1
            `)
        };
    }

    // Update getAll to support filtering by archived status
    getHabits(includeArchived = false) {
        if (includeArchived) {
            return this.db.prepare("SELECT * FROM habits ORDER BY stack_name, id").all();
        }
        return this.db.prepare("SELECT * FROM habits WHERE archived = 0 ORDER BY stack_name, id").all();
    }
    
    createHabit(data) { 
        return this.statements.create.run(data); 
    }

    deleteHabit(id) { return this.statements.delete.run(id); }

    getLogs(startDate, endDate) {
        return this.statements.getLogsRange.all({ startDate, endDate });
    }

    toggleDay(habitId, date) {
        this.statements.toggleLog.run({ habitId, date });
        // Return new status
        const row = this.db.prepare("SELECT status FROM habit_logs WHERE habit_id = ? AND log_date = ?").get(habitId, date);
        return row ? row.status : 0;
    }

    toggleArchive(id) {
        // Toggle the 'archived' status (0 or 1)
        this.db.prepare("UPDATE habits SET archived = CASE WHEN archived = 0 THEN 1 ELSE 0 END WHERE id = ?").run(id);
    }
}