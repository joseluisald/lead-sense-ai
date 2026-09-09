import { Elysia, t } from 'elysia';
import { StatController } from '../controllers/stat.controller';
import { authenticate, jwtPlugin } from '../plugins/auth';

export const statRoutes = new Elysia({ prefix: '/stats' })
    .use(jwtPlugin)
    .onBeforeHandle(authenticate)
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
