import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { db } from '../core/database';

export class LeadModel {
    static async create(lead: {
        clientId: string;
        name: string;
        email: string;
        whatsapp: string;
        score: number;
        probability: string;
        reason: string;
        status: string;
    }) {
        const id = randomUUID();
        await db.execute(
            'INSERT INTO leads (id, clientId, name, email, whatsapp, score, probability, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, lead.clientId, lead.name, lead.email, lead.whatsapp, lead.score, lead.probability, lead.reason, lead.status]
        );
        return id;
    }

    static async list() {
        const [leads] = await db.execute<RowDataPacket[]>(`
            SELECT leads.*, clients.name as clientName
            FROM leads
            JOIN clients ON leads.clientId = clients.id
            ORDER BY leads.createdAt DESC
        `);
        return leads;
    }

    static async findById(id: string) {
        const [leads] = await db.execute<RowDataPacket[]>('SELECT * FROM leads WHERE id = ?', [id]);
        return leads[0] ?? null;
    }

    static async findByIds(ids: string[]) {
        const placeholders = ids.map(() => '?').join(',');
        const [leads] = await db.execute<RowDataPacket[]>(`SELECT * FROM leads WHERE id IN (${placeholders})`, ids);
        return leads;
    }

    static async markVerified(id: string, score: number, probability: string) {
        await db.execute('UPDATE leads SET status = ?, score = ?, probability = ? WHERE id = ?', ['verified', score, probability, id]);
    }

    static async updateEvaluation(id: string, evaluation: { score: number; probability: string; reason: string; status: string }) {
        await db.execute(
            'UPDATE leads SET score = ?, probability = ?, reason = ?, status = ? WHERE id = ?',
            [evaluation.score, evaluation.probability, evaluation.reason, evaluation.status, id]
        );
    }

    static async deleteMany(ids: string[]) {
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);
    }
}
