// src/index.ts
import { Elysia } from 'elysia';
import { OpenAPIPlugin } from "./plugins/openapi";
import { apiRoutes } from './routes';
import { initializeDatabase } from "./core/init-db";

const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:4321').replace(/\/$/, '');
const port = Number(process.env.PORT || 3000);

const app = new Elysia()
    .onRequest(({ request, set }) => {
        const origin = request.headers.get('origin');
        if (origin !== frontendOrigin) return;

        set.headers['Access-Control-Allow-Origin'] = frontendOrigin;
        set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-api-key';
        set.headers.Vary = 'Origin';

        if (request.method === 'OPTIONS') {
            set.status = 204;
            return new Response(null, { status: 204 });
        }
    })
    .use(OpenAPIPlugin)
    .use(apiRoutes);

export type App = typeof app;

async function startServer() {
    await initializeDatabase();

    const server = app.listen({
      hostname: '0.0.0.0',
      port,
    });

    console.log(`🚀 Servidor rodando em http://${server.server?.hostname}:${server.server?.port}`);
    console.log(`📄 Swagger disponível em http://localhost:${port}/docs`);
}

startServer().catch((error) => {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
});
