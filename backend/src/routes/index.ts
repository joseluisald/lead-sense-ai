import { Elysia } from 'elysia';
import { clientRoutes } from './client.routes';
import { leadRoutes } from './lead.routes';
import { settingRoutes } from './setting.routes';
import { statRoutes } from './stat.routes';
import { logRoutes } from './log.routes';
import { authRoutes } from './auth.routes';

export const apiRoutes = new Elysia({ prefix: '/api/v1' })
    .use(clientRoutes)
    .use(leadRoutes)
    .use(settingRoutes)
    .use(statRoutes)
    .use(logRoutes)
    .use(authRoutes);
