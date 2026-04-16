import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";
export class GetWorkoutPlan {
    async execute(input) {
        const workoutPlanDetails = await this.findAuthorizedWorkoutPlan(input);
        return this.buildWorkoutPlanResponse(workoutPlanDetails);
    }
    async findAuthorizedWorkoutPlan(input) {
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
    buildWorkoutPlanResponse(workoutPlanDetails) {
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
