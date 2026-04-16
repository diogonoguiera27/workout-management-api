import { prisma } from "../../src/lib/db.js";
import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";
import {
  buildWorkoutPlanInput,
  createBenchmarkUserContext,
  destroyBenchmarkUser,
  ensureBenchmarkUser,
} from "../helpers/workout-plan-benchmark.js";

describe("CreateWorkoutPlan database", () => {
  const sut = new CreateWorkoutPlan();
  const user = createBenchmarkUserContext("database-user");

  beforeAll(async () => {
    await ensureBenchmarkUser(user);
  }, 15000);

  afterAll(async () => {
    await destroyBenchmarkUser(user);
    await prisma.$disconnect();
  }, 15000);

  it("should persist the full workout graph and query it efficiently", async () => {
    const createStartedAt = performance.now();
    const createdPlan = await sut.execute(
      buildWorkoutPlanInput(user.userId, `Database plan ${Date.now()}`),
    );
    const createElapsedInMs = performance.now() - createStartedAt;

    const queryStartedAt = performance.now();
    const workoutPlanInDb = await prisma.workoutPlan.findUnique({
      where: { id: createdPlan.id },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });
    const queryElapsedInMs = performance.now() - queryStartedAt;

    expect(workoutPlanInDb).not.toBeNull();
    expect(workoutPlanInDb?.userId).toBe(user.userId);
    expect(workoutPlanInDb?.workoutDays).toHaveLength(1);
    expect(workoutPlanInDb?.workoutDays[0].exercises).toHaveLength(1);
    expect(createElapsedInMs).toBeLessThan(5000);
    expect(queryElapsedInMs).toBeLessThan(2000);

    console.info(
      `[database] create=${createElapsedInMs.toFixed(2)}ms query=${queryElapsedInMs.toFixed(2)}ms`,
    );
  }, 20000);
});
