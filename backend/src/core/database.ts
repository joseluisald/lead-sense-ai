import mysql from 'mysql2/promise';

// Crie o pool de conexões com as suas credenciais
export const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'leadsense',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('📦 Pool de conexão com MySQL configurado!');
