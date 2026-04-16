const jest = import.meta.jest;

import { NotFoundError } from "../src/errors/index.js";

const prismaMock = {
  workoutPlan: {
    findUnique: jest.fn(),
  },
};

(jest as any).unstable_mockModule("../src/lib/db.js", () => ({
  prisma: prismaMock,
}));

const { GetWorkoutPlan } = await import("../src/usecases/GetWorkoutPlan.js");
const { prisma } = await import("../src/lib/db.js");

describe("GetWorkoutPlan", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar o plano de treino corretamente", async () => {
    const usecase = new GetWorkoutPlan();

    const mockWorkoutPlan = {
      id: "plan-1",
      name: "Treino A",
      userId: "user-1",
      workoutDays: [
        {
          id: "day-1",
          weekDay: "MONDAY",
          name: "Segunda",
          isRest: false,
          coverImageUrl: null,
          estimatedDurationInSeconds: 3600,
          _count: {
            exercises: 5,
          },
        },
      ],
    };

    (prisma.workoutPlan.findUnique as any).mockResolvedValue(
      mockWorkoutPlan
    );

    const result = await usecase.execute({
      userId: "user-1",
      workoutPlanId: "plan-1",
    });

    expect(result.id).toBe("plan-1");
    expect(result.name).toBe("Treino A");
    expect(result.workoutDays.length).toBe(1);
    expect(result.workoutDays[0].exercisesCount).toBe(5);
  });

  it("deve lançar erro se não encontrar o plano", async () => {
    const usecase = new GetWorkoutPlan();

    (prisma.workoutPlan.findUnique as any).mockResolvedValue(null);

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-inexistente",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("deve lançar erro se o plano não pertence ao usuário", async () => {
    const usecase = new GetWorkoutPlan();

    const mockWorkoutPlan = {
      id: "plan-1",
      name: "Treino A",
      userId: "outro-user",
      workoutDays: [],
    };

    (prisma.workoutPlan.findUnique as any).mockResolvedValue(
      mockWorkoutPlan
    );

    await expect(
      usecase.execute({
        userId: "user-1",
        workoutPlanId: "plan-1",
      })
    ).rejects.toThrow(NotFoundError);
  });
});
