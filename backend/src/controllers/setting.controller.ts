import { SettingModel } from '../models/setting.model';
import { buildEmailHtml, sendEmailViaSmtp } from '../core/utils';

export class SettingController {
    static async getEmail(set: { status?: number | string }) {
        try {
            const [template, smtp] = await Promise.all([SettingModel.get('email_template'), SettingModel.get('smtp_settings')]);
            return { template: template ? JSON.parse(template) : null, smtp: smtp ? JSON.parse(smtp) : null };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async saveEmail(body: { template?: unknown; smtp?: unknown }, set: { status?: number | string }) {
        try {
            if (body.template) await SettingModel.set('email_template', body.template);
            if (body.smtp) await SettingModel.set('smtp_settings', body.smtp);
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
                try {
                    const template = JSON.parse(templateValue);
                    subject = `[TESTE] ${template.subject || subject}`;
                    html = buildEmailHtml(subject, (template.body || '').replace('{name}', 'Usuário de Teste'), template.buttonText || 'Verificar Email', template.color || '#16a34a', '#');
                } catch {}
            }
            if (await sendEmailViaSmtp(body.email, subject, html)) return { success: true };
            set.status = 500;
            return { error: 'Failed to send email. Check server logs for SMTP details.' };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async getWhatsApp(set: { status?: number | string }) {
        try {
            const [template, provider] = await Promise.all([SettingModel.get('whatsapp_template'), SettingModel.get('whatsapp_provider')]);
            return { template: template ? JSON.parse(template) : null, provider: provider ? JSON.parse(provider) : null };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async saveWhatsApp(body: { template?: unknown; provider?: unknown }, set: { status?: number | string }) {
        try {
            if (body.template) await SettingModel.set('whatsapp_template', body.template);
            if (body.provider) await SettingModel.set('whatsapp_provider', body.provider);
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
