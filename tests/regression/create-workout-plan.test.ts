import { prisma } from "../../src/lib/db.js";
import { CreateWorkoutPlan } from "../../src/usecases/CreateWorkoutPlan.js";

describe("CreateWorkoutPlan regression", () => {
  const sut = new CreateWorkoutPlan();
  const targetUserId = `regression-user-${crypto.randomUUID()}`;
  const otherUserId = `regression-other-user-${crypto.randomUUID()}`;

  async function cleanupUsersData() {
    const plans = await prisma.workoutPlan.findMany({
      where: {
        userId: {
          in: [targetUserId, otherUserId],
        },
      },
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
      prisma.workoutPlan.deleteMany({
        where: {
          userId: {
            in: [targetUserId, otherUserId],
          },
        },
      }),
    ]);
  }

  beforeAll(async () => {
    await cleanupUsersData();

    await prisma.user.createMany({
      data: [
        {
          id: targetUserId,
          name: "Regression User",
          email: `${targetUserId}@example.com`,
        },
        {
          id: otherUserId,
          name: "Other Regression User",
          email: `${otherUserId}@example.com`,
        },
      ],
    });
  }, 15000);

  beforeEach(async () => {
    await cleanupUsersData();
  }, 15000);

  afterAll(async () => {
    await cleanupUsersData();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [targetUserId, otherUserId],
        },
      },
    });
    await prisma.$disconnect();
  }, 15000);

  it("should not deactivate an active workout plan from another user", async () => {
    const otherUsersActivePlan = await prisma.workoutPlan.create({
      data: {
        id: `other-plan-${crypto.randomUUID()}`,
        name: "Other User Active Plan",
        userId: otherUserId,
        isActive: true,
      },
    });

    const createdPlan = await sut.execute({
      userId: targetUserId,
      name: "Target User Plan",
      workoutDays: [],
    });

    const unchangedOtherUsersPlan = await prisma.workoutPlan.findUnique({
      where: { id: otherUsersActivePlan.id },
    });

    const newTargetUsersPlan = await prisma.workoutPlan.findUnique({
      where: { id: createdPlan.id },
    });

    expect(unchangedOtherUsersPlan?.isActive).toBe(true);
    expect(newTargetUsersPlan?.isActive).toBe(true);
    expect(newTargetUsersPlan?.userId).toBe(targetUserId);
  }, 20000);
});
