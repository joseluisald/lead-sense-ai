import { RowDataPacket } from 'mysql2';
import { db } from '../core/database';

export class StatModel {
    static async get(clientId?: string) {
        const whereClause = clientId ? 'WHERE clientId = ?' : '';
        const params = clientId ? [clientId] : [];
        const verifiedWhere = clientId ? "WHERE status = 'verified' AND clientId = ?" : "WHERE status = 'verified'";
        const trendWhere = clientId
            ? 'WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND clientId = ?'
            : 'WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

        const [totalRows] = await db.execute<RowDataPacket[]>(`SELECT COUNT(*) as count FROM leads ${whereClause}`, params);
        const [verifiedRows] = await db.execute<RowDataPacket[]>(`SELECT COUNT(*) as count FROM leads ${verifiedWhere}`, params);
        const [averageRows] = await db.execute<RowDataPacket[]>(`SELECT AVG(score) as avg FROM leads ${whereClause}`, params);
        const [probabilityRows] = await db.execute<RowDataPacket[]>(`SELECT probability, COUNT(*) as count FROM leads ${whereClause} GROUP BY probability`, params);
        const [trendRows] = await db.execute<RowDataPacket[]>(`
            SELECT DATE(createdAt) as day, COUNT(*) as total,
                   SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
                   AVG(score) as avgScore
            FROM leads
            ${trendWhere}
            GROUP BY DATE(createdAt)
            ORDER BY DATE(createdAt) ASC
        `, params);

        const totalLeads = Number(totalRows[0].count);
        const verifiedLeads = Number(verifiedRows[0].count);
        return {
            totalLeads,
            verifiedLeads,
            avgScore: averageRows[0].avg ? Math.round(averageRows[0].avg) : 0,
            conversionRate: totalLeads > 0 ? Math.round((verifiedLeads / totalLeads) * 100) : 0,
            probStats: ['HIGH', 'MEDIUM', 'LOW'].map((name, index) => ({
                name,
                value: Number(probabilityRows.find((row) => row.probability === name)?.count ?? 0),
                color: ['#22c55e', '#eab308', '#ef4444'][index]
            })),
            dailyTrends: trendRows.map((row) => ({
                date: row.day,
                verified: Number(row.verified ?? 0),
                unverified: Number(row.total) - Number(row.verified ?? 0),
                avgScore: Math.round(row.avgScore ?? 0)
            }))
        };
    }
}
