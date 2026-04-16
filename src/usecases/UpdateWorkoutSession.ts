import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface UpdateWorkoutSessionInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt: string;
}

interface UpdateWorkoutSessionOutput {
  id: string;
  startedAt: string;
  completedAt: string;
}

export class UpdateWorkoutSession {
  async execute(
    input: UpdateWorkoutSessionInput,
  ): Promise<UpdateWorkoutSessionOutput> {
    await this.ensureWorkoutPlanExists(input);
    await this.ensureWorkoutDayExists(input);
    await this.ensureWorkoutSessionExists(input);

    const updatedSession = await prisma.workoutSession.update({
      where: { id: input.sessionId },
      data: { completedAt: new Date(input.completedAt) },
    });

    return this.buildUpdateWorkoutSessionResponse(updatedSession);
  }

  private async ensureWorkoutPlanExists(
    input: UpdateWorkoutSessionInput,
  ): Promise<void> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: input.workoutPlanId },
    });

    if (!workoutPlan || workoutPlan.userId !== input.userId) {
      throw new NotFoundError("Workout plan not found");
    }
  }

  private async ensureWorkoutDayExists(
    input: UpdateWorkoutSessionInput,
  ): Promise<void> {
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: input.workoutDayId, workoutPlanId: input.workoutPlanId },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }
  }

  private async ensureWorkoutSessionExists(
    input: UpdateWorkoutSessionInput,
  ): Promise<void> {
    const session = await prisma.workoutSession.findUnique({
      where: { id: input.sessionId, workoutDayId: input.workoutDayId },
    });

    if (!session) {
      throw new NotFoundError("Workout session not found");
    }
  }

  private buildUpdateWorkoutSessionResponse(updatedSession: {
    id: string;
    startedAt: Date;
    completedAt: Date | null;
  }): UpdateWorkoutSessionOutput {
    return {
      id: updatedSession.id,
      startedAt: updatedSession.startedAt.toISOString(),
      completedAt: updatedSession.completedAt!.toISOString(),
    };
  }
}
