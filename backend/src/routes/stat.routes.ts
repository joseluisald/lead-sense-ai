// src/routes/stat.routes.ts
import { Elysia, t } from 'elysia';
import { StatController } from '../controllers/stat.controller';

export const statRoutes = new Elysia({ prefix: '/stats' })
    .get(
        '/',
        ({ query, set }) => StatController.getStats(query.clientId, set),
        {
            query: t.Object({
                clientId: t.Optional(t.String())
            }),
            detail: {
                tags: ['Stats'],
                summary: 'Obter estatísticas gerais ou de um cliente específico (Admin)'
            }
        }
    );