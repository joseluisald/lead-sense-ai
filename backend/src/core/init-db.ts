import { randomBytes, randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { db } from './database';

export async function initializeDatabase() {
    console.log('🔄 Verificando e criando tabelas no MySQL...');

    try {
        // 1. Tabela Clients
        // Usamos VARCHAR(36) para UUIDs no MySQL por questões de performance
        await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        apiKey VARCHAR(255) UNIQUE NOT NULL,
        webhookEnabled TINYINT(1) DEFAULT 0,
        webhookUrl TEXT,
        webhookMethod VARCHAR(10) DEFAULT 'POST',
        webhookHeaders TEXT,
        webhookBodyTemplate TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 2. Tabela Leads
        // Adicionada a restrição ON DELETE CASCADE (se apagar o cliente, apaga os leads dele)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(36) PRIMARY KEY,
        clientId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        probability VARCHAR(50) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending_verification',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

        // 3. Tabela API Logs
        // Transformamos o ID em AUTO_INCREMENT, já que o log não precisa de UUID
        await db.execute(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        requestBody TEXT,
        statusCode INT NOT NULL,
        responseBody TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 4. Tabela Users
        await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        resetPasswordTokenHash VARCHAR(64),
        resetPasswordExpiresAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_reset_token (resetPasswordTokenHash)
      )
    `);

        // 5. Tabela Settings
        // 'key' é uma palavra reservada no MySQL, por isso usamos crases (`key`)
        await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

        // ==========================================
        // SEEDS (Dados Iniciais)
        // ==========================================

        // Seed: Template de E-mail
        const [templateRows] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM settings WHERE \`key\` = 'email_template'");

        if (templateRows[0].count === 0) {
            await db.execute("INSERT INTO settings (\`key\`, value) VALUES ('email_template', ?)", [
                JSON.stringify({
                    subject: 'Verifique seu interesse!',
                    body: 'Olá {name}, confirme seu email clicando aqui:',
                    buttonText: 'Verificar E-mail',
                    color: '#16a34a'
                })
            ]);
            console.log('✅ Template de e-mail padrão inserido.');
        }

        // Seed: Cliente e Lead de Teste
        const [clientRows] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM clients");

        if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA === 'true' && clientRows[0].count === 0) {
            const clientId = randomUUID();
            const apiKey = 'sk_test_' + randomBytes(16).toString('hex');

            await db.execute('INSERT INTO clients (id, name, apiKey) VALUES (?, ?, ?)',
                [clientId, 'Empresa de Exemplo (Acme Corp)', apiKey]
            );

            const leadId = randomUUID();
            await db.execute(
                'INSERT INTO leads (id, clientId, name, email, whatsapp, score, probability, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [leadId, clientId, 'João Silva (Exemplo)', 'joao.silva@exemplo.com', '11999999999', 85, 'HIGH', 'Email corporativo forte e telefone válido.', 'verified']
            );

            console.log('✅ Cliente e Lead de exemplo inseridos.');
        }

        console.log('🚀 Banco de dados MySQL inicializado e pronto para uso!');

    } catch (error) {
        console.error('❌ Erro ao inicializar o banco de dados:', error);
    }
}
