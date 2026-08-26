// src/controllers/stat.controller.ts
import { RowDataPacket } from 'mysql2';
import { db } from '../core/database'; // Importando a conexão real do MySQL

export class StatController {

    static async getStats(clientId: string | undefined, set: any) {
        try {
            let whereClause = '';
            let params: any[] = [];

            if (clientId) {
                whereClause = 'WHERE clientId = ?';
                params.push(clientId);
            }

            // 1. Total de Leads
            const [totalRows] = await db.execute<RowDataPacket[]>(
                `SELECT COUNT(*) as count FROM leads ${whereClause}`,
                params
            );
            const totalLeads = totalRows[0].count;

            // 2. Leads Verificados
            const verifiedWhere = clientId ? "WHERE status = 'verified' AND clientId = ?" : "WHERE status = 'verified'";
            const [verifiedRows] = await db.execute<RowDataPacket[]>(
                `SELECT COUNT(*) as count FROM leads ${verifiedWhere}`,
                params
            );
            const verifiedLeads = verifiedRows[0].count;

            // 3. Score Médio
            const [avgRows] = await db.execute<RowDataPacket[]>(
                `SELECT AVG(score) as avg FROM leads ${whereClause}`,
                params
            );
            const avgScore = avgRows[0].avg ? Math.round(avgRows[0].avg) : 0;

            // 4. Estatísticas de Probabilidade
            const [probStatsRows] = await db.execute<RowDataPacket[]>(
                `SELECT probability, COUNT(*) as count FROM leads ${whereClause} GROUP BY probability`,
                params
            );

            // O MySQL pode retornar o count como string ou número grande, forçamos Number() para garantir no frontend
            const probStats = [
                { name: 'HIGH', value: Number(probStatsRows.find((r: any) => r.probability === 'HIGH')?.count || 0), color: '#22c55e' },
                { name: 'MEDIUM', value: Number(probStatsRows.find((r: any) => r.probability === 'MEDIUM')?.count || 0), color: '#eab308' },
                { name: 'LOW', value: Number(probStatsRows.find((r: any) => r.probability === 'LOW')?.count || 0), color: '#ef4444' },
            ];

            // 5. Taxa de Conversão
            const conversionRate = totalLeads > 0 ? Math.round((verifiedLeads / totalLeads) * 100) : 0;

            // 6. Tendências Diárias (Últimos 30 dias - Adaptado para sintaxe MySQL)
            const trendWhere = clientId
                ? "WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND clientId = ?"
                : "WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

            const [trendRows] = await db.execute<RowDataPacket[]>(`
        SELECT 
          DATE(createdAt) as day, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
          AVG(score) as avgScore
        FROM leads 
        ${trendWhere}
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt) ASC
      `, params);

            const dailyTrends = trendRows.map((row: any) => ({
                // Dependendo da config do banco, o MySQL retorna a data nativa, garantimos o formato de string simples se precisar
                date: row.day,
                verified: Number(row.verified || 0),
                unverified: Number(row.total) - Number(row.verified || 0),
                avgScore: Math.round(row.avgScore || 0)
            }));

            return {
                totalLeads,
                verifiedLeads,
                avgScore,
                conversionRate,
                probStats,
                dailyTrends
            };

        } catch (e: any) {
            set.status = 500;
            return { error: e.message };
        }
    }
}