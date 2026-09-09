import { lookup } from 'node:dns/promises';
import nodemailer from 'nodemailer';
import { db } from './database';
import { GoogleGenAI } from '@google/genai';

// Inicializa o Gemini
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * 1. AI Scoring (Integração Real com Gemini)
 * Avalia a qualidade do lead analisando nome, email e whatsapp contra as regras.
 */
export async function scoreLeadData(name: string, email: string, whatsapp: string, customRules?: string) {
    if (!ai) {
        return {
            score: 50,
            probability: "MEDIUM",
            reason: "API Key do Gemini não configurada no servidor. Lead classificado com score padrão."
        };
    }

    const baseRules = `
        - Emails corporativos (ex: @empresa.com) ganham pontos altos.
        - Emails gratuitos reais (ex: @gmail.com, @hotmail.com) são normais, pontuação média.
        - Emails claramente falsos/spam (ex: teste@teste.com, asdasd@gmail.com) zeram ou reduzem drasticamente a nota.
        - Formatação correta do nome (ex: "João Silva" vs "joao silva" vs "j") indica maior intenção.
        - O WhatsApp parece ser um número válido ou apenas lixo (ex: "11999999999" vs "1234")?
      `;

    const rulesToUse = customRules?.trim() ? customRules : baseRules;

    const prompt = `
        Atue como um especialista em qualificação de leads (SDR). 
        Analise os dados deste novo lead e dê uma pontuação de qualidade (score de 0 a 100) e uma probabilidade de conversão (LOW, MEDIUM, ou HIGH).
        
        Dados do Lead:
        - Nome: ${name}
        - E-mail: ${email}
        - WhatsApp: ${whatsapp}
        
        Critérios de Avaliação e Regras Customizadas:
        ${rulesToUse}
        
        O seu resultado deve ser ESTRITAMENTE um JSON válido com esta estrutura:
        {
          "score": número inteiro de 0 a 100,
          "probability": "LOW", "MEDIUM", ou "HIGH",
          "reason": "String com uma breve explicação em português do porquê dessa nota"
        }
      `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite', // Excelente escolha para tarefas rápidas de parsing
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || "{}";
        const result = JSON.parse(text);

        return {
            score: typeof result.score === 'number' ? result.score : 50,
            probability: ["LOW", "MEDIUM", "HIGH"].includes(result.probability) ? result.probability : "MEDIUM",
            reason: result.reason || "Avaliado pela IA."
        };
    } catch (e: any) {
        console.error("❌ Erro na IA do Gemini:", e.message);
        return {
            score: 40,
            probability: "LOW",
            reason: "Erro ao processar a avaliação via IA. O formato do dado pode estar incorreto."
        };
    }
}

/**
 * 2. Broadcast de Eventos (WebSockets ou SSE)
 */
export function broadcastEvent(eventName: string, data: any) {
    console.log(`📡 [EVENTO BROADCAST: ${eventName}]`, data);
}

/**
 * 3. Disparo de Webhooks
 */
function isPrivateAddress(address: string) {
    const normalized = address.toLowerCase();
    const ipv4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
    if (ipv4.includes('.')) {
        return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ipv4);
    }

    return normalized === '::' || normalized === '::1' || /^(fc|fd|fe80:)/.test(normalized);
}

async function isSafeWebhookUrl(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return false;
        if (url.username || url.password) return false;

        const addresses = await lookup(url.hostname, { all: true });
        return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
    } catch {
        return false;
    }
}

export async function fireWebhook(lead: any, client: any, score: number, probability: string, event: string) {
    if (!client.webhookEnabled || !client.webhookUrl || !(await isSafeWebhookUrl(client.webhookUrl))) {
        if (client.webhookEnabled && client.webhookUrl) {
            console.warn(`Webhook bloqueado por URL inválida ou não permitida para o cliente ${client.id}.`);
        }
        return;
    }

    const payload = {
        event,
        lead: {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            whatsapp: lead.whatsapp,
            score,
            probability
        },
        timestamp: new Date().toISOString()
    };

    try {
        let headers = { 'Content-Type': 'application/json' };
        if (client.webhookHeaders) {
            const configuredHeaders = JSON.parse(client.webhookHeaders);
            if (configuredHeaders && typeof configuredHeaders === 'object' && !Array.isArray(configuredHeaders)) {
                headers = { ...headers, ...configuredHeaders };
            }
        }
        const method = ['POST', 'PUT', 'PATCH'].includes(String(client.webhookMethod || '').toUpperCase())
            ? String(client.webhookMethod).toUpperCase()
            : 'POST';
        const response = await fetch(client.webhookUrl, {
            method,
            headers,
            body: JSON.stringify(payload)
        });
        console.log(`🪝 [WEBHOOK ENVIADO] Cliente: ${client.id} | Status: ${response.status}`);
    } catch (error: any) {
        console.error(`❌ [ERRO WEBHOOK] Cliente: ${client.id} | Erro:`, error.message);
    }
}

/**
 * 4. Logs no Banco de Dados
 */
export async function logApiRequest(endpoint: string, method: string, body: any, statusCode: number, response: any) {
    try {
        const safeBody = body && typeof body === 'object' ? { fields: Object.keys(body) } : undefined;
        const safeResponse = response && typeof response === 'object'
            ? Object.fromEntries(Object.entries(response).filter(([key]) => !['verificationLink', 'token', 'apiKey'].includes(key)))
            : response;
        await db.execute(
            `INSERT INTO api_logs (endpoint, method, requestBody, statusCode, responseBody) VALUES (?, ?, ?, ?, ?)`,
            [endpoint, method, JSON.stringify(safeBody), statusCode, JSON.stringify(safeResponse)]
        );
    } catch (error) {
        console.error('Falha ao salvar log da API:', error);
    }
}

/**
 * 5. Template de E-mail
 */
function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[character] || character);
}

export function buildEmailHtml(subject: string, bodyText: string, btnText: string, btnColor: string, link: string) {
    const formattedBody = escapeHtml(bodyText).replace(/\n/g, '<br/>');
    const safeColor = /^#[0-9a-f]{6}$/i.test(btnColor) ? btnColor : '#2563eb';
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #333;">${escapeHtml(subject)}</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">${formattedBody}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(link)}" style="background-color: ${safeColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
          ${escapeHtml(btnText)}
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">Se você não solicitou este contato, apenas ignore este e-mail.</p>
    </div>
  `;
}

/**
 * 6. Envio de E-mail via SMTP
 */
export async function sendEmailViaSmtp(to: string, subject: string, html: string) {
    try {
        const [smtpRows] = await db.execute<any[]>("SELECT value FROM settings WHERE key = 'smtp_settings'");
        if (smtpRows.length === 0 || !smtpRows[0].value) {
            console.warn('⚠️ SMTP não configurado. E-mail não enviado.');
            return false;
        }

        const smtpConfig = JSON.parse(smtpRows[0].value);
        if (smtpConfig.enabled === false) {
            console.warn('SMTP está desativado. E-mail não enviado.');
            return false;
        }

        const port = Number(smtpConfig.port);
        const username = smtpConfig.username || smtpConfig.user || '';
        const password = smtpConfig.password ?? smtpConfig.pass ?? '';
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port,
            secure: smtpConfig.secure ?? port === 465,
            ...(username || password ? { auth: { user: username, pass: password } } : {})
        });

        const info = await transporter.sendMail({
            from: `"${smtpConfig.fromName || smtpConfig.senderName || 'LeadSense'}" <${smtpConfig.fromEmail || smtpConfig.senderEmail || username}>`,
            to,
            subject,
            html
        });

        console.log(`✉️ [EMAIL ENVIADO] Para: ${to} | MessageId: ${info.messageId}`);
        return true;
    } catch (error: any) {
        console.error(`❌ [ERRO EMAIL] Falha ao enviar para ${to}:`, error.message);
        return false;
    }
}
