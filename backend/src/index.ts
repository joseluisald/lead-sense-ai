// src/index.ts
import { Elysia } from 'elysia';
import { OpenAPIPlugin } from "./plugins/openapi";
import { apiRoutes } from './routes';
import { initializeDatabase } from "./core/init-db";

async function startServer() {
    await initializeDatabase();

    const app = new Elysia()
        .use(OpenAPIPlugin)
        .use(apiRoutes)
        .listen(3000);

    console.log(`🚀 Servidor rodando em http://${app.server?.hostname}:${app.server?.port}`);
    console.log(`📄 Swagger disponível em http://localhost:3000/docs`);
}

startServer().catch((error) => {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
});

export type App = typeof app;