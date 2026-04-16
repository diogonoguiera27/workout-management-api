import { prisma } from "../../src/lib/db.js";
import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";
import { buildWorkoutPlanInput, createBenchmarkUserContext, destroyBenchmarkUser, ensureBenchmarkUser, } from "../helpers/workout-plan-benchmark.js";
describe("CreateWorkoutPlan load", () => {
    const sut = new CreateWorkoutPlan();
    const totalUsers = 8;
    const users = Array.from({ length: totalUsers }, (_, index) => createBenchmarkUserContext(`load-user-${index}`));
    beforeAll(async () => {
        for (const user of users) {
            await ensureBenchmarkUser(user);
        }
    }, 30000);
    afterAll(async () => {
        for (const user of users) {
            await destroyBenchmarkUser(user);
        }
        await prisma.$disconnect();
    }, 30000);
    it("should handle multiple workout plan creations concurrently", async () => {
        const startedAt = performance.now();
        const results = await Promise.all(users.map((user, index) => sut.execute(buildWorkoutPlanInput(user.userId, `Load plan ${index}-${Date.now()}`))));
        const elapsedInMs = performance.now() - startedAt;
        expect(results).toHaveLength(totalUsers);
        expect(results.every((result) => result.workoutDays.length === 1)).toBe(true);
        expect(elapsedInMs).toBeLessThan(15000);
        console.info(`[load] ${totalUsers} concurrent CreateWorkoutPlan operations completed in ${elapsedInMs.toFixed(2)}ms`);
    }, 30000);
});
