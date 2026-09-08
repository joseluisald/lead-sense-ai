import { LeadModel } from '../models/lead.model';
import { ClientModel } from '../models/client.model';
import { SettingModel } from '../models/setting.model';
import {
    scoreLeadData,
    broadcastEvent,
    fireWebhook,
    logApiRequest,
    buildEmailHtml,
    sendEmailViaSmtp
} from '../core/utils';

export class LeadController {
    static async create(body: { name: string; email: string; whatsapp: string }, apiKey: string | undefined, set: { status?: number | string }) {
        if (!apiKey) {
            const response = { error: 'API Key missing in x-api-key header' };
            logApiRequest('/api/leads', 'POST', body, 401, response);
            set.status = 401;
            return response;
        }

        try {
            const client = await ClientModel.findByApiKey(apiKey);
            if (!client) {
                const response = { error: 'Invalid API Key' };
                logApiRequest('/api/leads', 'POST', body, 401, response);
                set.status = 401;
                return response;
            }

            const rules = await SettingModel.getValidationRules();
            const aiResult = await scoreLeadData(body.name, body.email, body.whatsapp, rules.customScoringRules);
            const status = aiResult.score < rules.autoRejectThreshold
                ? 'rejected'
                : aiResult.score >= rules.autoVerifyThreshold
                    ? 'verified'
                    : 'pending_verification';
            const id = await LeadModel.create({
                clientId: client.id,
                ...body,
                score: aiResult.score,
                probability: aiResult.probability,
                reason: aiResult.reason,
                status
            });

            broadcastEvent('new_lead', { id, clientId: client.id, name: body.name, email: body.email, score: aiResult.score, status });
            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const verificationLink = `${appUrl}/api/verify/${id}`;

            if (status === 'verified') {
                if (aiResult.probability === 'HIGH') {
                    broadcastEvent('high_quality_lead', { id, name: body.name, email: body.email, score: aiResult.score });
                }
                fireWebhook({ id, clientId: client.id, ...body }, client, aiResult.score, aiResult.probability, 'verified');
            } else if (status === 'pending_verification') {
                const templateValue = await SettingModel.get('email_template');
                let emailSubject = 'Verifique seu interesse!';
                let emailBody = `Olá ${body.name}, confirme seu email clicando aqui: ${verificationLink}`;

                if (templateValue) {
                    try {
                        const template = JSON.parse(templateValue);
                        emailSubject = template.subject || emailSubject;
                        emailBody = buildEmailHtml(
                            emailSubject,
                            (template.body || '').replace('{name}', body.name),
                            template.buttonText || 'Verificar Email',
                            template.color || '#16a34a',
                            verificationLink
                        );
                    } catch {}
                }

                sendEmailViaSmtp(body.email, emailSubject, emailBody);
                if (body.whatsapp) {
                    const whatsappTemplate = await SettingModel.get('whatsapp_template');
                    let whatsappBody = `Olá ${body.name}, confirme seu interesse clicando no link: ${verificationLink}`;
                    if (whatsappTemplate) {
                        try {
                            const template = JSON.parse(whatsappTemplate);
                            if (template.body) whatsappBody = template.body.replace('{name}', body.name).replace('{link}', verificationLink);
                        } catch {}
                    }
                    console.log(`[WHATSAPP DISPARO] Para: ${body.whatsapp} \n Mensagem: ${whatsappBody}`);
                }
            }

            const response = {
                success: true,
                message: 'Lead received and scored.',
                leadId: id,
                score: aiResult.score,
                probability: aiResult.probability,
                status,
                verificationLink: status === 'pending_verification' ? verificationLink : undefined
            };
            logApiRequest('/api/leads', 'POST', body, 200, response);
            return response;
        } catch (error: any) {
            const response = { error: error.message };
            logApiRequest('/api/leads', 'POST', body, 500, response);
            set.status = 500;
            return response;
        }
    }

    static async list(set: { status?: number | string }) {
        try {
            return await LeadModel.list();
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async verify(leadId: string, set: { status?: number | string; headers: Record<string, string | number> }) {
        try {
            const lead = await LeadModel.findById(leadId);
            if (!lead) {
                set.status = 404;
                return 'Lead not found';
            }

            const templateValue = await SettingModel.get('email_template');
            let brandColor = '#16a34a';
            if (templateValue) {
                try {
                    brandColor = JSON.parse(templateValue).color || brandColor;
                } catch {}
            }
            set.headers['Content-Type'] = 'text/html; charset=utf8';

            if (lead.status === 'verified') {
                return `<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f9ff;margin:0;"><div style="background:white;padding:3rem;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);text-align:center;"><h1 style="color:${brandColor};margin-top:0;">E-mail Já Verificado!</h1><p style="color:#4b5563;font-size:1.1rem;">Este e-mail já foi confirmado anteriormente.</p></div></body></html>`;
            }

            const score = Math.min(lead.score + 25, 100);
            const probability = score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : lead.probability;
            await LeadModel.markVerified(leadId, score, probability);

            if (probability === 'HIGH') {
                broadcastEvent('high_quality_lead', { id: lead.id, name: lead.name, email: lead.email, score });
            }
            const client = await ClientModel.findById(lead.clientId);
            if (client) fireWebhook(lead, client, score, probability, 'verified');

            return `<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f9ff;margin:0;"><div style="background:white;padding:3rem;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);text-align:center;"><h1 style="color:${brandColor};margin-top:0;">E-mail Verificado com Sucesso!</h1><p style="color:#4b5563;font-size:1.1rem;">Obrigado, seu interesse foi confirmado.</p><p style="color:#9ca3af;font-size:.9rem;margin-top:2rem;">Score do lead atualizado: ${score}</p></div></body></html>`;
        } catch {
            set.status = 500;
            return 'Internal Server Error';
        }
    }

    static async deleteMany(ids: string[], set: { status?: number | string }) {
        if (ids.length === 0) {
            set.status = 400;
            return { error: 'No lead IDs provided' };
        }
        try {
            await LeadModel.deleteMany(ids);
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async revalidate(ids: string[], set: { status?: number | string }) {
        if (ids.length === 0) {
            set.status = 400;
            return { error: 'No lead IDs provided' };
        }
        try {
            const [leads, rules] = await Promise.all([LeadModel.findByIds(ids), SettingModel.getValidationRules()]);
            for (const lead of leads) {
                const evaluation = await scoreLeadData(lead.name, lead.email, lead.whatsapp, rules.customScoringRules);
                const status = evaluation.score < rules.autoRejectThreshold
                    ? 'rejected'
                    : evaluation.score >= rules.autoVerifyThreshold
                        ? 'verified'
                        : lead.status === 'rejected'
                            ? 'pending_verification'
                            : lead.status;
                await LeadModel.updateEvaluation(lead.id, { ...evaluation, status });
                if (status === 'verified' && lead.status !== 'verified') {
                    const client = await ClientModel.findById(lead.clientId);
                    if (client) fireWebhook(lead, client, evaluation.score, evaluation.probability, 'verified');
                }
            }
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
