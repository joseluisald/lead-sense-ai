import { Elysia } from 'elysia';
import { LogController } from '../controllers/log.controller';
import { authenticate, jwtPlugin } from '../plugins/auth';

export const logRoutes = new Elysia({ prefix: '/logs' })
    .use(jwtPlugin)
    .onBeforeHandle(authenticate)
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
