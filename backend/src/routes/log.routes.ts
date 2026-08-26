// src/routes/log.routes.ts
import { Elysia } from 'elysia';
import { LogController } from '../controllers/log.controller';

export const logRoutes = new Elysia({ prefix: '/logs' })
    .get(
        '/',
        ({ set }) => LogController.getLogs(set),
        {
            detail: {
                tags: ['Logs'],
                summary: 'Listar os últimos 100 logs da API (Admin)'
            }
        }
    );