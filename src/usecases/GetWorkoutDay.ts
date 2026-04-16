import { Prisma, WeekDay } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface GetWorkoutDayInput {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface GetWorkoutDayExerciseOutput {
  id: string;
  name: string;
  order: number;
  workoutDayId: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

interface GetWorkoutDaySessionOutput {
  id: string;
  workoutDayId: string;
  startedAt?: string;
  completedAt?: string;
}

interface GetWorkoutDayOutput {
  id: string;
  name: string;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  weekDay: WeekDay;
  exercises: GetWorkoutDayExerciseOutput[];
  sessions: GetWorkoutDaySessionOutput[];
}

type WorkoutDayWithRelations = Prisma.WorkoutDayGetPayload<{
  include: {
    exercises: {
      orderBy: {
        order: "asc";
      };
    };
    sessions: true;
  };
}>;

export class GetWorkoutDay {
  async execute(input: GetWorkoutDayInput): Promise<GetWorkoutDayOutput> {
    await this.ensureWorkoutPlanBelongsToUser(input);

    const workoutDayDetails = await this.findWorkoutDayDetails(input);

    return this.buildWorkoutDayResponse(workoutDayDetails);
  }

  private async ensureWorkoutPlanBelongsToUser(
    input: GetWorkoutDayInput,
  ): Promise<void> {
    const authorizedWorkoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: input.workoutPlanId },
    });

    if (
      !authorizedWorkoutPlan ||
      authorizedWorkoutPlan.userId !== input.userId
    ) {
      throw new NotFoundError("Workout plan not found");
    }
  }

  private async findWorkoutDayDetails(
    input: GetWorkoutDayInput,
  ): Promise<WorkoutDayWithRelations> {
    const workoutDayDetails = await prisma.workoutDay.findUnique({
      where: {
        id: input.workoutDayId,
        workoutPlanId: input.workoutPlanId,
      },
      include: {
        exercises: {
          orderBy: { order: "asc" },
        },
        sessions: true,
      },
    });

    if (!workoutDayDetails) {
      throw new NotFoundError("Workout day not found");
    }

    return workoutDayDetails;
  }

  private buildWorkoutDayResponse(
    workoutDayDetails: WorkoutDayWithRelations,
  ): GetWorkoutDayOutput {
    return {
      id: workoutDayDetails.id,
      name: workoutDayDetails.name,
      isRest: workoutDayDetails.isRest,
      coverImageUrl: workoutDayDetails.coverImageUrl ?? undefined,
      estimatedDurationInSeconds:
        workoutDayDetails.estimatedDurationInSeconds,
      weekDay: workoutDayDetails.weekDay,
      exercises: workoutDayDetails.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        order: exercise.order,
        workoutDayId: exercise.workoutDayId,
        sets: exercise.sets,
        reps: exercise.reps,
        restTimeInSeconds: exercise.restTimeInSeconds,
      })),
      sessions: workoutDayDetails.sessions.map((session) => ({
        id: session.id,
        workoutDayId: session.workoutDayId,
        startedAt: session.startedAt
          ? dayjs.utc(session.startedAt).format("YYYY-MM-DD")
          : undefined,
        completedAt: session.completedAt
          ? dayjs.utc(session.completedAt).format("YYYY-MM-DD")
          : undefined,
      })),
    };
  }
}
