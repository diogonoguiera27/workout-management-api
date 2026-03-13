import Fastify from 'fastify';
import "dotenv/config";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import fastifySwagger from '@fastify/swagger';
import { auth } from './lib/auth.js';
import fastifyCors from '@fastify/cors';
import fastifyApiReference from '@scalar/fastify-api-reference';
import { aiRoutes } from './routes/ai.js';
import { homeRoutes } from './routes/home.js';
import { meRoutes } from './routes/me.js';
import { statsRoutes } from './routes/stats.js';
import { workoutPlanRoutes } from './routes/workout-plan.js';
import { env } from './lib/env.js';
const app = Fastify({
    logger: true
});
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
await app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Treino API',
            description: 'API para treino do Diogão',
            version: '1.0.0',
        },
        servers: [{
                description: "API Base Url",
                url: env.API_BASE_URL
            }],
    },
    transform: jsonSchemaTransform,
    // You can also create transform with custom skiplist of endpoints that should not be included in the specification:
    //
    // transform: createJsonSchemaTransform({
    //   skipList: [ '/documentation/static/*' ]
    // })
});
await app.register(fastifyCors, {
    origin: [env.WEB_APP_BASE_URL],
    credentials: true,
});
await app.register(fastifyApiReference, {
    routePrefix: "/docs",
    configuration: {
        sources: [
            {
                title: "Bootcamp Treinos API",
                slug: "bootcamp-treinos-api",
                url: "/swagger.json",
            },
            {
                title: "Auth API",
                slug: "auth-api",
                url: "/api/auth/open-api/generate-schema",
            }
        ]
    }
});
// Routes 
await app.register(workoutPlanRoutes, { prefix: "/workout-plans" });
await app.register(homeRoutes, { prefix: "/home" });
await app.register(meRoutes, { prefix: "/me" });
await app.register(statsRoutes, { prefix: "/stats" });
await app.register(aiRoutes, { prefix: "/ai" });
app.withTypeProvider().route({
    method: 'GET',
    url: "/swagger.json",
    schema: {
        hide: true,
    },
    handler: async () => {
        return app.swagger();
    }
});
app.withTypeProvider().route({
    method: 'GET',
    url: "/",
    schema: {
        description: "Hello World",
        tags: ["Hello World"],
        response: {
            200: z.object({
                message: z.string()
            }),
        },
    },
    handler: () => {
        return { message: "Hello World!" };
    }
});
app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    schema: {
        hide: true,
    },
    async handler(request, reply) {
        try {
            // Construct request URL
            const url = new URL(request.url, `http://${request.headers.host}`);
            // Convert Fastify headers to standard Headers object
            const headers = new Headers();
            Object.entries(request.headers).forEach(([key, value]) => {
                if (value)
                    headers.append(key, value.toString());
            });
            // Create Fetch API-compatible request
            const req = new Request(url.toString(), {
                method: request.method,
                headers,
                ...(request.body ? { body: JSON.stringify(request.body) } : {}),
            });
            // Process authentication request
            const response = await auth.handler(req);
            // Forward response to client
            reply.status(response.status);
            response.headers.forEach((value, key) => reply.header(key, value));
            reply.send(response.body ? await response.text() : null);
        }
        catch (error) {
            app.log.error(error);
            reply.status(500).send({
                error: "Internal authentication error",
                code: "AUTH_FAILURE"
            });
        }
    }
});
try {
    await app.listen({ port: env.PORT });
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}
