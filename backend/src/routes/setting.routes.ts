// src/routes/setting.routes.ts
import { Elysia, t } from 'elysia';
import { SettingController } from '../controllers/setting.controller';

export const settingRoutes = new Elysia({ prefix: '/settings' })
    // --- EMAIL ---
    .get(
        '/email',
        ({ set }) => SettingController.getEmail(set),
        { detail: { tags: ['Settings'], summary: 'Obter configurações de E-mail (Admin)' } }
    )
    .post(
        '/email',
        ({ body, set }) => SettingController.saveEmail(body, set),
        {
            body: t.Object({
                template: t.Optional(t.Any()),
                smtp: t.Optional(t.Any())
            }),
            detail: { tags: ['Settings'], summary: 'Atualizar configurações de E-mail (Admin)' }
        }
    )
    .post(
        '/email/test',
        ({ body, set }) => SettingController.testEmail(body, set),
        {
            body: t.Object({
                email: t.String({ format: 'email' })
            }),
            detail: { tags: ['Settings'], summary: 'Testar envio de E-mail (Admin)' }
        }
    )

    // --- WHATSAPP ---
    .get(
        '/whatsapp',
        ({ set }) => SettingController.getWhatsApp(set),
        { detail: { tags: ['Settings'], summary: 'Obter configurações de WhatsApp (Admin)' } }
    )
    .post(
        '/whatsapp',
        ({ body, set }) => SettingController.saveWhatsApp(body, set),
        {
            body: t.Object({
                template: t.Optional(t.Any()),
                provider: t.Optional(t.Any())
            }),
            detail: { tags: ['Settings'], summary: 'Atualizar configurações de WhatsApp (Admin)' }
        }
    )
    .post(
        '/whatsapp/test',
        ({ body, set }) => SettingController.testWhatsApp(body, set),
        {
            body: t.Object({
                number: t.String()
            }),
            detail: { tags: ['Settings'], summary: 'Testar envio de WhatsApp (Admin)' }
        }
    )

    // --- REGRAS DE VALIDAÇÃO ---
    .get(
        '/rules',
        ({ set }) => SettingController.getRules(set),
        { detail: { tags: ['Settings'], summary: 'Obter regras de validação (Admin)' } }
    )
    .post(
        '/rules',
        ({ body, set }) => SettingController.saveRules(body, set),
        {
            body: t.Object({
                rules: t.Any()
            }),
            detail: { tags: ['Settings'], summary: 'Atualizar regras de validação (Admin)' }
        }
    );