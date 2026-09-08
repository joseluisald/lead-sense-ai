import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { db } from '../core/database';

export type UserRecord = RowDataPacket & {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    resetPasswordTokenHash: string | null;
    resetPasswordExpiresAt: Date | null;
    createdAt: Date;
};

export class UserModel {
    static async create(name: string, email: string, passwordHash: string) {
        const id = randomUUID();
        await db.execute('INSERT INTO users (id, name, email, passwordHash) VALUES (?, ?, ?, ?)', [id, name, email, passwordHash]);
        return { id, name, email };
    }

    static async findByEmail(email: string) {
        const [users] = await db.execute<UserRecord[]>('SELECT * FROM users WHERE email = ?', [email]);
        return users[0] ?? null;
    }

    static async findByResetToken(tokenHash: string) {
        const [users] = await db.execute<UserRecord[]>(
            'SELECT * FROM users WHERE resetPasswordTokenHash = ? AND resetPasswordExpiresAt > NOW()',
            [tokenHash]
        );
        return users[0] ?? null;
    }

    static async saveResetToken(userId: string, tokenHash: string, expiresAt: Date) {
        await db.execute(
            'UPDATE users SET resetPasswordTokenHash = ?, resetPasswordExpiresAt = ? WHERE id = ?',
            [tokenHash, expiresAt, userId]
        );
    }

    static async updatePassword(userId: string, passwordHash: string) {
        await db.execute(
            'UPDATE users SET passwordHash = ?, resetPasswordTokenHash = NULL, resetPasswordExpiresAt = NULL WHERE id = ?',
            [passwordHash, userId]
        );
    }
}
