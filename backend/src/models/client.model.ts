import { randomBytes, randomUUID } from "node:crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "../core/database";

export class ClientModel {
  static async create(name: string) {
    const id = randomUUID();
    const apiKey = `sk_live_${randomBytes(16).toString("hex")}`;

    await db.execute(
      "INSERT INTO clients (id, name, apiKey) VALUES (?, ?, ?)",
      [id, name, apiKey]
    );

    return { id, name, apiKey };
  }

  static async list() {
    const [clients] = await db.execute<RowDataPacket[]>(
      "SELECT id, name, apiKey, createdAt FROM clients ORDER BY createdAt DESC"
    );

    return clients;
  }

  static async findById(id: string) {
    const [clients] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM clients WHERE id = ?",
      [id]
    );

    return clients[0] ?? null;
  }

  static async findByApiKey(apiKey: string) {
    const [clients] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM clients WHERE apiKey = ?",
      [apiKey]
    );

    return clients[0] ?? null;
  }

  static async getStats(id: string) {
    const [totalLeadsRows] = await db.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM leads WHERE clientId = ?",
      [id]
    );

    const [verifiedLeadsRows] = await db.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM leads WHERE clientId = ? AND status = 'verified'",
      [id]
    );

    const [monthlyUsage] = await db.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count
       FROM leads
       WHERE clientId = ?
       GROUP BY month
       ORDER BY month ASC
         LIMIT 12`,
      [id]
    );

    return {
      totalLeads: totalLeadsRows[0].count,
      verifiedLeads: verifiedLeadsRows[0].count,
      monthlyUsage,
    };
  }

  static async delete(id: string) {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM clients WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }

  static async updateWebhook(
    id: string,
    webhook: {
      webhookEnabled?: boolean;
      webhookUrl?: string;
      webhookMethod?: string;
      webhookHeaders?: string;
      webhookBodyTemplate?: string;
    }
  ) {
    await db.execute(
      `UPDATE clients
       SET webhookEnabled = ?, webhookUrl = ?, webhookMethod = ?, webhookHeaders = ?, webhookBodyTemplate = ?
       WHERE id = ?`,
      [
        webhook.webhookEnabled ? 1 : 0,
        webhook.webhookUrl || "",
        webhook.webhookMethod || "POST",
        webhook.webhookHeaders || "{}",
        webhook.webhookBodyTemplate || "",
        id,
      ]
    );
  }
}
