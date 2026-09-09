import { ClientModel } from '../models/client.model';

export class ClientController {
    static async create(body: { name: string }, set: { status?: number | string }) {
        try {
            return await ClientModel.create(body.name);
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async list(set: { status?: number | string }) {
        try {
            return await ClientModel.list();
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async getById(id: string, set: { status?: number | string }) {
        try {
            const client = await ClientModel.findById(id);
            if (!client) {
                set.status = 404;
                return { error: 'Client not found' };
            }

            return {
                id: client.id,
                name: client.name,
                createdAt: client.createdAt,
                webhookEnabled: Boolean(client.webhookEnabled),
                stats: await ClientModel.getStats(id)
            };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async delete(id: string, set: { status?: number | string }) {
        try {
            if (await ClientModel.delete(id)) return { success: true };

            set.status = 404;
            return { error: 'Client not found' };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }

    static async updateWebhook(id: string, body: {
        webhookEnabled?: boolean;
        webhookUrl?: string;
        webhookMethod?: string;
        webhookHeaders?: string;
        webhookBodyTemplate?: string;
    }, set: { status?: number | string }) {
        try {
            if (body.webhookUrl) {
                try {
                    const url = new URL(body.webhookUrl);
                    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
                        set.status = 400;
                        return { error: 'A URL do webhook deve usar HTTP ou HTTPS e não pode conter credenciais.' };
                    }
                } catch {
                    set.status = 400;
                    return { error: 'A URL do webhook é inválida.' };
                }
            }

            if (body.webhookHeaders) {
                try {
                    const headers = JSON.parse(body.webhookHeaders);
                    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
                        set.status = 400;
                        return { error: 'Os cabeçalhos do webhook devem ser um objeto JSON.' };
                    }
                } catch {
                    set.status = 400;
                    return { error: 'Os cabeçalhos do webhook devem ser um objeto JSON válido.' };
                }
            }

            const method = String(body.webhookMethod || 'POST').toUpperCase();
            if (!['POST', 'PUT', 'PATCH'].includes(method)) {
                set.status = 400;
                return { error: 'O método do webhook deve ser POST, PUT ou PATCH.' };
            }

            await ClientModel.updateWebhook(id, { ...body, webhookMethod: method });
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
