// src/routes/lead.routes.ts
import { Elysia, t } from 'elysia';
import { LeadController } from '../controllers/lead.controller';

export const leadRoutes = new Elysia()
    .post(
        '/leads',
        ({ body, headers, set }) => LeadController.create(body, headers['x-api-key'], set),
        {
            headers: t.Object({
                'x-api-key': t.Optional(t.String())
            }),
            body: t.Object({
                name: t.String(),
                email: t.String({ format: 'email' }),
                whatsapp: t.String()
            }),
            detail: { tags: ['Leads'], summary: 'Receber um novo Lead da integração' }
        }
    )
    .get(
        '/leads',
        ({ set }) => LeadController.list(set),
        { detail: { tags: ['Leads'], summary: 'Listar todos os leads (Admin)' } }
    )
    .get(
        '/verify/:leadId',
        ({ params: { leadId }, set }) => LeadController.verify(leadId, set),
        {
            params: t.Object({ leadId: t.String() }),
            detail: { tags: ['Leads'], summary: 'Verificar Lead (Clique no email)' }
        }
    )
    .post(
        '/leads/delete',
        ({ body, set }) => LeadController.deleteMany(body.ids, set),
        {
            body: t.Object({
                ids: t.Array(t.String())
            }),
            detail: { tags: ['Leads'], summary: 'Deletar Leads em massa (Admin)' }
        }
    )
    .post(
        '/leads/revalidate',
        ({ body, set }) => LeadController.revalidate(body.ids, set),
        {
            body: t.Object({
                ids: t.Array(t.String())
            }),
            detail: { tags: ['Leads'], summary: 'Revalidar Leads em massa (Admin)' }
        }
    );