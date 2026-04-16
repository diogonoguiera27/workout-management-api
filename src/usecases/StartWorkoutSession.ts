import {
  NotFoundError,
  SessionAlreadyStartedError,
  WorkoutPlanNotActiveError,
} from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface StartWorkoutSessionInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface StartWorkoutSessionOutput {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(
    input: StartWorkoutSessionInput,
  ): Promise<StartWorkoutSessionOutput> {
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

  private async ensureWorkoutPlanExists(
    input: StartWorkoutSessionInput,
  ): Promise<void> {
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

  private async ensureWorkoutDayExists(
    input: StartWorkoutSessionInput,
  ): Promise<void> {
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: input.workoutDayId, workoutPlanId: input.workoutPlanId },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }
  }

  private async ensureWorkoutSessionHasNotStarted(
    input: StartWorkoutSessionInput,
  ): Promise<void> {
    const existingSession = await prisma.workoutSession.findFirst({
      where: { workoutDayId: input.workoutDayId },
    });

    if (existingSession) {
      throw new SessionAlreadyStartedError(
        "A session has already been started for this day",
      );
    }
  }

  private buildStartWorkoutSessionResponse(
    sessionId: string,
  ): StartWorkoutSessionOutput {
    return {
      userWorkoutSessionId: sessionId,
    };
  }
}
