import { buildApp } from "../../src/app.js";

describe("Workout flow validation", () => {
  it("should reject workout plan creation with an empty name", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/workout-plans",
        payload: {
          name: "",
          workoutDays: [],
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 15000);

  it("should reject workout plan creation with an invalid weekday", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/workout-plans",
        payload: {
          name: "Treino de validacao",
          workoutDays: [
            {
              name: "Peito",
              weekDay: "INVALID_DAY",
              isRest: false,
              estimatedDurationInSeconds: 1800,
              exercises: [],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 15000);

  it("should reject get workout plan with an invalid uuid", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/workout-plans/not-a-uuid",
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 15000);
});
