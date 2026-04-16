import { buildApp } from "../../src/app.js";
describe("Smoke API", () => {
    it("should respond on GET /", async () => {
        const app = await buildApp();
        try {
            const response = await app.inject({
                method: "GET",
                url: "/",
            });
            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                message: "Hello World!",
            });
        }
        finally {
            await app.close();
        }
    }, 15000);
    it("should expose the swagger document", async () => {
        const app = await buildApp();
        try {
            const response = await app.inject({
                method: "GET",
                url: "/swagger.json",
            });
            expect(response.statusCode).toBe(200);
            expect(response.json()).toHaveProperty("openapi");
            expect(response.json()).toHaveProperty("info");
        }
        finally {
            await app.close();
        }
    }, 15000);
});
