// src/controllers/log.controller.ts
import { RowDataPacket } from 'mysql2';
import { db } from '../core/database'; // Importação real do banco de dados

export class LogController {

    static async getLogs(set: any) {
        try {
            // Usando execute assíncrono e desestruturando o array retornado
            const [logs] = await db.execute<RowDataPacket[]>('SELECT * FROM api_logs ORDER BY createdAt DESC LIMIT 100');

            return logs;
        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }

}