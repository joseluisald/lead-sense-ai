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

            return { ...client, stats: await ClientModel.getStats(id) };
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
            await ClientModel.updateWebhook(id, body);
            return { success: true };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
