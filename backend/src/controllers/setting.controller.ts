import { buildEmailHtml, sendEmailViaSmtp } from '../core/utils';
import { SettingModel } from '../models/setting.model';

type SettingsRecord = Record<string, any>;

function parseSettings(value: string | null): SettingsRecord {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export class SettingController {
    static async getEmail(set: { status?: number | string }) {
        try {
            const [templateValue, smtpValue] = await Promise.all([
                SettingModel.get('email_template'),
                SettingModel.get('smtp_settings')
            ]);
            const smtp = parseSettings(smtpValue);
            return {
                template: templateValue ? parseSettings(templateValue) : null,
                smtp: smtpValue
                    ? {
                        enabled: smtp.enabled !== false,
                        host: smtp.host || '',
                        port: Number(smtp.port) || 587,
                        username: smtp.username || smtp.user || '',
                        password: '',
                        fromEmail: smtp.fromEmail || smtp.senderEmail || '',
                        fromName: smtp.fromName || smtp.senderName || '',
                        secure: smtp.secure ?? Number(smtp.port) === 465
                    }
                    : null
            };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async saveEmail(body: { template?: unknown; smtp?: unknown }, set: { status?: number | string }) {
        try {
            if (body.template) await SettingModel.set('email_template', body.template);
            if (body.smtp && typeof body.smtp === 'object') {
                const current = parseSettings(await SettingModel.get('smtp_settings'));
                const incoming = body.smtp as SettingsRecord;
                const smtp = {
                    enabled: incoming.enabled !== false,
                    host: incoming.host || current.host || '',
                    port: Number(incoming.port || current.port || 587),
                    username: incoming.username || current.username || current.user || '',
                    password: incoming.password || current.password || current.pass || '',
                    fromEmail: incoming.fromEmail || current.fromEmail || current.senderEmail || '',
                    fromName: incoming.fromName || current.fromName || current.senderName || '',
                    secure: incoming.secure ?? current.secure ?? Number(incoming.port || current.port) === 465
                };
                await SettingModel.set('smtp_settings', smtp);
            }
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async testEmail(body: { email: string }, set: { status?: number | string }) {
        try {
            const templateValue = await SettingModel.get('email_template');
            let subject = 'Verifique seu interesse! (TESTE)';
            let html = 'Olá Teste, confirme seu email clicando aqui.';
            if (templateValue) {
                const template = parseSettings(templateValue);
                subject = `[TESTE] ${template.subject || subject}`;
                html = buildEmailHtml(subject, String(template.body || '').replace('{name}', 'Usuário de Teste'), template.buttonText || 'Verificar Email', template.color || '#16a34a', '#');
            }
            if (await sendEmailViaSmtp(body.email, subject, html)) return { success: true };
            set.status = 500;
            return { error: 'Falha ao enviar e-mail. Verifique os detalhes SMTP nos logs do servidor.' };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async getWhatsApp(set: { status?: number | string }) {
        try {
            const [templateValue, providerValue] = await Promise.all([
                SettingModel.get('whatsapp_template'),
                SettingModel.get('whatsapp_provider')
            ]);
            const provider = parseSettings(providerValue);
            return {
                template: templateValue ? parseSettings(templateValue) : null,
                provider: providerValue
                    ? {
                        enabled: provider.enabled !== false,
                        provider: provider.provider || 'cloud_api',
                        phoneNumber: provider.phoneNumber || '',
                        apiUrl: provider.apiUrl || '',
                        token: '',
                        instanceId: provider.instanceId || ''
                    }
                    : null
            };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async saveWhatsApp(body: { template?: unknown; provider?: unknown }, set: { status?: number | string }) {
        try {
            if (body.template) await SettingModel.set('whatsapp_template', body.template);
            if (body.provider && typeof body.provider === 'object') {
                const current = parseSettings(await SettingModel.get('whatsapp_provider'));
                const incoming = body.provider as SettingsRecord;
                const provider = {
                    enabled: incoming.enabled !== false,
                    provider: incoming.provider || current.provider || 'cloud_api',
                    phoneNumber: incoming.phoneNumber || current.phoneNumber || '',
                    apiUrl: incoming.apiUrl || current.apiUrl || '',
                    token: incoming.token || current.token || '',
                    instanceId: incoming.instanceId || current.instanceId || ''
                };
                await SettingModel.set('whatsapp_provider', provider);
            }
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async testWhatsApp(body: { number: string }, set: { status?: number | string }) {
        console.log(`[WHATSAPP TESTE] Enviando mensagem de teste para: ${body.number}`);
        return { success: true };
    }

    static async getRules(set: { status?: number | string }) {
        try {
            return { rules: await SettingModel.getValidationRules() };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async saveRules(body: { rules: unknown }, set: { status?: number | string }) {
        try {
            await SettingModel.set('validation_rules', body.rules);
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
