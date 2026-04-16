import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

const WEEKDAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface GetStatsInput {
  userId: string;
  from: string;
  to: string;
}

interface GetStatsConsistencyByDay {
  workoutDayCompleted: boolean;
  workoutDayStarted: boolean;
}

interface GetStatsOutput {
  workoutStreak: number;
  consistencyByDay: Record<string, GetStatsConsistencyByDay>;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

interface GetStatsAnalysisPeriod {
  fromDate: dayjs.Dayjs;
  toDate: dayjs.Dayjs;
}

interface GetStatsSession {
  startedAt: Date;
  completedAt: Date | null;
}

interface GetStatsCompletedSession {
  startedAt: Date;
  completedAt: Date;
}

export class GetStats {
  async execute(input: GetStatsInput): Promise<GetStatsOutput> {
    const analysisPeriod = this.buildAnalysisPeriod(input);

    const activeWorkoutPlan = await this.findActiveWorkoutPlan(input.userId);
    const sessions = await this.findSessionsInPeriod(
      activeWorkoutPlan.id,
      analysisPeriod,
    );

    const consistencyByDay = this.buildConsistencyByDay(sessions);
    const completedSessions = this.findCompletedSessions(sessions);
    const completedWorkoutsCount = completedSessions.length;
    const conclusionRate = this.calculateConclusionRate(
      sessions.length,
      completedWorkoutsCount,
    );
    const totalTimeInSeconds = this.calculateTotalTimeInSeconds(
      completedSessions,
    );
    const workoutStreak = await this.calculateStreak(
      activeWorkoutPlan.id,
      activeWorkoutPlan.workoutDays,
      analysisPeriod.toDate,
    );

    return this.buildGetStatsResponse({
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    });
  }

  private buildAnalysisPeriod(input: GetStatsInput): GetStatsAnalysisPeriod {
    return {
      fromDate: dayjs.utc(input.from).startOf("day"),
      toDate: dayjs.utc(input.to).endOf("day"),
    };
  }

  private async findActiveWorkoutPlan(userId: string) {
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

  private async findSessionsInPeriod(
    workoutPlanId: string,
    analysisPeriod: GetStatsAnalysisPeriod,
  ) {
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

  private buildConsistencyByDay(
    sessions: GetStatsSession[],
  ): Record<string, GetStatsConsistencyByDay> {
    const consistencyByDay: Record<string, GetStatsConsistencyByDay> = {};

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

  private findCompletedSessions(
    sessions: GetStatsSession[],
  ): GetStatsCompletedSession[] {
    return sessions.filter(this.isCompletedSession);
  }

  private calculateConclusionRate(
    totalSessionsCount: number,
    completedWorkoutsCount: number,
  ): number {
    return totalSessionsCount > 0
      ? completedWorkoutsCount / totalSessionsCount
      : 0;
  }

  private calculateTotalTimeInSeconds(
    completedSessions: GetStatsCompletedSession[],
  ): number {
    return completedSessions.reduce((total, session) => {
      const start = dayjs.utc(session.startedAt);
      const end = dayjs.utc(session.completedAt);

      return total + end.diff(start, "second");
    }, 0);
  }

  private isCompletedSession(
    session: GetStatsSession,
  ): session is GetStatsCompletedSession {
    return session.completedAt !== null;
  }

  private buildGetStatsResponse(
    stats: GetStatsOutput,
  ): GetStatsOutput {
    return {
      workoutStreak: stats.workoutStreak,
      consistencyByDay: stats.consistencyByDay,
      completedWorkoutsCount: stats.completedWorkoutsCount,
      conclusionRate: stats.conclusionRate,
      totalTimeInSeconds: stats.totalTimeInSeconds,
    };
  }

  private async calculateStreak(
    workoutPlanId: string,
    workoutDays: Array<{
      weekDay: string;
      isRest: boolean;
    }>,
    currentDate: dayjs.Dayjs,
  ): Promise<number> {
    const workoutPlanWeekDays = new Set(workoutDays.map((workoutDay) => workoutDay.weekDay));
    const restWeekDays = new Set(
      workoutDays
        .filter((workoutDay) => workoutDay.isRest)
        .map((workoutDay) => workoutDay.weekDay),
    );

    const allSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: { workoutPlanId },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const completedDates = new Set(
      allSessions.map((s) => dayjs.utc(s.startedAt).format("YYYY-MM-DD"))
    );

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
