// src/controllers/lead.controller.ts
import { randomUUID } from 'node:crypto';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db } from '../core/database';

// Importando as funções utilitárias reais que acabamos de criar!
import {
    scoreLeadData,
    broadcastEvent,
    fireWebhook,
    logApiRequest,
    buildEmailHtml,
    sendEmailViaSmtp
} from '../core/utils';

export class LeadController {

    // 1. Criar Lead
    static async create(body: any, apiKey: string | undefined, set: any) {
        if (!apiKey) {
            const resp = { error: 'API Key missing in x-api-key header' };
            // Fire-and-forget (não usamos await para não travar a resposta da API)
            logApiRequest('/api/leads', 'POST', body, 401, resp);
            set.status = 401;
            return resp;
        }

        let client;
        try {
            const [clientRows] = await db.execute<RowDataPacket[]>('SELECT id FROM clients WHERE apiKey = ?', [apiKey]);
            client = clientRows[0];
        } catch (e) {
            const resp = { error: 'Database error' };
            logApiRequest('/api/leads', 'POST', body, 500, resp);
            set.status = 500;
            return resp;
        }

        if (!client) {
            const resp = { error: 'Invalid API Key' };
            logApiRequest('/api/leads', 'POST', body, 401, resp);
            set.status = 401;
            return resp;
        }

        const { name, email, whatsapp } = body;

        // AI Scoring
        let rules = { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '' };
        try {
            const [rulesRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE key = 'validation_rules'");
            if (rulesRows.length > 0 && rulesRows[0].value) {
                rules = { ...rules, ...JSON.parse(rulesRows[0].value) };
            }
        } catch (e) {}

        // Executa a função utilitária real
        const aiResult = await scoreLeadData(name, email, whatsapp, rules.customScoringRules);
        const id = randomUUID();

        let initialStatus = 'pending_verification';
        if (aiResult.score < rules.autoRejectThreshold) {
            initialStatus = 'rejected';
        } else if (aiResult.score >= rules.autoVerifyThreshold) {
            initialStatus = 'verified';
        }

        try {
            await db.execute<ResultSetHeader>(
                `INSERT INTO leads (id, clientId, name, email, whatsapp, score, probability, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, client.id, name, email, whatsapp, aiResult.score, aiResult.probability, aiResult.reason, initialStatus]
            );

            // Dispara o evento
            broadcastEvent('new_lead', {
                id, clientId: client.id, name, email, score: aiResult.score, status: initialStatus
            });

            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const verificationLink = `${appUrl}/api/verify/${id}`;

            if (initialStatus === 'verified') {
                if (aiResult.probability === 'HIGH') {
                    broadcastEvent('high_quality_lead', { id, name, email, score: aiResult.score });
                }

                // Dispara o webhook (executa em background)
                fireWebhook({ id, name, email, whatsapp, clientId: client.id }, client, aiResult.score, aiResult.probability, 'verified');

            } else if (initialStatus === 'pending_verification') {
                // Disparo de Email
                const [tplRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE key = 'email_template'");
                let emailSubject = 'Verifique seu interesse!';
                let emailBody = `Olá ${name}, confirme seu email clicando aqui: ${verificationLink}`;

                if (tplRows.length > 0 && tplRows[0].value) {
                    try {
                        const tpl = JSON.parse(tplRows[0].value);
                        emailSubject = tpl.subject || emailSubject;
                        const btnColor = tpl.color || '#16a34a';
                        const btnText = tpl.buttonText || 'Verificar Email';
                        const bodyText = (tpl.body || '').replace('{name}', name);

                        // Constrói o HTML usando o utilitário
                        emailBody = buildEmailHtml(emailSubject, bodyText, btnText, btnColor, verificationLink);
                    } catch(e) {}
                }

                // Envia o e-mail (executa em background)
                sendEmailViaSmtp(email, emailSubject, emailBody);

                // Disparo de WhatsApp
                if (whatsapp) {
                    let waBody = `Olá ${name}, confirme seu interesse clicando no link: ${verificationLink}`;
                    const [waTplRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE key = 'whatsapp_template'");

                    if (waTplRows.length > 0 && waTplRows[0].value) {
                        try {
                            const tpl = JSON.parse(waTplRows[0].value);
                            if (tpl.body) {
                                waBody = tpl.body.replace('{name}', name).replace('{link}', verificationLink);
                            }
                        } catch(e) {}
                    }
                    console.log(`[WHATSAPP DISPARO] Para: ${whatsapp} \n Mensagem: ${waBody}`);
                }
            }

            const resp = {
                success: true,
                message: 'Lead received and scored.',
                leadId: id,
                score: aiResult.score,
                probability: aiResult.probability,
                status: initialStatus,
                verificationLink: initialStatus === 'pending_verification' ? verificationLink : undefined
            };

            logApiRequest('/api/leads', 'POST', body, 200, resp);
            return resp;

        } catch (e: any) {
            const resp = { error: e.message };
            logApiRequest('/api/leads', 'POST', body, 500, resp);
            set.status = 500;
            return resp;
        }
    }

    // 2. Listar Leads
    static async list(set: any) {
        try {
            const [leads] = await db.execute<RowDataPacket[]>(`
                SELECT leads.*, clients.name as clientName
                FROM leads
                         JOIN clients ON leads.clientId = clients.id
                ORDER BY leads.createdAt DESC
            `);
            return leads;
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 3. Verificar Lead (HTML Response)
    static async verify(leadId: string, set: any) {
        try {
            const [leadRows] = await db.execute<RowDataPacket[]>('SELECT * FROM leads WHERE id = ?', [leadId]);

            if (leadRows.length === 0) {
                set.status = 404;
                return 'Lead not found';
            }

            const lead = leadRows[0];

            const [tplRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE key = 'email_template'");
            let brandColor = '#16a34a';
            if (tplRows.length > 0 && tplRows[0].value) {
                try { brandColor = JSON.parse(tplRows[0].value).color || brandColor; } catch(e) {}
            }

            set.headers['Content-Type'] = 'text/html; charset=utf8';

            if (lead.status === 'verified') {
                return `
                  <html>
                    <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f9ff; margin:0;">
                      <div style="background:white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align:center;">
                        <h1 style="color: ${brandColor}; margin-top:0;">E-mail Já Verificado!</h1>
                        <p style="color:#4b5563; font-size:1.1rem;">Este e-mail já foi confirmado anteriormente.</p>
                      </div>
                    </body>
                  </html>
                `;
            }

            const newScore = Math.min(lead.score + 25, 100);
            let newProbability = lead.probability;
            if (newScore >= 80) newProbability = 'HIGH';
            else if (newScore >= 50) newProbability = 'MEDIUM';

            await db.execute(
                'UPDATE leads SET status = ?, score = ?, probability = ? WHERE id = ?',
                ['verified', newScore, newProbability, leadId]
            );

            if (newProbability === 'HIGH') {
                broadcastEvent('high_quality_lead', { id: lead.id, name: lead.name, email: lead.email, score: newScore });
            }

            try {
                const [clientRows] = await db.execute<RowDataPacket[]>('SELECT webhookEnabled, webhookUrl, webhookMethod, webhookHeaders, webhookBodyTemplate FROM clients WHERE id = ?', [lead.clientId]);
                if (clientRows.length > 0) {
                    fireWebhook(lead, clientRows[0], newScore, newProbability, 'verified');
                }
            } catch (e) {
                console.error('Error firing webhook:', e);
            }

            return `
                <html>
                  <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f9ff; margin:0;">
                    <div style="background:white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align:center;">
                      <div style="font-size: 48px; margin-bottom: 1rem;">✅</div>
                      <h1 style="color: ${brandColor}; margin-top:0;">E-mail Verificado com Sucesso!</h1>
                      <p style="color:#4b5563; font-size:1.1rem;">Obrigado, <strong>${lead.name}</strong>. Seu interesse foi confirmado.</p>
                      <p style="color:#9ca3af; font-size:0.9rem; margin-top:2rem;">(Score do lead atualizado: ${newScore})</p>
                    </div>
                  </body>
                </html>
              `;
        } catch (e) {
            set.status = 500;
            return 'Internal Server Error';
        }
    }

    // 4. Deletar Leads (Múltiplos)
    static async deleteMany(ids: string[], set: any) {
        try {
            if (!ids || ids.length === 0) {
                set.status = 400;
                return { error: 'No lead IDs provided' };
            }

            const placeholders = ids.map(() => '?').join(',');
            await db.execute(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);

            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 5. Revalidar Leads
    static async revalidate(ids: string[], set: any) {
        try {
            if (!ids || ids.length === 0) {
                set.status = 400;
                return { error: 'No lead IDs provided' };
            }

            const placeholders = ids.map(() => '?').join(',');
            const [leads] = await db.execute<RowDataPacket[]>(`SELECT * FROM leads WHERE id IN (${placeholders})`, ids);

            let rules = { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '' };
            const [rulesRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE key = 'validation_rules'");

            if (rulesRows.length > 0 && rulesRows[0].value) {
                try { rules = { ...rules, ...JSON.parse(rulesRows[0].value) }; } catch(e) {}
            }

            for (const lead of leads) {
                const aiResult = await scoreLeadData(lead.name, lead.email, lead.whatsapp, rules.customScoringRules);

                let newStatus = lead.status;
                if (aiResult.score < rules.autoRejectThreshold) newStatus = 'rejected';
                else if (aiResult.score >= rules.autoVerifyThreshold) newStatus = 'verified';
                else if (lead.status === 'rejected') newStatus = 'pending_verification';

                await db.execute(
                    'UPDATE leads SET score = ?, probability = ?, reason = ?, status = ? WHERE id = ?',
                    [aiResult.score, aiResult.probability, aiResult.reason, newStatus, lead.id]
                );

                if (newStatus === 'verified' && lead.status !== 'verified') {
                    const [clientRows] = await db.execute<RowDataPacket[]>('SELECT * FROM clients WHERE id = ?', [lead.clientId]);
                    if (clientRows.length > 0) {
                        fireWebhook(lead, clientRows[0], aiResult.score, aiResult.probability, 'verified');
                    }
                }
            }

            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }
}