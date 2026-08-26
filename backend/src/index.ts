// src/index.ts
import { Elysia } from 'elysia';
import { OpenAPIPlugin } from "./plugins/openapi";
import { apiRoutes } from './routes';
import { initializeDatabase } from "./core/init-db";

const app = new Elysia()
    .use(OpenAPIPlugin)
    .use(apiRoutes);

export type App = typeof app;

async function startServer() {
    await initializeDatabase();

    const server = app.listen(3000);

    console.log(`🚀 Servidor rodando em http://${server.server?.hostname}:${server.server?.port}`);
    console.log(`📄 Swagger disponível em http://localhost:3000/docs`);
}

startServer().catch((error) => {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
});
