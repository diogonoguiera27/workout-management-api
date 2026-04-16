const jest = import.meta.jest;

const prismaMock = {
  $transaction: jest.fn(),
};

(jest as any).unstable_mockModule("../src/lib/db.js", () => ({
  prisma: prismaMock,
}));

const { CreateWorkoutPlan } = await import("../src/usecases/CreateWorkoutPlan.js");
const { prisma } = await import("../src/lib/db.js");

describe("CreateWorkoutPlan", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve criar um novo plano de treino", async () => {
    const usecase = new CreateWorkoutPlan();

    // Mock do retorno do banco
    const mockResult = {
      id: "1",
      name: "Treino A",
      workoutDays: [
        {
          name: "Segunda",
          weekDay: "MONDAY",
          isRest: false,
          estimatedDurationInSeconds: 3600,
          coverImageUrl: null,
          exercises: [
            {
              name: "Supino",
              order: 1,
              sets: 3,
              reps: 10,
              restTimeInSeconds: 60,
            },
          ],
        },
      ],
    };

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback({
        workoutPlan: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: "1" }),
          findUnique: jest.fn().mockResolvedValue(mockResult),
        },
      });
    });

    const result = await usecase.execute({
      userId: "user-1",
      name: "Treino A",
      workoutDays: [
        {
          name: "Segunda",
          weekDay: "MONDAY" as any,
          isRest: false,
          estimatedDurationInSeconds: 3600,
          exercises: [
            {
              order: 1,
              name: "Supino",
              sets: 3,
              reps: 10,
              restTimeInSeconds: 60,
            },
          ],
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Treino A");
    expect(result.workoutDays.length).toBe(1);
  });
});
