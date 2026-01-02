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
                    COUNT(DISTINCT date(created_at)) as total_days
                FROM focus_sessions
            `)
        };
    }

    addSession(session) {
        // Returns { changes: 1, lastInsertRowid: ... }
        return this.statements.insert.run(session);
    }

    getSessionsByRange(startDate, endDate) {
        return this.statements.getByRange.all({ startDate, endDate });
    }

    getLifetimeStats() {
        return this.statements.getLifetimeStats.get();
    }
}