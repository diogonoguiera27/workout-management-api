import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";
import { prisma } from "../../src/lib/db.js";
import { buildWorkoutPlanInput, createBenchmarkUserContext, destroyBenchmarkUser, ensureBenchmarkUser, } from "../helpers/workout-plan-benchmark.js";
describe("CreateWorkoutPlan performance", () => {
    const sut = new CreateWorkoutPlan();
    const user = createBenchmarkUserContext("performance-user");
    beforeAll(async () => {
        await ensureBenchmarkUser(user);
    }, 15000);
    afterAll(async () => {
        await destroyBenchmarkUser(user);
        await prisma.$disconnect();
    }, 15000);
    it("should create a workout plan within an acceptable response time", async () => {
        const startedAt = performance.now();
        const result = await sut.execute(buildWorkoutPlanInput(user.userId, `Performance plan ${Date.now()}`));
        const elapsedInMs = performance.now() - startedAt;
        expect(result.id).toBeDefined();
        expect(result.workoutDays).toHaveLength(1);
        expect(result.workoutDays[0].exercises).toHaveLength(1);
        expect(elapsedInMs).toBeLessThan(5000);
        console.info(`[performance] CreateWorkoutPlan completed in ${elapsedInMs.toFixed(2)}ms`);
    }, 20000);
});
