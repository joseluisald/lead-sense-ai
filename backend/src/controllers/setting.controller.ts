// src/controllers/setting.controller.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db } from '../core/database'; // Importação real
import { buildEmailHtml, sendEmailViaSmtp } from '../core/utils'; // Importação real

export class SettingController {

    // ==========================
    // EMAIL
    // ==========================
    static async getEmail(set: any) {
        try {
            const [templateRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'email_template'");
            const [smtpRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'smtp_settings'");

            let template = null;
            let smtp = null;

            if (templateRows.length > 0 && templateRows[0].value) template = JSON.parse(templateRows[0].value);
            if (smtpRows.length > 0 && smtpRows[0].value) smtp = JSON.parse(smtpRows[0].value);

            return { template, smtp };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    static async saveEmail(body: any, set: any) {
        try {
            const { template, smtp } = body;

            if (template) {
                const [updateResult] = await db.execute<ResultSetHeader>(
                    "UPDATE settings SET value = ? WHERE \`key\` = 'email_template'",
                    [JSON.stringify(template)]
                );

                if (updateResult.affectedRows === 0) {
                    await db.execute(
                        "INSERT INTO settings (\`key\`, value) VALUES ('email_template', ?)",
                        [JSON.stringify(template)]
                    );
                }
            }

            if (smtp) {
                const [updateResult] = await db.execute<ResultSetHeader>(
                    "UPDATE settings SET value = ? WHERE \`key\` = 'smtp_settings'",
                    [JSON.stringify(smtp)]
                );

                if (updateResult.affectedRows === 0) {
                    await db.execute(
                        "INSERT INTO settings (\`key\`, value) VALUES ('smtp_settings', ?)",
                        [JSON.stringify(smtp)]
                    );
                }
            }

            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    static async testEmail(body: any, set: any) {
        try {
            const { email } = body;

            const [tplRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'email_template'");
            let emailSubject = 'Verifique seu interesse! (TESTE)';
            let emailBody = `Olá Teste, confirme seu email clicando aqui.`;

            if (tplRows.length > 0 && tplRows[0].value) {
                try {
                    const tpl = JSON.parse(tplRows[0].value);
                    emailSubject = `[TESTE] ${tpl.subject || emailSubject}`;
                    const btnColor = tpl.color || '#16a34a';
                    const btnText = tpl.buttonText || 'Verificar Email';
                    const bodyText = (tpl.body || '').replace('{name}', 'Usuário de Teste');

                    emailBody = buildEmailHtml(emailSubject, bodyText, btnText, btnColor, '#');
                } catch(e) {}
            }

            const success = await sendEmailViaSmtp(email, emailSubject, emailBody);
            if (success) {
                return { success: true };
            } else {
                set.status = 500;
                return { error: 'Failed to send email. Check server logs for SMTP details.' };
            }
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // ==========================
    // WHATSAPP
    // ==========================
    static async getWhatsApp(set: any) {
        try {
            const [templateRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'whatsapp_template'");
            const [providerRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'whatsapp_provider'");

            let template = null;
            let provider = null;

            if (templateRows.length > 0 && templateRows[0].value) template = JSON.parse(templateRows[0].value);
            if (providerRows.length > 0 && providerRows[0].value) provider = JSON.parse(providerRows[0].value);

            return { template, provider };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    static async saveWhatsApp(body: any, set: any) {
        try {
            const { template, provider } = body;

            if (template) {
                const [updateResult] = await db.execute<ResultSetHeader>(
                    "UPDATE settings SET value = ? WHERE \`key\` = 'whatsapp_template'",
                    [JSON.stringify(template)]
                );

                if (updateResult.affectedRows === 0) {
                    await db.execute(
                        "INSERT INTO settings (\`key\`, value) VALUES ('whatsapp_template', ?)",
                        [JSON.stringify(template)]
                    );
                }
            }

            if (provider) {
                const [updateResult] = await db.execute<ResultSetHeader>(
                    "UPDATE settings SET value = ? WHERE \`key\` = 'whatsapp_provider'",
                    [JSON.stringify(provider)]
                );

                if (updateResult.affectedRows === 0) {
                    await db.execute(
                        "INSERT INTO settings (\`key\`, value) VALUES ('whatsapp_provider', ?)",
                        [JSON.stringify(provider)]
                    );
                }
            }

            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    static async testWhatsApp(body: any, set: any) {
        try {
            const { number } = body;
            console.log(`[WHATSAPP TESTE] Enviando mensagem de teste para: ${number}`);
            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // ==========================
    // REGRAS DE VALIDAÇÃO
    // ==========================
    static async getRules(set: any) {
        try {
            const [rulesRows] = await db.execute<RowDataPacket[]>("SELECT value FROM settings WHERE \`key\` = 'validation_rules'");
            let rules = { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '' };

            if (rulesRows.length > 0 && rulesRows[0].value) {
                rules = { ...rules, ...JSON.parse(rulesRows[0].value) };
            }

            return { rules };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    static async saveRules(body: any, set: any) {
        try {
            const { rules } = body;
            if (rules) {
                const [updateResult] = await db.execute<ResultSetHeader>(
                    "UPDATE settings SET value = ? WHERE \`key\` = 'validation_rules'",
                    [JSON.stringify(rules)]
                );

                if (updateResult.affectedRows === 0) {
                    await db.execute(
                        "INSERT INTO settings (\`key\`, value) VALUES ('validation_rules', ?)",
                        [JSON.stringify(rules)]
                    );
                }
            }
            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }
}