import { TaskRepository } from "../database/SQLite3/repositories/TaskRepository.mjs";
import { TimeframeRepository } from "../database/SQLite3/repositories/TimeframeRepository.mjs";

export class TimeframeController {
    constructor() {
        this.taskRepo = new TaskRepository();
        this.timeframeRepo = new TimeframeRepository();
    }

    register(app) {
        // ... (Existing getTodayData, setDailyGoal, scheduleTask, unscheduleTask, updateScheduleDuration handlers) ...
        app.events.on("getTodayData", (payload) => this._handleGetTodayData(app, payload));
        app.events.on("setDailyGoal", (payload) => this.timeframeRepo.setDailyGoal(payload.dateKey, payload.title));
        app.events.on("scheduleTask", (payload) => {
            this.timeframeRepo.addToDay(payload.taskId, payload.dateKey, payload.startTime);
            this._refreshToday(app, payload.dateKey);
        });
        app.events.on("unscheduleTask", (payload) => {
            this.timeframeRepo.removeFromDay(payload.scheduleId);
            this._refreshToday(app, payload.dateKey);
        });
        app.events.on("updateScheduleDuration", (payload) => {
            this.timeframeRepo.updateDuration(payload.scheduleId, payload.duration);
            this._refreshToday(app, payload.dateKey);
        });

        // Weekly Plan
        app.events.on("getWeekPlanData", (payload) => this._handleGetWeekPlanData(app, payload));

        // Quarter Data
        app.events.on("getQuarterData", (payload) => {
            const { year, quarter } = payload; 
            const key = `${year}-Q${quarter}`;
            this._broadcastQuarterData(app, key);
        });

        // Year Plan Data
        app.events.on("getYearPlanData", (payload) => {
            try {
                const year = payload.year || new Date().getFullYear();
                const data = this._constructYearPlanData(year);
                app.events.broadcast("receiveYearPlanData", data);
            } catch (error) {
                console.error("❌ Error fetching year plan:", error);
                app.events.broadcast("receiveYearPlanData", null);
            }
        });

        // Add Goal
        app.events.on("addTimeframeGoal", (payload) => {
            try {
                this.timeframeRepo.addGoal(payload.title, payload.type, payload.key);
                
                if (payload.type === 'quarter') {
                    this._broadcastQuarterData(app, payload.key);
                } else if (payload.type === 'pillar') {
                    // payload.key is '2025' for pillars
                    this._broadcastYearData(app, payload.key); 
                }
            } catch (err) {
                console.error("❌ Error adding goal:", err);
            }
        });

        // Delete & Toggle
        app.events.on("deleteTimeframeGoal", (payload) => this._handleGoalUpdate(app, payload, 'delete'));
        app.events.on("toggleTimeframeGoal", (payload) => this._handleGoalUpdate(app, payload, 'toggle'));
    }

    // --- Handlers & Helpers ---

    _handleGetTodayData(app, payload) {
        try {
            const dateKey = payload.dateKey;
            const allTasks = this.taskRepo.getAllTasks();
            const dayEntries = this.timeframeRepo.getDayEntries(dateKey);
            const dailyGoal = this.timeframeRepo.getDailyGoal(dateKey);

            const entryMap = new Map();
            dayEntries.forEach(entry => entryMap.set(entry.task_id, entry));

            const poolTasks = [];
            const scheduledTasks = [];
            const now = new Date();

            allTasks.forEach(task => {
                const created = new Date(task.created_at);
                const diffTime = Math.abs(now - created);
                const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                let ageTag = null;
                if (ageDays > 3) ageTag = `${ageDays}D OLD`;

                const commonData = { ...task, ageTag: ageTag };

                if (entryMap.has(task.id)) {
                    const entry = entryMap.get(task.id);
                    scheduledTasks.push({
                        ...commonData,
                        schedule_id: entry.id,
                        start_time: entry.start_time,
                        duration: entry.duration
                    });
                } else if (!task.completed) {
                    poolTasks.push(commonData);
                }
            });

            app.events.broadcast("receiveTodayData", {
                dateKey,
                dailyGoal: dailyGoal || { title: null },
                pool: poolTasks,
                schedule: scheduledTasks
            });
        } catch (error) {
            console.error("❌ Error fetching today data:", error);
        }
    }

    _handleGetWeekPlanData(app, payload) {
        try {
            const { startDate, endDate } = payload;
            const allTasks = this.taskRepo.getAllTasks();
            const rangeEntries = this.timeframeRepo.getRangeEntries(startDate, endDate);
            const scheduleMap = new Map();
            rangeEntries.forEach(entry => scheduleMap.set(entry.task_id, entry));

            const backlog = [];
            const weekSchedule = {};

            let curr = new Date(startDate);
            const end = new Date(endDate);
            while (curr <= end) {
                const dateKey = curr.toISOString().split('T')[0];
                weekSchedule[dateKey] = [];
                curr.setDate(curr.getDate() + 1);
            }

            allTasks.forEach(task => {
                const isScheduled = scheduleMap.has(task.id);
                if (isScheduled) {
                    const entry = scheduleMap.get(task.id);
                    if (weekSchedule[entry.date_key]) {
                        weekSchedule[entry.date_key].push({
                            ...task,
                            schedule_id: entry.id,
                            duration: entry.duration
                        });
                    }
                } else if (!task.completed) {
                    backlog.push(task);
                }
            });

            app.events.broadcast("receiveWeekPlanData", { backlog, weekSchedule });
        } catch (error) {
            console.error("❌ Error fetching week plan:", error);
        }
    }

    _handleGoalUpdate(app, payload, action) {
        try {
            if (action === 'delete') this.timeframeRepo.deleteGoal(payload.id);
            if (action === 'toggle') this.timeframeRepo.toggleGoalStatus(payload.id);

            if (payload.context === 'quarter') this._broadcastQuarterData(app, payload.key);
            if (payload.context === 'year') this._broadcastYearData(app, payload.key);
        } catch (err) {
            console.error(`❌ Error ${action} goal:`, err);
        }
    }

    _refreshToday(app, dateKey) {
        app.events.broadcast("refreshTodayView", { dateKey });
    }

    _broadcastQuarterData(app, key) {
        try {
            const goals = this.timeframeRepo.getGoalsByKey(key, 'quarter');
            app.events.broadcast("receiveQuarterData", { goals, weeks: [] });
        } catch (err) {
            console.error(err);
        }
    }

    _broadcastYearData(app, yearKey) {
        try {
            const data = this._constructYearPlanData(yearKey);
            app.events.broadcast("receiveYearPlanData", data);
        } catch(err) { 
            console.error(err); 
        }
    }

    // Shared Helper to ensure consistent Data Structure
    _constructYearPlanData(year) {
        const rawGoals = this.timeframeRepo.getYearGoals(year);

        const data = {
            year: year,
            pillars: [],
            quarters: {
                1: { id: 'Q1', title: 'Q1: Foundation', goals: [] },
                2: { id: 'Q2', title: 'Q2: Acceleration', goals: [] },
                3: { id: 'Q3', title: 'Q3: Expansion', goals: [] },
                4: { id: 'Q4', title: 'Q4: Completion', goals: [] }
            },
            stats: {
                totalGoals: 0,
                completedGoals: 0
            }
        };

        rawGoals.forEach(g => {
            data.stats.totalGoals++;
            if (g.status === 'done') data.stats.completedGoals++;

            if (g.type === 'pillar') {
                data.pillars.push(g);
            } else if (g.type === 'quarter') {
                // timeframe_key expected: "2025-Q1"
                const parts = g.timeframe_key.split('-');
                if (parts.length > 1) {
                    const qStr = parts[1].replace('Q', '');
                    const qNum = parseInt(qStr);
                    if (data.quarters[qNum]) {
                        data.quarters[qNum].goals.push(g);
                    }
                }
            }
        });

        return data;
    }
}