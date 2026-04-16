import { Prisma, WeekDay } from "@prisma/client";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface GetWorkoutPlanInput {
  userId: string;
  workoutPlanId: string;
}

interface GetWorkoutPlanWorkoutDayOutput {
  id: string;
  weekDay: WeekDay;
  name: string;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  exercisesCount: number;
}

interface GetWorkoutPlanOutput {
  id: string;
  name: string;
  workoutDays: GetWorkoutPlanWorkoutDayOutput[];
}

type WorkoutPlanWithWorkoutDayCounts = Prisma.WorkoutPlanGetPayload<{
  include: {
    workoutDays: {
      include: {
        _count: {
          select: {
            exercises: true;
          };
        };
      };
    };
  };
}>;

export class GetWorkoutPlan {
  async execute(input: GetWorkoutPlanInput): Promise<GetWorkoutPlanOutput> {
    const workoutPlanDetails = await this.findAuthorizedWorkoutPlan(input);

    return this.buildWorkoutPlanResponse(workoutPlanDetails);
  }

  private async findAuthorizedWorkoutPlan(
    input: GetWorkoutPlanInput,
  ): Promise<WorkoutPlanWithWorkoutDayCounts> {
    const workoutPlanDetails = await prisma.workoutPlan.findUnique({
      where: { id: input.workoutPlanId },
      include: {
        workoutDays: {
          include: {
            _count: {
              select: { exercises: true },
            },
          },
        },
      },
    });

    if (!workoutPlanDetails || workoutPlanDetails.userId !== input.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    return workoutPlanDetails;
  }

  private buildWorkoutPlanResponse(
    workoutPlanDetails: WorkoutPlanWithWorkoutDayCounts,
  ): GetWorkoutPlanOutput {
    return {
      id: workoutPlanDetails.id,
      name: workoutPlanDetails.name,
      workoutDays: workoutPlanDetails.workoutDays.map((workoutDay) => ({
        id: workoutDay.id,
        weekDay: workoutDay.weekDay,
        name: workoutDay.name,
        isRest: workoutDay.isRest,
        coverImageUrl: workoutDay.coverImageUrl ?? undefined,
        estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
        exercisesCount: workoutDay._count.exercises,
      })),
    };
  }
}
