import "dotenv/config";
import { env } from "./lib/env.js";
import { buildApp } from "./app.js";
const app = await buildApp();
try {
    await app.listen({ host: "0.0.0.0", port: env.PORT });
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}
