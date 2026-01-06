import { getDatabase } from '../connection.mjs';

export class FocusSessionRepository {
    constructor() {
        this.db = getDatabase('focus_session_log');

        this.statements = {
            insert: this.db.prepare(`
                INSERT INTO focus_sessions (tag, focus_seconds, break_seconds, ratio) 
                VALUES (@tag, @focus_seconds, @break_seconds, @ratio)
            `),
            getByRange: this.db.prepare(`
                SELECT * FROM focus_sessions 
                WHERE created_at BETWEEN @startDate AND @endDate 
                ORDER BY created_at DESC
            `),
            getLifetimeStats: this.db.prepare(`
                SELECT 
                    SUM(focus_seconds) as total_focus,
                    COUNT(id) as total_sessions,
                    COUNT(DISTINCT date(created_at, 'localtime')) as total_days
                FROM focus_sessions
            `),
            getDailyTotals: this.db.prepare(`
                SELECT date(created_at, 'localtime') as session_date, SUM(focus_seconds) as total_seconds
                FROM focus_sessions 
                GROUP BY session_date
                ORDER BY session_date DESC
            `),
            deleteAll: this.db.prepare(`DELETE FROM focus_sessions`),
            getAllTags: this.db.prepare('SELECT * FROM tags ORDER BY name ASC'),
            insertTag: this.db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (@name, @color)'),
            updateTag: this.db.prepare('UPDATE tags SET name = @name, color = @color WHERE id = @id'),
            deleteTag: this.db.prepare('DELETE FROM tags WHERE id = @id'),

            // For Export
            getAll: this.db.prepare(`
                SELECT tag, focus_seconds, break_seconds, ratio, created_at 
                FROM focus_sessions 
                ORDER BY created_at DESC
            `),
            
            // For Import (Includes created_at)
            insertWithDate: this.db.prepare(`
                INSERT INTO focus_sessions (tag, focus_seconds, break_seconds, ratio, created_at) 
                VALUES (@tag, @focus_seconds, @break_seconds, @ratio, @created_at)
            `)
        };
    }

    addSession(session) {
        // Returns { changes: 1, lastInsertRowid: ... }
        return this.statements.insert.run(session);
    }

    deleteSession(id) {
        const stmt = this.db.prepare('DELETE FROM focus_sessions WHERE id = @id');
        return stmt.run({ id });
    }

    updateSession(id, tag) {
        // Only allowing tag updates for now as per prompt
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
        // 1. Get aggregated daily totals
        const rows = this.statements.getDailyTotals.all();
        
        if (!rows || rows.length === 0) {
            return { currentStreak: 0, bestStreak: 0 };
        }

        // 2. Filter for qualified days
        // Only days meeting the goal count towards the streak chain
        const dates = rows
            .filter(r => r.total_seconds >= minSeconds)
            .map(r => r.session_date); // ['2025-12-06', '2025-12-05', ...]

        if (dates.length === 0) {
            return { currentStreak: 0, bestStreak: 0 };
        }
        
        // 3. Calculate Current Streak
        let currentStreak = 0;
        
        // Get Today's and Yesterday's dates in YYYY-MM-DD (Local Time)
        // Note: 'en-CA' is reliable for YYYY-MM-DD format
        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); 
        
        const yDate = new Date(now);
        yDate.setDate(yDate.getDate() - 1);
        const yesterday = yDate.toLocaleDateString('en-CA');

        // Check if the most recent QUALIFIED entry is today or yesterday
        if (dates[0] === today || dates[0] === yesterday) {
            currentStreak = 1;
            
            // Iterate backwards to find chain
            for (let i = 0; i < dates.length - 1; i++) {
                const d1 = new Date(dates[i]);
                const d2 = new Date(dates[i+1]);
                
                // Difference in time (ms) -> Days
                const diffTime = Math.abs(d1 - d2);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    break; // Streak broken
                }
            }
        }

        // 4. Calculate Best Streak
        let bestStreak = 1;
        let tempStreak = 1;

        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i+1]);
            const diffTime = Math.abs(d1 - d2);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }

            if (tempStreak > bestStreak) {
                bestStreak = tempStreak;
            }
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