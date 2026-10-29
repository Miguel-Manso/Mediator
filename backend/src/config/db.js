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
          EXEC('ALTER TABLE usuarios ADD cpf NVARCHAR(14) NULL');
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'ativo')
        BEGIN
          EXEC('ALTER TABLE usuarios ADD ativo BIT DEFAULT 1');
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

    // 3.1 Tabela intermediária de cliente_enderecos (N:N)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cliente_enderecos')
      BEGIN
        CREATE TABLE cliente_enderecos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE CASCADE,
          endereco_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE CASCADE,
          tipo NVARCHAR(50) DEFAULT 'PRINCIPAL',
          principal BIT DEFAULT 1,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT UQ_cliente_enderecos UNIQUE (cliente_id, endereco_id)
        );
        CREATE INDEX idx_cliente_enderecos_cliente ON cliente_enderecos(cliente_id);
        CREATE INDEX idx_cliente_enderecos_endereco ON cliente_enderecos(endereco_id);
        CREATE INDEX idx_cliente_enderecos_ativo ON cliente_enderecos(ativo);
      END
    `);

    // 3.2 Tabela intermediária de usuario_enderecos (N:N)
    await activePool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuario_enderecos')
      BEGIN
        CREATE TABLE usuario_enderecos (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id) ON DELETE CASCADE,
          endereco_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE CASCADE,
          tipo NVARCHAR(50) DEFAULT 'PRINCIPAL',
          principal BIT DEFAULT 1,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT UQ_usuario_enderecos UNIQUE (usuario_id, endereco_id)
        );
        CREATE INDEX idx_usuario_enderecos_usuario ON usuario_enderecos(usuario_id);
        CREATE INDEX idx_usuario_enderecos_endereco ON usuario_enderecos(endereco_id);
        CREATE INDEX idx_usuario_enderecos_ativo ON usuario_enderecos(ativo);
      END
    `);

    // 3.3 Migração e remoção de colunas legadas endereco_id em usuarios e clientes
    await activePool.request().query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'endereco_id')
      BEGIN
        EXEC('
          INSERT INTO usuario_enderecos (id, usuario_id, endereco_id, tipo, principal, ativo)
          SELECT LOWER(NEWID()), u.id, u.endereco_id, ''PRINCIPAL'', 1, 1
          FROM usuarios u
          WHERE u.endereco_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM usuario_enderecos ue 
              WHERE ue.usuario_id = u.id AND ue.endereco_id = u.endereco_id
            )
        ');

        DECLARE @fkUserEnd NVARCHAR(128);
        SELECT @fkUserEnd = fk.name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        WHERE fkc.parent_object_id = OBJECT_ID('usuarios')
          AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'endereco_id';

        IF @fkUserEnd IS NOT NULL
          EXEC('ALTER TABLE usuarios DROP CONSTRAINT ' + @fkUserEnd);

        EXEC('ALTER TABLE usuarios DROP COLUMN endereco_id');
      END

      IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'endereco_id')
      BEGIN
        EXEC('
          INSERT INTO cliente_enderecos (id, cliente_id, endereco_id, tipo, principal, ativo)
          SELECT LOWER(NEWID()), c.id, c.endereco_id, ''PRINCIPAL'', 1, 1
          FROM clientes c
          WHERE c.endereco_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM cliente_enderecos ce 
              WHERE ce.cliente_id = c.id AND ce.endereco_id = c.endereco_id
            )
        ');

        DECLARE @fkCliEnd NVARCHAR(128);
        SELECT @fkCliEnd = fk.name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        WHERE fkc.parent_object_id = OBJECT_ID('clientes')
          AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'endereco_id';

        IF @fkCliEnd IS NOT NULL
          EXEC('ALTER TABLE clientes DROP CONSTRAINT ' + @fkCliEnd);

        EXEC('ALTER TABLE clientes DROP COLUMN endereco_id');
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

    // Vincular endereço padrão aos usuários padrão via usuario_enderecos (N:N)
    await activePool.request().query(`
      DECLARE @endPadraoId VARCHAR(36);
      SELECT TOP 1 @endPadraoId = id FROM enderecos WHERE cidade = 'Viradouro';
      IF @endPadraoId IS NULL
      BEGIN
        SET @endPadraoId = LOWER(NEWID());
        INSERT INTO enderecos (id, logradouro, numero, bairro, cidade, uf, cep)
        VALUES (@endPadraoId, 'Rua Principal', '100', 'Centro', 'Viradouro', 'SP', '14740-000');
      END

      INSERT INTO usuario_enderecos (id, usuario_id, endereco_id, tipo, principal, ativo)
      SELECT LOWER(NEWID()), u.id, @endPadraoId, 'PRINCIPAL', 1, 1
      FROM usuarios u
      WHERE u.email IN ('admin@mediator.com', 'miguel@mediator.com', 'ana@mediator.com', 'carlos@mediator.com')
        AND NOT EXISTS (
          SELECT 1 FROM usuario_enderecos ue 
          WHERE ue.usuario_id = u.id AND ue.endereco_id = @endPadraoId
        );
    `);

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

      -- 12. Tabela de status da ordem (RF05)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'status_ordem')
      BEGIN
        CREATE TABLE status_ordem (
          id INT PRIMARY KEY,
          nome NVARCHAR(50) NOT NULL,
          descricao NVARCHAR(100) NULL,
          cor NVARCHAR(20) NULL,
          ordem INT DEFAULT 0,
          ativo BIT DEFAULT 1
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('status_ordem') AND name = 'cor')
          ALTER TABLE status_ordem ADD cor NVARCHAR(20) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('status_ordem') AND name = 'ordem')
          ALTER TABLE status_ordem ADD ordem INT DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('status_ordem') AND name = 'ativo')
          ALTER TABLE status_ordem ADD ativo BIT DEFAULT 1;
      END

      -- Seeds canônicos de status_ordem (RF05)
      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 1) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (1, 'Aberto / Recebido', 'Ordem de serviço cadastrada e aguardando triagem', '#3B82F6', 1, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Aberto / Recebido', descricao = 'Ordem de serviço cadastrada e aguardando triagem', cor = '#3B82F6', ordem = 1, ativo = 1 WHERE id = 1;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 2) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (2, 'Em Análise / Diagnóstico', 'Equipamento em diagnóstico técnico para orçamento', '#8B5CF6', 2, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Em Análise / Diagnóstico', descricao = 'Equipamento em diagnóstico técnico para orçamento', cor = '#8B5CF6', ordem = 2, ativo = 1 WHERE id = 2;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 3) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (3, 'Aguardando Aprovação', 'Orçamento e laudo enviados aguardando resposta do cliente', '#F59E0B', 3, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Aguardando Aprovação', descricao = 'Orçamento e laudo enviados aguardando resposta do cliente', cor = '#F59E0B', ordem = 3, ativo = 1 WHERE id = 3;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 4) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (4, 'Aprovado pelo Cliente', 'Cliente aprovou o orçamento de peças e serviços para início do reparo', '#10B981', 4, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Aprovado pelo Cliente', descricao = 'Cliente aprovou o orçamento de peças e serviços para início do reparo', cor = '#10B981', ordem = 4, ativo = 1 WHERE id = 4;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 5) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (5, 'Em Reparo / Em Andamento', 'Serviço aprovado e técnico realizando manutenção na bancada', '#06B6D4', 5, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Em Reparo / Em Andamento', descricao = 'Serviço aprovado e técnico realizando manutenção na bancada', cor = '#06B6D4', ordem = 5, ativo = 1 WHERE id = 5;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 6) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (6, 'Aguardando Peças', 'Manutenção pausada aguardando chegada de peças/insumos', '#EC4899', 6, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Aguardando Peças', descricao = 'Manutenção pausada aguardando chegada de peças/insumos', cor = '#EC4899', ordem = 6, ativo = 1 WHERE id = 6;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 7) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (7, 'Testes Finais / Concluído', 'Reparo finalizado e passando por testes de validação', '#84CC16', 7, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Testes Finais / Concluído', descricao = 'Reparo finalizado e passando por testes de validação', cor = '#84CC16', ordem = 7, ativo = 1 WHERE id = 7;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 8) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (8, 'Entregue / Finalizado', 'Equipamento entregue ao cliente e ordem finalizada no balcão', '#64748B', 8, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Entregue / Finalizado', descricao = 'Equipamento entregue ao cliente e ordem finalizada no balcão', cor = '#64748B', ordem = 8, ativo = 1 WHERE id = 8;

      IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 9) 
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo) VALUES (9, 'Cancelado', 'Ordem cancelada ou orçamento reprovado pelo cliente', '#EF4444', 9, 1);
      ELSE
        UPDATE status_ordem SET nome = 'Cancelado', descricao = 'Ordem cancelada ou orçamento reprovado pelo cliente', cor = '#EF4444', ordem = 9, ativo = 1 WHERE id = 9;

      -- 13. Tabela de ordens de servico (RF06)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ordens_servico')
      BEGIN
        CREATE TABLE ordens_servico (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          numero_ordem NVARCHAR(30) UNIQUE NOT NULL,
          tipo_reparo NVARCHAR(50) NULL,
          perguntas_triagem NVARCHAR(MAX) NULL,
          descricao_problema NVARCHAR(MAX) NOT NULL,
          laudo_tecnico NVARCHAR(MAX) NULL,
          observacoes_atendimento NVARCHAR(MAX) NULL,
          status_id INT NOT NULL FOREIGN KEY REFERENCES status_ordem(id),
          cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id),
          equipamento_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES equipamentos(id),
          atendente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
          tecnico_id VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id),
          ativo BIT DEFAULT 1,
          aberto_em DATETIME2 DEFAULT GETDATE(),
          fechado_em DATETIME2 NULL,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_ordens_cliente ON ordens_servico(cliente_id);
        CREATE INDEX idx_ordens_status ON ordens_servico(status_id);
        CREATE INDEX idx_ordens_tecnico ON ordens_servico(tecnico_id);
        CREATE INDEX idx_ordens_aberto_em ON ordens_servico(aberto_em DESC);
        CREATE INDEX idx_ordens_ativo ON ordens_servico(ativo);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'tipo_reparo')
          ALTER TABLE ordens_servico ADD tipo_reparo NVARCHAR(50) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'perguntas_triagem')
          ALTER TABLE ordens_servico ADD perguntas_triagem NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'observacoes_atendimento')
          ALTER TABLE ordens_servico ADD observacoes_atendimento NVARCHAR(MAX) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'ativo')
          ALTER TABLE ordens_servico ADD ativo BIT DEFAULT 1;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'ordem_kanban')
          ALTER TABLE ordens_servico ADD ordem_kanban INT DEFAULT 0;
      END

      -- 14. Tabela de produtos_ordem (RF06)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'produtos_ordem')
      BEGIN
        CREATE TABLE produtos_ordem (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
          produto_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES produtos(id),
          quantidade INT NOT NULL DEFAULT 1,
          preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          baixado BIT NOT NULL DEFAULT 0,
          baixado_em DATETIME2 NULL,
          baixado_por VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id),
          baixado_estoque BIT DEFAULT 0,
          usuario_id VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id),
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE(),
          atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_produtos_ordem_ordem ON produtos_ordem(ordem_id);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'usuario_id')
          EXEC('ALTER TABLE produtos_ordem ADD usuario_id VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id)');
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'baixado')
        BEGIN
          EXEC('ALTER TABLE produtos_ordem ADD baixado BIT NOT NULL DEFAULT 0');
          EXEC('ALTER TABLE produtos_ordem ADD baixado_em DATETIME2 NULL');
          EXEC('ALTER TABLE produtos_ordem ADD baixado_por VARCHAR(36) NULL FOREIGN KEY REFERENCES usuarios(id)');
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'baixado_estoque')
          EXEC('ALTER TABLE produtos_ordem ADD baixado_estoque BIT DEFAULT 0');
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'ativo')
          EXEC('ALTER TABLE produtos_ordem ADD ativo BIT DEFAULT 1');

        -- Sincronizar dados prévios se baixado_estoque existir
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'baixado')
           AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'baixado_estoque')
        BEGIN
          EXEC('UPDATE produtos_ordem SET baixado = baixado_estoque WHERE baixado = 0 AND baixado_estoque = 1');
        END
      END

      -- 15. Tabela de historico_ordens (RF06)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'historico_ordens')
      BEGIN
        CREATE TABLE historico_ordens (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
          usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
          tipo_registro NVARCHAR(30) NOT NULL DEFAULT 'PARECER',
          status_id INT NULL FOREIGN KEY REFERENCES status_ordem(id),
          etapa NVARCHAR(50) NULL,
          descricao NVARCHAR(MAX) NOT NULL,
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_historico_ordem ON historico_ordens(ordem_id);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('historico_ordens') AND name = 'tipo_registro')
          EXEC('ALTER TABLE historico_ordens ADD tipo_registro NVARCHAR(30) DEFAULT ''PARECER''');
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('historico_ordens') AND name = 'status_id')
          EXEC('ALTER TABLE historico_ordens ADD status_id INT NULL FOREIGN KEY REFERENCES status_ordem(id)');
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('historico_ordens') AND name = 'etapa')
          EXEC('ALTER TABLE historico_ordens ADD etapa NVARCHAR(50) NULL');
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('historico_ordens') AND name = 'ativo')
          EXEC('ALTER TABLE historico_ordens ADD ativo BIT DEFAULT 1');

        -- Backfill dinâmico do tipo_registro para não quebrar o parse time do SQL Server
        EXEC('UPDATE historico_ordens SET tipo_registro = ''STATUS'' WHERE status_id IS NOT NULL AND (tipo_registro IS NULL OR tipo_registro = ''PARECER'')');
        EXEC('UPDATE historico_ordens SET tipo_registro = ''PARECER'' WHERE tipo_registro IS NULL');
      END

      -- 16. Tabela de movimentacoes_status (RF06)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'movimentacoes_status')
      BEGIN
        CREATE TABLE movimentacoes_status (
          id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
          ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
          status_id INT NOT NULL FOREIGN KEY REFERENCES status_ordem(id),
          usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
          ativo BIT DEFAULT 1,
          criado_em DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_movimentacoes_ordem ON movimentacoes_status(ordem_id);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('movimentacoes_status') AND name = 'ativo')
          ALTER TABLE movimentacoes_status ADD ativo BIT DEFAULT 1;
      END

      -- Drop da tabela tipos_reparo caso tenha sido criada anteriormente
      IF OBJECT_ID('tipos_reparo', 'U') IS NOT NULL
      BEGIN
        DROP TABLE tipos_reparo;
      END
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
