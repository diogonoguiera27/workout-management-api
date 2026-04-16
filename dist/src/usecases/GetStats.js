import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";
dayjs.extend(utc);
const WEEKDAY_MAP = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
};
export class GetStats {
    async execute(input) {
        const analysisPeriod = this.buildAnalysisPeriod(input);
        const activeWorkoutPlan = await this.findActiveWorkoutPlan(input.userId);
        const sessions = await this.findSessionsInPeriod(activeWorkoutPlan.id, analysisPeriod);
        const consistencyByDay = this.buildConsistencyByDay(sessions);
        const completedSessions = this.findCompletedSessions(sessions);
        const completedWorkoutsCount = completedSessions.length;
        const conclusionRate = this.calculateConclusionRate(sessions.length, completedWorkoutsCount);
        const totalTimeInSeconds = this.calculateTotalTimeInSeconds(completedSessions);
        const workoutStreak = await this.calculateStreak(activeWorkoutPlan.id, activeWorkoutPlan.workoutDays, analysisPeriod.toDate);
        return this.buildGetStatsResponse({
            workoutStreak,
            consistencyByDay,
            completedWorkoutsCount,
            conclusionRate,
            totalTimeInSeconds,
        });
    }
    buildAnalysisPeriod(input) {
        return {
            fromDate: dayjs.utc(input.from).startOf("day"),
            toDate: dayjs.utc(input.to).endOf("day"),
        };
    }
    async findActiveWorkoutPlan(userId) {
        const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
            where: { userId, isActive: true },
            include: {
                workoutDays: {
                    include: { sessions: true },
                },
            },
        });
        if (!activeWorkoutPlan) {
            throw new NotFoundError("Active workout plan not found");
        }
        return activeWorkoutPlan;
    }
    async findSessionsInPeriod(workoutPlanId, analysisPeriod) {
        return prisma.workoutSession.findMany({
            where: {
                workoutDay: {
                    workoutPlanId,
                },
                startedAt: {
                    gte: analysisPeriod.fromDate.toDate(),
                    lte: analysisPeriod.toDate.toDate(),
                },
            },
        });
    }
    buildConsistencyByDay(sessions) {
        const consistencyByDay = {};
        sessions.forEach((session) => {
            const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
            if (!consistencyByDay[dateKey]) {
                consistencyByDay[dateKey] = {
                    workoutDayCompleted: false,
                    workoutDayStarted: false,
                };
            }
            consistencyByDay[dateKey].workoutDayStarted = true;
            if (session.completedAt !== null) {
                consistencyByDay[dateKey].workoutDayCompleted = true;
            }
        });
        return consistencyByDay;
    }
    findCompletedSessions(sessions) {
        return sessions.filter(this.isCompletedSession);
    }
    calculateConclusionRate(totalSessionsCount, completedWorkoutsCount) {
        return totalSessionsCount > 0
            ? completedWorkoutsCount / totalSessionsCount
            : 0;
    }
    calculateTotalTimeInSeconds(completedSessions) {
        return completedSessions.reduce((total, session) => {
            const start = dayjs.utc(session.startedAt);
            const end = dayjs.utc(session.completedAt);
            return total + end.diff(start, "second");
        }, 0);
    }
    isCompletedSession(session) {
        return session.completedAt !== null;
    }
    buildGetStatsResponse(stats) {
        return {
            workoutStreak: stats.workoutStreak,
            consistencyByDay: stats.consistencyByDay,
            completedWorkoutsCount: stats.completedWorkoutsCount,
            conclusionRate: stats.conclusionRate,
            totalTimeInSeconds: stats.totalTimeInSeconds,
        };
    }
    async calculateStreak(workoutPlanId, workoutDays, currentDate) {
        const workoutPlanWeekDays = new Set(workoutDays.map((workoutDay) => workoutDay.weekDay));
        const restWeekDays = new Set(workoutDays
            .filter((workoutDay) => workoutDay.isRest)
            .map((workoutDay) => workoutDay.weekDay));
        const allSessions = await prisma.workoutSession.findMany({
            where: {
                workoutDay: { workoutPlanId },
                completedAt: { not: null },
            },
            select: { startedAt: true },
        });
        const completedDates = new Set(allSessions.map((s) => dayjs.utc(s.startedAt).format("YYYY-MM-DD")));
        let streak = 0;
        let day = currentDate;
        for (let i = 0; i < 365; i++) {
            const weekDay = WEEKDAY_MAP[day.day()];
            if (!workoutPlanWeekDays.has(weekDay)) {
                day = day.subtract(1, "day");
                continue;
            }
            if (restWeekDays.has(weekDay)) {
                day = day.subtract(1, "day");
                continue;
            }
            const dateKey = day.format("YYYY-MM-DD");
            if (completedDates.has(dateKey)) {
                streak++;
                day = day.subtract(1, "day");
                continue;
            }
            break;
        }
        return streak;
    }
}
