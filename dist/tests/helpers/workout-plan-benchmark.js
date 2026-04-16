import { WeekDay } from "@prisma/client";
import { prisma } from "../../src/lib/db.js";
export function createBenchmarkUserContext(prefix) {
    const userId = `${prefix}-${crypto.randomUUID()}`;
    return {
        userId,
        email: `${userId}@example.com`,
    };
}
export async function cleanupWorkoutPlansByUser(userId) {
    const plans = await prisma.workoutPlan.findMany({
        where: { userId },
        select: {
            id: true,
            workoutDays: {
                select: {
                    id: true,
                },
            },
        },
    });
    const workoutDayIds = plans.flatMap((plan) => plan.workoutDays.map((day) => day.id));
    await prisma.$transaction([
        prisma.workoutSession.deleteMany({
            where: {
                workoutDayId: {
                    in: workoutDayIds,
                },
            },
        }),
        prisma.workoutPlan.deleteMany({
            where: { userId },
        }),
    ]);
}
export async function ensureBenchmarkUser(context) {
    await cleanupWorkoutPlansByUser(context.userId);
    await prisma.user.deleteMany({
        where: { id: context.userId },
    });
    await prisma.user.create({
        data: {
            id: context.userId,
            name: "Benchmark User",
            email: context.email,
        },
    });
}
export async function destroyBenchmarkUser(context) {
    await cleanupWorkoutPlansByUser(context.userId);
    await prisma.user.deleteMany({
        where: { id: context.userId },
    });
}
export function buildWorkoutPlanInput(userId, name) {
    return {
        userId,
        name,
        workoutDays: [
            {
                name: "Benchmark day",
                weekDay: WeekDay.MONDAY,
                isRest: false,
                estimatedDurationInSeconds: 1800,
                exercises: [
                    {
                        order: 1,
                        name: "Push up",
                        sets: 3,
                        reps: 12,
                        restTimeInSeconds: 45,
                    },
                ],
            },
        ],
    };
}
