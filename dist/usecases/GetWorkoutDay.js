import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";
dayjs.extend(utc);
export class GetWorkoutDay {
    async execute(input) {
        await this.ensureWorkoutPlanBelongsToUser(input);
        const workoutDayDetails = await this.findWorkoutDayDetails(input);
        return this.buildWorkoutDayResponse(workoutDayDetails);
    }
    async ensureWorkoutPlanBelongsToUser(input) {
        const authorizedWorkoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: input.workoutPlanId },
        });
        if (!authorizedWorkoutPlan ||
            authorizedWorkoutPlan.userId !== input.userId) {
            throw new NotFoundError("Workout plan not found");
        }
    }
    async findWorkoutDayDetails(input) {
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
    buildWorkoutDayResponse(workoutDayDetails) {
        return {
            id: workoutDayDetails.id,
            name: workoutDayDetails.name,
            isRest: workoutDayDetails.isRest,
            coverImageUrl: workoutDayDetails.coverImageUrl ?? undefined,
            estimatedDurationInSeconds: workoutDayDetails.estimatedDurationInSeconds,
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
