import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../core/database';

export class SettingModel {
    static async get(key: string) {
        const [rows] = await db.execute<RowDataPacket[]>('SELECT value FROM settings WHERE `key` = ?', [key]);
        return rows[0]?.value ?? null;
    }

    static async set(key: string, value: unknown) {
        const [result] = await db.execute<ResultSetHeader>(
            'UPDATE settings SET value = ? WHERE `key` = ?',
            [JSON.stringify(value), key]
        );

        if (result.affectedRows === 0) {
            await db.execute('INSERT INTO settings (`key`, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
        }
    }

    static async getValidationRules() {
        const value = await this.get('validation_rules');
        if (!value) return { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '' };

        try {
            return { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '', ...JSON.parse(value) };
        } catch {
            return { autoRejectThreshold: 30, autoVerifyThreshold: 90, customScoringRules: '' };
        }
    }
}
