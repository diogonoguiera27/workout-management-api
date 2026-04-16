import { prisma } from "../../src/lib/db.js";
import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";
import { WeekDay } from "@prisma/client";

describe("CreateWorkoutPlan (Integration)", () => {
  const sut = new CreateWorkoutPlan();
  const userId = `user-test-${crypto.randomUUID()}`;
  const email = `${userId}@example.com`;

  async function cleanupUserData() {
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

    const workoutDayIds = plans.flatMap((plan) =>
      plan.workoutDays.map((day) => day.id),
    );

    await prisma.$transaction([
      prisma.workoutSession.deleteMany({
        where: {
          workoutDayId: {
            in: workoutDayIds,
          },
        },
      }),
      prisma.workoutPlan.deleteMany({ where: { userId } }),
    ]);
  }

  beforeAll(async () => {
    await cleanupUserData();
    await prisma.user.create({
      data: {
        id: userId,
        name: "Test User",
        email,
      },
    });
  }, 15000);

  beforeEach(async () => {
    await cleanupUserData();
  }, 15000);

  afterAll(async () => {
    await cleanupUserData();
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }, 15000);

  it("should create a workout plan with days and exercises", async () => {
    const input = {
      userId,
      name: "Treino ABC",
      workoutDays: [
        {
          name: "Peito",
          weekDay: WeekDay.MONDAY,
          isRest: false,
          estimatedDurationInSeconds: 3600,
          exercises: [
            {
              order: 1,
              name: "Supino",
              sets: 4,
              reps: 10,
              restTimeInSeconds: 60,
            },
          ],
        },
      ],
    };

    const result = await sut.execute(input);

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Treino ABC");

    expect(result.workoutDays).toHaveLength(1);
    expect(result.workoutDays[0].exercises).toHaveLength(1);

    const workoutPlanInDb = await prisma.workoutPlan.findUnique({
      where: { id: result.id },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    expect(workoutPlanInDb).not.toBeNull();
    expect(workoutPlanInDb?.workoutDays.length).toBe(1);
    expect(workoutPlanInDb?.workoutDays[0].exercises.length).toBe(1);
  }, 20000);

  it("should deactivate previous active workout plan", async () => {
    await prisma.workoutPlan.create({
      data: {
        id: "old-plan",
        name: "Old Plan",
        userId,
        isActive: true,
      },
    });

    const input = {
      userId,
      name: "Novo Treino",
      workoutDays: [],
    };

    const result = await sut.execute(input);

    const oldPlan = await prisma.workoutPlan.findUnique({
      where: { id: "old-plan" },
    });

    const newPlan = await prisma.workoutPlan.findUnique({
      where: { id: result.id },
    });

    expect(oldPlan?.isActive).toBe(false);
    expect(newPlan?.isActive).toBe(true);
  }, 20000);
});
