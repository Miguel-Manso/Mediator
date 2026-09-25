const sql = require('mssql');
const bcrypt = require('bcryptjs');
const path = require('path');

// Carrega as variáveis de ambiente independente de onde o processo for iniciado
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

const serverConfig = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
const isNamedInstance = serverConfig.includes('\\');
const [hostName, instanceName] = isNamedInstance ? serverConfig.split('\\') : [serverConfig, null];

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  server: isNamedInstance ? hostName : serverConfig,
  database: process.env.DB_DATABASE || 'mediator_db',
  ...(isNamedInstance ? {} : { port: Number(process.env.DB_PORT) || 1433 }),
  options: {
    ...(isNamedInstance && instanceName ? { instanceName } : {}),
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
    console.error(`\n❌ [SQL Server] Falha ao conectar ao banco '${config.database}' em '${serverConfig}':`);
    console.error(`   Usuário: '${config.user}'`);
    console.error(`   Erro: ${erro.message} (Código: ${erro.code || 'N/A'})\n`);
    throw erro;
  }
}

async function ensureDatabaseExists() {
  const masterConfig = {
    ...config,
    database: 'master',
  };

  try {
    const masterPool = await new sql.ConnectionPool(masterConfig).connect();
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${config.database}')
      BEGIN
        CREATE DATABASE [${config.database}];
      END
    `);
    await masterPool.close();
  } catch (erro) {
    // Log apenas informativo caso não tenha permissão no master, sem quebrar o fluxo
    console.warn(`[Banco] Verificação no 'master' omitida (${erro.message}). Conectando diretamente ao '${config.database}'...`);
  }
}

async function initDatabase() {
  try {
    await ensureDatabaseExists();
    const activePool = await getPool();

    // 1. Tabela de enderecos
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'enderecos')
      BEGIN
        CREATE TABLE enderecos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          logradouro NVARCHAR(255) NOT NULL,
          numero NVARCHAR(20) NULL,
          complemento NVARCHAR(100) NULL,
          bairro NVARCHAR(100) NULL,
          cidade NVARCHAR(100) DEFAULT 'Viradouro',
          uf NVARCHAR(2) DEFAULT 'SP',
          cep NVARCHAR(9) NULL,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_enderecos_cep ON enderecos(cep);
      END
    `);

    // 2. Tabela de usuarios (RF01 - com CPF e Soft Delete)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
      BEGIN
        CREATE TABLE usuarios (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(120) NOT NULL,
          cpf NVARCHAR(14) NULL,
          email NVARCHAR(180) UNIQUE NOT NULL,
          senha_hash NVARCHAR(255) NOT NULL,
          cargo NVARCHAR(20) NOT NULL DEFAULT 'ATENDENTE',
          status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          ativo BIT DEFAULT 1,
          telefone NVARCHAR(20) NULL,
          endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_usuarios_email ON usuarios(email);
        CREATE INDEX idx_usuarios_cpf ON usuarios(cpf);
        CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'cpf')
        BEGIN
          ALTER TABLE usuarios ADD cpf NVARCHAR(14) NULL;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'ativo')
        BEGIN
          ALTER TABLE usuarios ADD ativo BIT DEFAULT 1;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'endereco_id')
        BEGIN
          ALTER TABLE usuarios ADD endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL;
        END

        -- Migração e remoção de coluna redundante 'cidade' em usuarios
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'cidade')
        BEGIN
          DECLARE @dfUserCidade NVARCHAR(128);
          SELECT @dfUserCidade = name FROM sys.default_constraints 
          WHERE parent_object_id = OBJECT_ID('usuarios') 
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('usuarios'), 'cidade', 'ColumnId');
          IF @dfUserCidade IS NOT NULL EXEC('ALTER TABLE usuarios DROP CONSTRAINT ' + @dfUserCidade);
          ALTER TABLE usuarios DROP COLUMN cidade;
        END
      END
    `);

    // 3. Tabela de clientes (RF02 - Normalizada)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clientes')
      BEGIN
        CREATE TABLE clientes (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(150) NOT NULL,
          cpf NVARCHAR(14) UNIQUE NULL,
          email NVARCHAR(180) NULL,
          telefone NVARCHAR(20) NOT NULL,
          endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          ativo BIT DEFAULT 1,
          observacoes NVARCHAR(MAX) NULL,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_clientes_cpf ON clientes(cpf);
        CREATE INDEX idx_clientes_nome ON clientes(nome);
        CREATE INDEX idx_clientes_ativo ON clientes(ativo);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'ativo')
        BEGIN
          ALTER TABLE clientes ADD ativo BIT DEFAULT 1;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'endereco_id')
        BEGIN
          ALTER TABLE clientes ADD endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL;
        END
        -- Drop de senha_hash caso exista (clientes nao possuem acesso ao sistema)
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'senha_hash')
        BEGIN
          DECLARE @dfClienteSenha NVARCHAR(128);
          SELECT @dfClienteSenha = name FROM sys.default_constraints 
          WHERE parent_object_id = OBJECT_ID('clientes') 
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('clientes'), 'senha_hash', 'ColumnId');
          IF @dfClienteSenha IS NOT NULL EXEC('ALTER TABLE clientes DROP CONSTRAINT ' + @dfClienteSenha);
          ALTER TABLE clientes DROP COLUMN senha_hash;
        END

        -- Migração e remoção de colunas redundantes 'cidade' e 'endereco' em clientes
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'cidade')
        BEGIN
          DECLARE @dfClienteCidade NVARCHAR(128);
          SELECT @dfClienteCidade = name FROM sys.default_constraints 
          WHERE parent_object_id = OBJECT_ID('clientes') 
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('clientes'), 'cidade', 'ColumnId');
          IF @dfClienteCidade IS NOT NULL EXEC('ALTER TABLE clientes DROP CONSTRAINT ' + @dfClienteCidade);
          ALTER TABLE clientes DROP COLUMN cidade;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'endereco')
        BEGIN
          ALTER TABLE clientes DROP COLUMN endereco;
        END
      END
    `);

    // 4. Tabela de logs do sistema (Auditoria)
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
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_logs_criado_em ON logs_sistema(criado_em DESC);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('logs_sistema') AND name = 'ativo')
        BEGIN
          ALTER TABLE logs_sistema ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 5. Tabela de categorias de equipamento (RF03)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_equipamento')
      BEGIN
        CREATE TABLE categorias_equipamento (
          id INT IDENTITY(1,1) PRIMARY KEY,
          nome NVARCHAR(100) NOT NULL,
          ativo BIT DEFAULT 1
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('categorias_equipamento') AND name = 'ativo')
        BEGIN
          ALTER TABLE categorias_equipamento ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 6. Tabela de marcas (RF03)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'marcas')
      BEGIN
        CREATE TABLE marcas (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(100) NOT NULL,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_marcas_nome ON marcas(nome);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('marcas') AND name = 'ativo')
        BEGIN
          ALTER TABLE marcas ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 7. Tabela de modelos (RF03)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'modelos')
      BEGIN
        CREATE TABLE modelos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(100) NOT NULL,
          marca_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES marcas(id),
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_modelos_marca ON modelos(marca_id);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('modelos') AND name = 'ativo')
        BEGIN
          ALTER TABLE modelos ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 8. Tabela de equipamentos (RF03)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'equipamentos')
      BEGIN
        CREATE TABLE equipamentos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          descricao NVARCHAR(255) NOT NULL,
          numero_serie NVARCHAR(100) NULL,
          marca_id VARCHAR(36) NULL FOREIGN KEY REFERENCES marcas(id),
          modelo_id VARCHAR(36) NULL FOREIGN KEY REFERENCES modelos(id),
          ativo BIT DEFAULT 1,
          cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE CASCADE,
          categoria_id INT NOT NULL FOREIGN KEY REFERENCES categorias_equipamento(id),
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_equipamentos_cliente ON equipamentos(cliente_id);
        CREATE INDEX idx_equipamentos_numero_serie ON equipamentos(numero_serie);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('equipamentos') AND name = 'numero_serie')
        BEGIN
          ALTER TABLE equipamentos ADD numero_serie NVARCHAR(100) NULL;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('equipamentos') AND name = 'marca_id')
        BEGIN
          ALTER TABLE equipamentos ADD marca_id VARCHAR(36) NULL FOREIGN KEY REFERENCES marcas(id);
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('equipamentos') AND name = 'modelo_id')
        BEGIN
          ALTER TABLE equipamentos ADD modelo_id VARCHAR(36) NULL FOREIGN KEY REFERENCES modelos(id);
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('equipamentos') AND name = 'ativo')
        BEGIN
          ALTER TABLE equipamentos ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 9. Tabela de produtos / pecas (RF04)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'produtos')
      BEGIN
        CREATE TABLE produtos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          nome NVARCHAR(100) NOT NULL,
          descricao NVARCHAR(MAX) NULL,
          preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          estoque INT NOT NULL DEFAULT 0,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_produtos_nome ON produtos(nome);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos') AND name = 'ativo')
        BEGIN
          ALTER TABLE produtos ADD ativo BIT DEFAULT 1;
        END
      END
    `);

    // 10. Usuarios padrao para testes
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
        .input('cpf', sql.NVarChar, '111.111.111-11')
        .input('email', sql.NVarChar, 'admin@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .input('cargo', sql.NVarChar, 'ADMIN')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, cpf, email, senha_hash, cargo, status, ativo)
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @senha_hash, @cargo, @status, 1)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'admin@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO', ativo = 1 WHERE email = @email");
    }

    const checarMiguel = await activePool
      .request()
      .input('email', sql.NVarChar, 'miguel@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarMiguel.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Miguel Manso (Administrador)')
        .input('cpf', sql.NVarChar, '222.222.222-22')
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .input('cargo', sql.NVarChar, 'ADMIN')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, cpf, email, senha_hash, cargo, status, ativo)
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @senha_hash, @cargo, @status, 1)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO', ativo = 1 WHERE email = @email");
    }

    const checarAtendente = await activePool
      .request()
      .input('email', sql.NVarChar, 'ana@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarAtendente.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Ana Costa (Atendente)')
        .input('cpf', sql.NVarChar, '333.333.333-33')
        .input('email', sql.NVarChar, 'ana@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .input('cargo', sql.NVarChar, 'ATENDENTE')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, cpf, email, senha_hash, cargo, status, ativo)
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @senha_hash, @cargo, @status, 1)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'ana@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO', ativo = 1 WHERE email = @email");
    }

    const checarTecnico = await activePool
      .request()
      .input('email', sql.NVarChar, 'carlos@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarTecnico.recordset.length === 0) {
      await activePool
        .request()
        .input('nome', sql.NVarChar, 'Carlos Souza (Tecnico)')
        .input('cpf', sql.NVarChar, '444.444.444-44')
        .input('email', sql.NVarChar, 'carlos@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .input('cargo', sql.NVarChar, 'TECNICO')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, cpf, email, senha_hash, cargo, status, ativo)
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @senha_hash, @cargo, @status, 1)
        `);
    } else {
      await activePool
        .request()
        .input('email', sql.NVarChar, 'carlos@mediator.com')
        .input('senha_hash', sql.NVarChar, hashComum)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO', ativo = 1 WHERE email = @email");
    }

    // 11. Seeds de apoio (Categorias, Marcas, Modelos e Produtos)
    await activePool.request().query(`
      -- Categorias
      IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE nome = 'Notebook')
        INSERT INTO categorias_equipamento (nome, ativo) VALUES ('Notebook', 1);
      IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE nome = 'Computador / Desktop')
        INSERT INTO categorias_equipamento (nome, ativo) VALUES ('Computador / Desktop', 1);
      IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE nome = 'Smartphone / Celular')
        INSERT INTO categorias_equipamento (nome, ativo) VALUES ('Smartphone / Celular', 1);
      IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE nome = 'Tablet')
        INSERT INTO categorias_equipamento (nome, ativo) VALUES ('Tablet', 1);
      IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE nome = 'Impressora')
        INSERT INTO categorias_equipamento (nome, ativo) VALUES ('Impressora', 1);

      -- Marcas
      IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Dell')
        INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Dell', 1);
      IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Samsung')
        INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Samsung', 1);
      IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Apple')
        INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Apple', 1);
      IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Lenovo')
        INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Lenovo', 1);
      IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'HP')
        INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'HP', 1);

      -- Modelos
      IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Dell')
      BEGIN
        DECLARE @mDell VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Dell');
        IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Inspiron 15 3000')
          INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Inspiron 15 3000', @mDell, 1);
        IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Vostro 3520')
          INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Vostro 3520', @mDell, 1);
      END

      IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Samsung')
      BEGIN
        DECLARE @mSamsung VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Samsung');
        IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Galaxy Book 3')
          INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Galaxy Book 3', @mSamsung, 1);
        IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Galaxy S23 5G')
          INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Galaxy S23 5G', @mSamsung, 1);
      END

      IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Apple')
      BEGIN
        DECLARE @mApple VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Apple');
        IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'MacBook Air M2')
          INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'MacBook Air M2', @mApple, 1);
      END

      -- Produtos
      IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'SSD 480GB Kingston A400 SATA')
        INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
        VALUES (LOWER(NEWID()), 'SSD 480GB Kingston A400 SATA', 'Armazenamento de alta velocidade para upgrade de computadores', 219.90, 18, 1);

      IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Memória RAM 8GB DDR4 3200MHz')
        INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
        VALUES (LOWER(NEWID()), 'Memória RAM 8GB DDR4 3200MHz', 'Módulo de memória RAM para computadores e notebooks modernos', 149.00, 24, 1);

      IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Pasta Térmica Implastec Silver 5g')
        INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
        VALUES (LOWER(NEWID()), 'Pasta Térmica Implastec Silver 5g', 'Composto térmico com prata para alta dissipação de calor em CPUs', 35.00, 30, 1);

      IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Fonte ATX 500W 80 Plus Bronze')
        INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
        VALUES (LOWER(NEWID()), 'Fonte ATX 500W 80 Plus Bronze', 'Fonte bivolt com PFC ativo para computadores de escritório e gamers', 289.00, 4, 1);
    `);
  } catch (erro) {
    console.error('Erro ao inicializar tabelas no SQL Server:', erro);
  }
}

module.exports = {
  sql,
  getPool,
  initDatabase,
};
