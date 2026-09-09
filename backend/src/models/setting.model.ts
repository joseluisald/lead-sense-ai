import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../core/database';

const defaultValidationRules = {
    autoValidate: true,
    blockDisposableEmails: true,
    requirePhone: false,
    minimumScore: 50,
    autoRejectThreshold: 30,
    autoVerifyThreshold: 90,
    blockedDomains: [] as string[],
    customScoringRules: ''
};

function clampScore(value: unknown, fallback: number) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.min(Math.max(Math.round(score), 0), 100) : fallback;
}

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
        if (!value) return { ...defaultValidationRules };

        try {
            const parsed = JSON.parse(value);
            const rules = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            return {
                ...defaultValidationRules,
                ...rules,
                autoValidate: rules.autoValidate !== false,
                blockDisposableEmails: rules.blockDisposableEmails !== false,
                requirePhone: rules.requirePhone === true,
                minimumScore: clampScore(rules.minimumScore, defaultValidationRules.minimumScore),
                autoRejectThreshold: clampScore(rules.autoRejectThreshold, defaultValidationRules.autoRejectThreshold),
                autoVerifyThreshold: clampScore(rules.autoVerifyThreshold, defaultValidationRules.autoVerifyThreshold),
                blockedDomains: Array.isArray(rules.blockedDomains)
                    ? rules.blockedDomains.map((domain: unknown) => String(domain).trim().toLowerCase()).filter(Boolean)
                    : [],
                customScoringRules: typeof rules.customScoringRules === 'string' ? rules.customScoringRules : ''
            };
        } catch {
            return { ...defaultValidationRules };
        }
    }
}
