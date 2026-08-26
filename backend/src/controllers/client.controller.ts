// src/controllers/client.controller.ts
import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../core/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ClientController {

    // 1. Create Client (Admin)
    static async create(body: any, set: any) {
        const { name } = body;
        const id = randomUUID();
        const apiKey = 'sk_live_' + randomBytes(16).toString('hex');

        try {
            await db.execute(
                'INSERT INTO clients (id, name, apiKey) VALUES (?, ?, ?)',
                [id, name, apiKey]
            );

            return { id, name, apiKey };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 2. List Clients (Admin)
    static async list(set: any) {
        try {
            const [clients] = await db.execute('SELECT id, name, apiKey, createdAt FROM clients ORDER BY createdAt DESC');
            return clients;
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 3. Get Single Client (Admin)
    static async getById(id: string, set: any) {
        try {
            // Buscar cliente
            const [clientRows] = await db.execute<RowDataPacket[]>('SELECT * FROM clients WHERE id = ?', [id]);

            if (clientRows.length === 0) {
                set.status = 404;
                return { error: 'Client not found' };
            }

            const client = clientRows[0];

            // Buscar Stats (Total Leads)
            const [totalLeadsRows] = await db.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM leads WHERE clientId = ?', [id]);

            // Buscar Stats (Verified Leads)
            const [verifiedLeadsRows] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM leads WHERE clientId = ? AND status = 'verified'", [id]);

            // Buscar Monthly Usage (Trocamos o strftime do SQLite pelo DATE_FORMAT do MySQL)
            const [monthlyUsageRows] = await db.execute<RowDataPacket[]>(`
                SELECT 
                  DATE_FORMAT(createdAt, '%Y-%m') as month,
                  COUNT(*) as count
                FROM leads 
                WHERE clientId = ? 
                GROUP BY month
                ORDER BY month ASC
                LIMIT 12
              `, [id]);

            const stats = {
                totalLeads: totalLeadsRows[0].count,
                verifiedLeads: verifiedLeadsRows[0].count,
                monthlyUsage: monthlyUsageRows
            };

            return { ...client, stats };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 4. Delete Client
    static async delete(id: string, set: any) {
        try {
            // Deletar leads associados primeiro
            await db.execute('DELETE FROM leads WHERE clientId = ?', [id]);

            // Deletar o cliente e capturar o header de resultado
            const [info] = await db.execute<ResultSetHeader>('DELETE FROM clients WHERE id = ?', [id]);

            // No mysql2 verificamos o affectedRows ao invés de changes
            if (info.affectedRows > 0) {
                return { success: true };
            } else {
                set.status = 404;
                return { error: 'Client not found' };
            }
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

    // 5. Update Webhook Config
    static async updateWebhook(id: string, body: any, set: any) {
        try {
            const { webhookEnabled, webhookUrl, webhookMethod, webhookHeaders, webhookBodyTemplate } = body;

            await db.execute(`
                UPDATE clients 
                SET webhookEnabled = ?, webhookUrl = ?, webhookMethod = ?, webhookHeaders = ?, webhookBodyTemplate = ?
                WHERE id = ?
              `, [
                webhookEnabled ? 1 : 0,
                webhookUrl || '',
                webhookMethod || 'POST',
                webhookHeaders || '{}',
                webhookBodyTemplate || '',
                id
            ]);

            return { success: true };
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }
}