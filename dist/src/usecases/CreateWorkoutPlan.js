import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";
export class CreateWorkoutPlan {
    async execute(input) {
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
    async deactivateCurrentActiveWorkoutPlan(transaction, userId) {
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
    buildWorkoutPlanCreateData(input) {
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
                create: input.workoutDays.map((workoutDay) => this.buildWorkoutDayCreateData(workoutDay)),
            },
        };
    }
    buildWorkoutDayCreateData(workoutDay) {
        return {
            name: workoutDay.name,
            weekDay: workoutDay.weekDay,
            isRest: workoutDay.isRest,
            estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
            coverImageUrl: workoutDay.coverImageUrl,
            exercises: {
                create: workoutDay.exercises.map((exercise) => this.buildExerciseCreateData(exercise)),
            },
        };
    }
    buildExerciseCreateData(exercise) {
        return {
            name: exercise.name,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            restTimeInSeconds: exercise.restTimeInSeconds,
        };
    }
    buildWorkoutPlanResponse(workoutPlan) {
        return {
            id: workoutPlan.id,
            name: workoutPlan.name,
            workoutDays: workoutPlan.workoutDays.map((workoutDay) => this.buildWorkoutDayResponse(workoutDay)),
        };
    }
    buildWorkoutDayResponse(workoutDay) {
        return {
            name: workoutDay.name,
            weekDay: workoutDay.weekDay,
            isRest: workoutDay.isRest,
            estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
            coverImageUrl: workoutDay.coverImageUrl ?? undefined,
            exercises: workoutDay.exercises.map((exercise) => this.buildExerciseResponse(exercise)),
        };
    }
    buildExerciseResponse(exercise) {
        return {
            order: exercise.order,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            restTimeInSeconds: exercise.restTimeInSeconds,
        };
    }
}
