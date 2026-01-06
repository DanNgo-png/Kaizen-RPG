import { getDatabase } from '../connection.mjs';

export class FocusSessionRepository {
    constructor() {
        this.db = getDatabase('focus_session_log');

        this.statements = {
            // Explicitly list columns to ensure mapping is correct
            insert: this.db.prepare(`
                INSERT INTO focus_sessions (tag, focus_seconds, break_seconds, ratio, created_at) 
                VALUES (@tag, @focus_seconds, @break_seconds, @ratio, @created_at)
            `),
            
            // ... rest of your statements
            getByRange: this.db.prepare(`
                SELECT * FROM focus_sessions 
                WHERE created_at BETWEEN @startDate AND @endDate 
                ORDER BY created_at DESC
            `),
            // ...
            getLifetimeStats: this.db.prepare(`
                SELECT 
                    SUM(focus_seconds) as total_focus,
                    COUNT(id) as total_sessions,
                    COUNT(DISTINCT date(created_at)) as total_days
                FROM focus_sessions
            `),
            // ...
            getDailyTotals: this.db.prepare(`
                SELECT date(created_at) as session_date, SUM(focus_seconds) as total_seconds
                FROM focus_sessions 
                GROUP BY session_date
                ORDER BY session_date DESC
            `),
            deleteAll: this.db.prepare(`DELETE FROM focus_sessions`),
            getAllTags: this.db.prepare('SELECT * FROM tags ORDER BY name ASC'),
            insertTag: this.db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (@name, @color)'),
            updateTag: this.db.prepare('UPDATE tags SET name = @name, color = @color WHERE id = @id'),
            deleteTag: this.db.prepare('DELETE FROM tags WHERE id = @id'),

            getAll: this.db.prepare(`
                SELECT tag, focus_seconds, break_seconds, ratio, created_at 
                FROM focus_sessions 
                ORDER BY created_at DESC
            `),
            
            insertWithDate: this.db.prepare(`
                INSERT INTO focus_sessions (tag, focus_seconds, break_seconds, ratio, created_at) 
                VALUES (@tag, @focus_seconds, @break_seconds, @ratio, @created_at)
            `)
        };
    }

    addSession(session) {
        return this.statements.insert.run(session);
    }

    // ... rest of methods
    deleteSession(id) {
        const stmt = this.db.prepare('DELETE FROM focus_sessions WHERE id = @id');
        return stmt.run({ id });
    }

    updateSession(id, tag) {
        const stmt = this.db.prepare('UPDATE focus_sessions SET tag = @tag WHERE id = @id');
        return stmt.run({ id, tag });
    }

    getSessionsByRange(startDate, endDate) {
        return this.statements.getByRange.all({ startDate, endDate });
    }

    getAllTags() {
        return this.statements.getAllTags.all();
    }

    addTag(name, color) {
        return this.statements.insertTag.run({ name, color });
    }

    updateTag(id, name, color) {
        return this.statements.updateTag.run({ id, name, color });
    }

    deleteTag(id) {
        return this.statements.deleteTag.run({ id });
    }

    getLifetimeStats() {
        return this.statements.getLifetimeStats.get();
    }

    getStreakStats(minSeconds = 0) {
        const rows = this.statements.getDailyTotals.all();
        if (!rows || rows.length === 0) return { currentStreak: 0, bestStreak: 0 };

        const dates = rows
            .filter(r => r.total_seconds >= minSeconds)
            .map(r => r.session_date);

        if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 };
        
        let currentStreak = 0;
        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); 
        
        const yDate = new Date(now);
        yDate.setDate(yDate.getDate() - 1);
        const yesterday = yDate.toLocaleDateString('en-CA');

        if (dates[0] === today || dates[0] === yesterday) {
            currentStreak = 1;
            for (let i = 0; i < dates.length - 1; i++) {
                const d1 = new Date(dates[i]);
                const d2 = new Date(dates[i+1]);
                const diffTime = Math.abs(d1 - d2);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays === 1) currentStreak++;
                else break; 
            }
        }

        let bestStreak = 1;
        let tempStreak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i+1]);
            const diffTime = Math.abs(d1 - d2);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) tempStreak++;
            else tempStreak = 1;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
        }

        return { currentStreak, bestStreak };
    }

    clearAllSessions() {
        return this.statements.deleteAll.run();
    }

    getAllSessions() {
        return this.statements.getAll.all();
    }

    importSessionsBulk(sessions) {
        const insert = this.statements.insertWithDate;
        const importTransaction = this.db.transaction((data) => {
            for (const row of data) {
                insert.run(row);
            }
        });
        importTransaction(sessions);
    }
}