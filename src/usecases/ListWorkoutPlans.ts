import { Prisma, WeekDay } from "@prisma/client";

import { prisma } from "../lib/db.js";

interface ListWorkoutPlansInput {
  userId: string;
  active?: boolean;
}

interface ListWorkoutPlansExerciseOutput {
  id: string;
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

interface ListWorkoutPlansWorkoutDayOutput {
  id: string;
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  estimatedDurationInSeconds: number;
  coverImageUrl?: string;
  exercises: ListWorkoutPlansExerciseOutput[];
}

interface ListWorkoutPlansOutput {
  id: string;
  name: string;
  isActive: boolean;
  workoutDays: ListWorkoutPlansWorkoutDayOutput[];
}

type WorkoutPlanWithRelations = Prisma.WorkoutPlanGetPayload<{
  include: {
    workoutDays: {
      include: {
        exercises: {
          orderBy: {
            order: "asc";
          };
        };
      };
    };
  };
}>;

export class ListWorkoutPlans {
  async execute(input: ListWorkoutPlansInput): Promise<ListWorkoutPlansOutput[]> {
    const workoutPlans = await prisma.workoutPlan.findMany({
      where: {
        userId: input.userId,
        ...(input.active !== undefined ? { isActive: input.active } : {}),
      },
      include: {
        workoutDays: {
          include: {
            exercises: { orderBy: { order: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return this.buildWorkoutPlansResponse(workoutPlans);
  }

  private buildWorkoutPlansResponse(
    workoutPlans: WorkoutPlanWithRelations[],
  ): ListWorkoutPlansOutput[] {
    return workoutPlans.map((workoutPlan) => ({
      id: workoutPlan.id,
      name: workoutPlan.name,
      isActive: workoutPlan.isActive,
      workoutDays: workoutPlan.workoutDays.map((workoutDay) => ({
        id: workoutDay.id,
        name: workoutDay.name,
        weekDay: workoutDay.weekDay,
        isRest: workoutDay.isRest,
        estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
        coverImageUrl: workoutDay.coverImageUrl ?? undefined,
        exercises: workoutDay.exercises.map((exercise) => ({
          id: exercise.id,
          order: exercise.order,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          restTimeInSeconds: exercise.restTimeInSeconds,
        })),
      })),
    }));
  }
}
