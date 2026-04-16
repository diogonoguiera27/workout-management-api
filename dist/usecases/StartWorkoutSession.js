import { NotFoundError, SessionAlreadyStartedError, WorkoutPlanNotActiveError, } from "../errors/index.js";
import { prisma } from "../lib/db.js";
export class StartWorkoutSession {
    async execute(input) {
        await this.ensureWorkoutPlanExists(input);
        await this.ensureWorkoutDayExists(input);
        await this.ensureWorkoutSessionHasNotStarted(input);
        const session = await prisma.workoutSession.create({
            data: {
                workoutDayId: input.workoutDayId,
                startedAt: new Date(),
            },
        });
        return this.buildStartWorkoutSessionResponse(session.id);
    }
    async ensureWorkoutPlanExists(input) {
        const workoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: input.workoutPlanId },
        });
        if (!workoutPlan || workoutPlan.userId !== input.userId) {
            throw new NotFoundError("Workout plan not found");
        }
        if (!workoutPlan.isActive) {
            throw new WorkoutPlanNotActiveError("Workout plan is not active");
        }
    }
    async ensureWorkoutDayExists(input) {
        const workoutDay = await prisma.workoutDay.findUnique({
            where: { id: input.workoutDayId, workoutPlanId: input.workoutPlanId },
        });
        if (!workoutDay) {
            throw new NotFoundError("Workout day not found");
        }
    }
    async ensureWorkoutSessionHasNotStarted(input) {
        const existingSession = await prisma.workoutSession.findFirst({
            where: { workoutDayId: input.workoutDayId },
        });
        if (existingSession) {
            throw new SessionAlreadyStartedError("A session has already been started for this day");
        }
    }
    buildStartWorkoutSessionResponse(sessionId) {
        return {
            userWorkoutSessionId: sessionId,
        };
    }
}
