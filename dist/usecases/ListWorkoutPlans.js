import { prisma } from "../lib/db.js";
export class ListWorkoutPlans {
    async execute(input) {
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
    buildWorkoutPlansResponse(workoutPlans) {
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
