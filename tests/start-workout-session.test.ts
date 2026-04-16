const jest = import.meta.jest;

import {
  NotFoundError,
  SessionAlreadyStartedError,
  WorkoutPlanNotActiveError,
} from "../src/errors/index.js";

const prismaMock = {
  workoutPlan: {
    findUnique: jest.fn(),
  },
  workoutDay: {
    findUnique: jest.fn(),
  },
  workoutSession: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

(jest as any).unstable_mockModule("../src/lib/db.js", () => ({
  prisma: prismaMock,
}));

const { StartWorkoutSession } = await import("../src/usecases/StartWorkoutSession.js");
const { prisma } = await import("../src/lib/db.js");

describe("StartWorkoutSession", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve iniciar uma sessão com sucesso", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue({
      id: "plan-1",
      userId: "user-1",
      isActive: true,
    });

    (prisma.workoutDay.findUnique as any).mockResolvedValue({
      id: "day-1",
    });

    (prisma.workoutSession.findFirst as any).mockResolvedValue(null);

    (prisma.workoutSession.create as any).mockResolvedValue({
      id: "session-1",
    });

    const result = await usecase.execute({
      userId: "user-1",
      workoutPlanId: "plan-1",
      workoutDayId: "day-1",
    });

    expect(result.userWorkoutSessionId).toBe("session-1");
  });

  it("deve lançar erro se plano não existir", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue(null);

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "invalido",
        workoutDayId: "day-1",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("deve lançar erro se usuário não for dono", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue({
      id: "plan-1",
      userId: "outro-user",
      isActive: true,
    });

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-1",
        workoutDayId: "day-1",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("deve lançar erro se plano não estiver ativo", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue({
      id: "plan-1",
      userId: "user-1",
      isActive: false,
    });

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-1",
        workoutDayId: "day-1",
      })
    ).rejects.toThrow(WorkoutPlanNotActiveError);
  });

  it("deve lançar erro se dia não existir", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue({
      id: "plan-1",
      userId: "user-1",
      isActive: true,
    });

    (prisma.workoutDay.findUnique as any).mockResolvedValue(null);

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-1",
        workoutDayId: "day-1",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("deve lançar erro se sessão já existir", async () => {
    const usecase = new StartWorkoutSession();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue({
      id: "plan-1",
      userId: "user-1",
      isActive: true,
    });

    (prisma.workoutDay.findUnique as any).mockResolvedValue({
      id: "day-1",
    });

    (prisma.workoutSession.findFirst as any).mockResolvedValue({
      id: "session-existente",
    });

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-1",
        workoutDayId: "day-1",
      })
    ).rejects.toThrow(SessionAlreadyStartedError);
  });
});
