// src/routes/client.routes.ts
import { Elysia, t } from 'elysia';
import { ClientController } from '../controllers/client.controller';

export const clientRoutes = new Elysia({ prefix: '/clients' })
    .post(
        '/',
        ({ body, set }) => ClientController.create(body, set),
        {
            body: t.Object({
                name: t.String() // Na lógica antiga, apenas 'name' era obrigatório
            }),
            detail: {
                tags: ['Clients'],
                summary: 'Criar um novo cliente (Admin)'
            }
        }
    )
    .get(
        '/',
        ({ set }) => ClientController.list(set),
        {
            detail: {
                tags: ['Clients'],
                summary: 'Listar todos os clientes (Admin)'
            }
        }
    )
    .get(
        '/:id',
        ({ params: { id }, set }) => ClientController.getById(id, set),
        {
            params: t.Object({
                id: t.String()
            }),
            detail: {
                tags: ['Clients'],
                summary: 'Buscar cliente por ID e listar Stats (Admin)'
            }
        }
    )
    .delete(
        '/:id',
        ({ params: { id }, set }) => ClientController.delete(id, set),
        {
            params: t.Object({
                id: t.String()
            }),
            detail: {
                tags: ['Clients'],
                summary: 'Deletar cliente e seus leads (Admin)'
            }
        }
    )
    .put(
        '/:id/webhook',
        ({ params: { id }, body, set }) => ClientController.updateWebhook(id, body, set),
        {
            params: t.Object({
                id: t.String()
            }),
            body: t.Object({
                webhookEnabled: t.Optional(t.Boolean()),
                webhookUrl: t.Optional(t.String()),
                webhookMethod: t.Optional(t.String()),
                webhookHeaders: t.Optional(t.String()),
                webhookBodyTemplate: t.Optional(t.String())
            }),
            detail: {
                tags: ['Clients'],
                summary: 'Atualizar configurações de webhook do cliente (Admin)'
            }
        }
    );