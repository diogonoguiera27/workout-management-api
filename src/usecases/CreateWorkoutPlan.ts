import { Prisma, WeekDay } from "@prisma/client";

import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface CreateWorkoutPlanExerciseInput {
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

interface CreateWorkoutPlanWorkoutDayInput {
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  estimatedDurationInSeconds: number;
  coverImageUrl?: string;
  exercises: CreateWorkoutPlanExerciseInput[];
}

interface CreateWorkoutPlanInput {
  userId: string;
  name: string;
  workoutDays: CreateWorkoutPlanWorkoutDayInput[];
}

interface CreateWorkoutPlanExerciseOutput {
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

interface CreateWorkoutPlanWorkoutDayOutput {
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  estimatedDurationInSeconds: number;
  coverImageUrl?: string;
  exercises: CreateWorkoutPlanExerciseOutput[];
}

interface CreateWorkoutPlanOutput {
  id: string;
  name: string;
  workoutDays: CreateWorkoutPlanWorkoutDayOutput[];
}

type WorkoutPlanWithRelations = Prisma.WorkoutPlanGetPayload<{
  include: {
    workoutDays: {
      include: {
        exercises: true;
      };
    };
  };
}>;

export class CreateWorkoutPlan {
  async execute(
    input: CreateWorkoutPlanInput,
  ): Promise<CreateWorkoutPlanOutput> {
    return prisma.$transaction(async (transaction) => {
      await this.deactivateCurrentActiveWorkoutPlan(transaction, input.userId);

      const createdWorkoutPlan = await transaction.workoutPlan.create({
        data: this.buildWorkoutPlanCreateData(input),
      });

      const workoutPlanDetails = await transaction.workoutPlan.findUnique({
        where: { id: createdWorkoutPlan.id },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!workoutPlanDetails) {
        throw new NotFoundError("Workout plan not found");
      }

      return this.buildWorkoutPlanResponse(workoutPlanDetails);
    });
  }

  private async deactivateCurrentActiveWorkoutPlan(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const activeWorkoutPlan = await transaction.workoutPlan.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!activeWorkoutPlan) {
      return;
    }

    await transaction.workoutPlan.update({
      where: { id: activeWorkoutPlan.id },
      data: { isActive: false },
    });
  }

  private buildWorkoutPlanCreateData(
    input: CreateWorkoutPlanInput,
  ): Prisma.WorkoutPlanCreateInput {
    return {
      id: crypto.randomUUID(),
      name: input.name,
      isActive: true,
      user: {
        connect: {
          id: input.userId,
        },
      },
      workoutDays: {
        create: input.workoutDays.map((workoutDay) =>
          this.buildWorkoutDayCreateData(workoutDay),
        ),
      },
    };
  }

  private buildWorkoutDayCreateData(
    workoutDay: CreateWorkoutPlanWorkoutDayInput,
  ): Prisma.WorkoutDayCreateWithoutWorkoutPlanInput {
    return {
      name: workoutDay.name,
      weekDay: workoutDay.weekDay,
      isRest: workoutDay.isRest,
      estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
      coverImageUrl: workoutDay.coverImageUrl,
      exercises: {
        create: workoutDay.exercises.map((exercise) =>
          this.buildExerciseCreateData(exercise),
        ),
      },
    };
  }

  private buildExerciseCreateData(
    exercise: CreateWorkoutPlanExerciseInput,
  ): Prisma.WorkoutExerciseCreateWithoutWorkoutDayInput {
    return {
      name: exercise.name,
      order: exercise.order,
      sets: exercise.sets,
      reps: exercise.reps,
      restTimeInSeconds: exercise.restTimeInSeconds,
    };
  }

  private buildWorkoutPlanResponse(
    workoutPlan: WorkoutPlanWithRelations,
  ): CreateWorkoutPlanOutput {
    return {
      id: workoutPlan.id,
      name: workoutPlan.name,
      workoutDays: workoutPlan.workoutDays.map((workoutDay) =>
        this.buildWorkoutDayResponse(workoutDay),
      ),
    };
  }

  private buildWorkoutDayResponse(
    workoutDay: WorkoutPlanWithRelations["workoutDays"][number],
  ): CreateWorkoutPlanWorkoutDayOutput {
    return {
      name: workoutDay.name,
      weekDay: workoutDay.weekDay,
      isRest: workoutDay.isRest,
      estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
      coverImageUrl: workoutDay.coverImageUrl ?? undefined,
      exercises: workoutDay.exercises.map((exercise) =>
        this.buildExerciseResponse(exercise),
      ),
    };
  }

  private buildExerciseResponse(
    exercise: WorkoutPlanWithRelations["workoutDays"][number]["exercises"][number],
  ): CreateWorkoutPlanExerciseOutput {
    return {
      order: exercise.order,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restTimeInSeconds: exercise.restTimeInSeconds,
    };
  }
}
