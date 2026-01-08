import { getDatabase } from '../connection.mjs';

export class TimeframeRepository {
    constructor() {
        this.db = getDatabase('timeframe_data');

        this.statements = {
            // ... (keep goal statements) ...
            getDailyGoal: this.db.prepare("SELECT * FROM goals WHERE type = 'day' AND timeframe_key = ?"),
            upsertDailyGoal: this.db.prepare("INSERT INTO goals (title, type, timeframe_key) VALUES (@title, 'day', @key) ON CONFLICT(id) DO UPDATE SET title = excluded.title"),

            // --- DAILY PLAN ENTRIES ---
            
            // Get all entries for a specific date
            getDayEntries: this.db.prepare(`
                SELECT * FROM daily_plan_entries WHERE date_key = ?
            `),

            // Add a task to the schedule
            addToDay: this.db.prepare(`
                INSERT INTO daily_plan_entries (task_id, date_key, start_time, duration)
                VALUES (@task_id, @date_key, @start_time, @duration)
            `),

            // Update time/duration
            updateEntry: this.db.prepare(`
                UPDATE daily_plan_entries 
                SET start_time = @start_time, duration = @duration 
                WHERE id = @id
            `),

            // Remove from schedule (Back to pool)
            removeFromDay: this.db.prepare(`
                DELETE FROM daily_plan_entries WHERE id = @id
            `),

            // Update just the duration
            updateDuration: this.db.prepare(`
                UPDATE daily_plan_entries 
                SET duration = @duration 
                WHERE id = @id
            `),

            // Remove from schedule (Back to pool)
            removeFromDay: this.db.prepare(`
                DELETE FROM daily_plan_entries WHERE id = @id
            `),

            getRangeEntries: this.db.prepare(`
                SELECT * FROM daily_plan_entries 
                WHERE date_key BETWEEN @startDate AND @endDate
            `),

            // --- GOALS (Pillars, Quarter Objectives) ---
            insertGoal: this.db.prepare(`
                INSERT INTO goals (title, type, timeframe_key, status) 
                VALUES (@title, @type, @key, 'active')
            `),

            deleteGoal: this.db.prepare(`
                DELETE FROM goals WHERE id = @id
            `),

            toggleGoalStatus: this.db.prepare(`
                UPDATE goals 
                SET status = CASE WHEN status = 'active' THEN 'done' ELSE 'active' END 
                WHERE id = @id
            `),

            getQuarterGoals: this.db.prepare(`
                SELECT * FROM goals 
                WHERE type = 'quarter' AND timeframe_key = ?
            `),

            getYearGoals: this.db.prepare(`
                SELECT * FROM goals 
                WHERE timeframe_key LIKE @yearPattern
                ORDER BY created_at ASC
            `)
        };
    }

    getDailyGoal(dateKey) { return this.statements.getDailyGoal.get(dateKey); }
    setDailyGoal(dateKey, title) { 
        this.db.prepare("DELETE FROM goals WHERE type='day' AND timeframe_key = ?").run(dateKey);
        return this.statements.upsertDailyGoal.run({ title, key: dateKey });
    }

    getDayEntries(dateKey) { return this.statements.getDayEntries.all(dateKey); }
    
    addToDay(taskId, dateKey, startTime = null, duration = 30) {
        try {
            return this.statements.addToDay.run({ task_id: taskId, date_key: dateKey, start_time: startTime, duration });
        } catch (e) {
            // Ignore unique constraint violation (already added)
            return null;
        }
    }

    updateDuration(id, duration) {
        return this.statements.updateDuration.run({ id, duration });
    }

    removeFromDay(id) {
        return this.statements.removeFromDay.run({ id });
    }

    getRangeEntries(startDate, endDate) {
        return this.statements.getRangeEntries.all({ startDate, endDate });
    }

    getYearGoals(year) {
        // Fetches pillars (key='2025') and quarters (key='2025-Q1')
        return this.statements.getYearGoals.all({ yearPattern: `${year}%` });
    }

    addGoal(title, type, key) {
        return this.statements.insertGoal.run({ title, type, key });
    }

    deleteGoal(id) {
        return this.statements.deleteGoal.run({ id });
    }

    toggleGoalStatus(id) {
        return this.statements.toggleGoalStatus.run({ id });
    }

    // Helper for specific quarter fetch
    getGoalsByKey(key, type='quarter') {
        // We reuse the generic query logic or specific statement
        // For simplicity using raw prepare here or the statement defined above
        return this.db.prepare("SELECT * FROM goals WHERE type = ? AND timeframe_key = ?").all(type, key);
    }
}