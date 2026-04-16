import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";
export class UpdateWorkoutSession {
    async execute(input) {
        await this.ensureWorkoutPlanExists(input);
        await this.ensureWorkoutDayExists(input);
        await this.ensureWorkoutSessionExists(input);
        const updatedSession = await prisma.workoutSession.update({
            where: { id: input.sessionId },
            data: { completedAt: new Date(input.completedAt) },
        });
        return this.buildUpdateWorkoutSessionResponse(updatedSession);
    }
    async ensureWorkoutPlanExists(input) {
        const workoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: input.workoutPlanId },
        });
        if (!workoutPlan || workoutPlan.userId !== input.userId) {
            throw new NotFoundError("Workout plan not found");
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
    async ensureWorkoutSessionExists(input) {
        const session = await prisma.workoutSession.findUnique({
            where: { id: input.sessionId, workoutDayId: input.workoutDayId },
        });
        if (!session) {
            throw new NotFoundError("Workout session not found");
        }
    }
    buildUpdateWorkoutSessionResponse(updatedSession) {
        return {
            id: updatedSession.id,
            startedAt: updatedSession.startedAt.toISOString(),
            completedAt: updatedSession.completedAt.toISOString(),
        };
    }
}
