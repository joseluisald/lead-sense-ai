import { RowDataPacket } from 'mysql2';
import { db } from '../core/database';

export class LogModel {
    static async list() {
        const [logs] = await db.execute<RowDataPacket[]>('SELECT * FROM api_logs ORDER BY createdAt DESC LIMIT 100');
        return logs;
    }
}
