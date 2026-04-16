import { prisma } from "../../src/lib/db.js";
import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";
import {
  buildWorkoutPlanInput,
  createBenchmarkUserContext,
  destroyBenchmarkUser,
  ensureBenchmarkUser,
} from "../helpers/workout-plan-benchmark.js";

describe("CreateWorkoutPlan stress", () => {
  const sut = new CreateWorkoutPlan();
  const totalUsers = 18;
  const users = Array.from({ length: totalUsers }, (_, index) =>
    createBenchmarkUserContext(`stress-user-${index}`),
  );

  beforeAll(async () => {
    for (const user of users) {
      await ensureBenchmarkUser(user);
    }
  }, 45000);

  afterAll(async () => {
    for (const user of users) {
      await destroyBenchmarkUser(user);
    }
    await prisma.$disconnect();
  }, 45000);

  it("should sustain repeated workout plan creation bursts without failures", async () => {
    const batchSizes = [6, 6, 6];
    const results: PromiseSettledResult<Awaited<ReturnType<typeof sut.execute>>>[] =
      [];
    const startedAt = performance.now();
    let cursor = 0;

    for (const batchSize of batchSizes) {
      const batchUsers = users.slice(cursor, cursor + batchSize);
      cursor += batchSize;

      const batchResults = await Promise.allSettled(
        batchUsers.map((user, index) =>
          sut.execute(
            buildWorkoutPlanInput(
              user.userId,
              `Stress plan ${cursor}-${index}-${Date.now()}`,
            ),
          ),
        ),
      );

      results.push(...batchResults);
    }

    const elapsedInMs = performance.now() - startedAt;
    const rejected = results.filter((result) => result.status === "rejected");

    expect(results).toHaveLength(totalUsers);
    expect(rejected).toHaveLength(0);
    expect(elapsedInMs).toBeLessThan(30000);

    console.info(
      `[stress] ${totalUsers} CreateWorkoutPlan operations across bursts completed in ${elapsedInMs.toFixed(2)}ms`,
    );
  }, 45000);
});
