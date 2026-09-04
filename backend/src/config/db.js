const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const serverConfig = process.env.DB_SERVER || 'localhost';
const isNamedInstance = serverConfig.includes('\\');

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'SuaSenhaForte123!',
  server: serverConfig,
  database: process.env.DB_DATABASE || 'mediator_db',
  ...(isNamedInstance ? {} : { port: Number(process.env.DB_PORT) || 1433 }),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool(config).connect();
    return pool;
  } catch (erro) {
    console.error('Falha ao conectar ao SQL Server:', erro);
    throw erro;
  }
}

async function initDatabase() {
  try {
    const activePool = await getPool();

    // 1. Tabela de usuarios
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
      BEGIN
        CREATE TABLE usuarios (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(120) NOT NULL,
          email NVARCHAR(180) UNIQUE NOT NULL,
          senha_hash NVARCHAR(255) NOT NULL,
          cargo NVARCHAR(20) NOT NULL DEFAULT 'ATENDENTE',
          status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          telefone NVARCHAR(20) NULL,
          cidade NVARCHAR(100) DEFAULT 'Viradouro',
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_usuarios_email ON usuarios(email);
      END
    `);

    // 2. Tabela de clientes
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clientes')
      BEGIN
        CREATE TABLE clientes (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(150) NOT NULL,
          cpf NVARCHAR(14) UNIQUE NULL,
          email NVARCHAR(180) NULL,
          telefone NVARCHAR(20) NOT NULL,
          cidade NVARCHAR(100) DEFAULT 'Viradouro',
          endereco NVARCHAR(255) NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          observacoes NVARCHAR(MAX) NULL,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_clientes_cpf ON clientes(cpf);
        CREATE INDEX idx_clientes_nome ON clientes(nome);
      END
    `);

    // 3. Tabela de logs do sistema (auditoria preservada)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'logs_sistema')
      BEGIN
        CREATE TABLE logs_sistema (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          usuario_id VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id) ON DELETE SET NULL,
          acao NVARCHAR(50) NOT NULL,
          entidade NVARCHAR(50) NOT NULL,
          entidade_id NVARCHAR(100) NULL,
          detalhes NVARCHAR(MAX) NULL,
          endereco_ip NVARCHAR(45) NULL,
          criado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_logs_criado_em ON logs_sistema(criado_em DESC);
      END
    `);

    // 4. Usuarios padrao para testes (fator de custo 10)
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashComum = await bcrypt.hash('123456', 10);

    const checarAdmin = await activePool
      .request()
      .input('email', sql.NVarChar, 'admin@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarAdmin.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Administrador Rocha Magazine')
        .input('email', sql.NVarChar, 'admin@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .input('cargo', sql.NVarChar, 'ADMIN')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status)
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, @status)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'admin@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");
    }

    const checarMiguel = await activePool
      .request()
      .input('email', sql.NVarChar, 'miguel@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarMiguel.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Miguel Manso (Administrador)')
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .input('cargo', sql.NVarChar, 'ADMIN')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status)
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, @status)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");
    }

    const checarAtendente = await activePool
      .request()
      .input('email', sql.NVarChar, 'ana@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarAtendente.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Ana Costa (Atendente)')
        .input('email', sql.NVarChar, 'ana@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .input('cargo', sql.NVarChar, 'ATENDENTE')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status)
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, @status)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'ana@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");
    }

    const checarTecnico = await activePool
      .request()
      .input('email', sql.NVarChar, 'carlos@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarTecnico.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Carlos Souza (Tecnico)')
        .input('email', sql.NVarChar, 'carlos@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .input('cargo', sql.NVarChar, 'TECNICO')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status)
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, @status)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'carlos@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");
    }
  } catch (erro) {
    console.error('Erro ao inicializar tabelas no SQL Server:', erro);
  }
}

module.exports = {
  sql,
  getPool,
  initDatabase,
};
