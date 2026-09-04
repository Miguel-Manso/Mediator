-- =========================================================================
-- SISTEMA DE GESTAO DE ORDENS DE SERVICO (MEDIATOR)
-- SCRIPT OFICIAL DE CRIACAO E INICIALIZACAO NO MICROSOFT SQL SERVER
-- =========================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'mediator_db')
BEGIN
    CREATE DATABASE mediator_db;
END
GO

USE mediator_db;
GO

-- 1. TABELA DE USUARIOS (usuarios)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        nome NVARCHAR(120) NOT NULL,
        email NVARCHAR(180) UNIQUE NOT NULL,
        senha_hash NVARCHAR(255) NOT NULL,
        cargo NVARCHAR(20) NOT NULL DEFAULT 'ATENDENTE', -- 'ADMIN', 'ATENDENTE', 'TECNICO'
        status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',    -- 'ATIVO', 'INATIVO'
        telefone NVARCHAR(20) NULL,
        cidade NVARCHAR(100) DEFAULT 'Viradouro',
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_usuarios_email ON usuarios(email);
    CREATE INDEX idx_usuarios_cargo ON usuarios(cargo);
    PRINT 'Tabela usuarios criada com sucesso.';
END
GO

-- 2. TABELA DE CLIENTES (clientes)
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
    CREATE INDEX idx_clientes_nome ON clientes(nome);
    CREATE INDEX idx_clientes_cpf ON clientes(cpf);
    CREATE INDEX idx_clientes_telefone ON clientes(telefone);
    PRINT 'Tabela clientes criada com sucesso.';
END
GO

-- 3. LOGS DO SISTEMA E AUDITORIA (logs_sistema)
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
    CREATE INDEX idx_logs_entidade ON logs_sistema(entidade);
    PRINT 'Tabela logs_sistema criada com sucesso.';
END
GO

-- 4. CATEGORIAS DE EQUIPAMENTO (categorias_equipamento)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_equipamento')
BEGIN
    CREATE TABLE categorias_equipamento (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL
    );
    PRINT 'Tabela categorias_equipamento criada com sucesso.';
END
GO

-- 5. EQUIPAMENTOS (equipamentos)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'equipamentos')
BEGIN
    CREATE TABLE equipamentos (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        descricao NVARCHAR(255) NOT NULL,
        modelo NVARCHAR(100) NULL,
        marca NVARCHAR(100) NULL,
        ativo BIT DEFAULT 1,
        cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id) ON DELETE CASCADE,
        categoria_id INT NOT NULL FOREIGN KEY REFERENCES categorias_equipamento(id),
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_equipamentos_cliente ON equipamentos(cliente_id);
    PRINT 'Tabela equipamentos criada com sucesso.';
END
GO

-- 6. PRODUTOS / PECAS (produtos)
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
    PRINT 'Tabela produtos criada com sucesso.';
END
GO

-- 7. STATUS DA ORDEM DE SERVICO (status_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'status_ordem')
BEGIN
    CREATE TABLE status_ordem (
        id INT PRIMARY KEY,
        nome NVARCHAR(50) NOT NULL,
        descricao NVARCHAR(100) NULL
    );
    PRINT 'Tabela status_ordem criada com sucesso.';
END
GO

-- 8. TIPOS DE SERVICO (tipos_servico)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_servico')
BEGIN
    CREATE TABLE tipos_servico (
        id INT PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL
    );
    PRINT 'Tabela tipos_servico criada com sucesso.';
END
GO

-- 9. ORDENS DE SERVICO (ordens_servico)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ordens_servico')
BEGIN
    CREATE TABLE ordens_servico (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        numero_ordem NVARCHAR(30) UNIQUE NOT NULL,
        descricao_problema NVARCHAR(MAX) NOT NULL,
        laudo_tecnico NVARCHAR(MAX) NULL,
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
    PRINT 'Tabela ordens_servico criada com sucesso.';
END
GO

-- 10. ITENS / PRODUTOS DA OS (produtos_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'produtos_ordem')
BEGIN
    CREATE TABLE produtos_ordem (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        produto_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES produtos(id),
        quantidade INT NOT NULL DEFAULT 1,
        preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        criado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela produtos_ordem criada com sucesso.';
END
GO

-- 11. HISTORICO DE ANDAMENTO DA OS (historico_ordens)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'historico_ordens')
BEGIN
    CREATE TABLE historico_ordens (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
        descricao NVARCHAR(MAX) NOT NULL,
        criado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_historico_ordem ON historico_ordens(ordem_id);
    PRINT 'Tabela historico_ordens criada com sucesso.';
END
GO

-- 12. PAGAMENTO E RESUMO FINANCEIRO (pagamentos_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pagamentos_ordem')
BEGIN
    CREATE TABLE pagamentos_ordem (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) UNIQUE NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        valor_servico DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_produtos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tempo_execucao NVARCHAR(50) NULL,
        tipo_servico_id INT NOT NULL FOREIGN KEY REFERENCES tipos_servico(id),
        criado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela pagamentos_ordem criada com sucesso.';
END
GO

-- 13. MOVIMENTACAO DE STATUS (movimentacoes_status)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'movimentacoes_status')
BEGIN
    CREATE TABLE movimentacoes_status (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        status_id INT NOT NULL FOREIGN KEY REFERENCES status_ordem(id),
        usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
        criado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_movimentacoes_ordem ON movimentacoes_status(ordem_id);
    PRINT 'Tabela movimentacoes_status criada com sucesso.';
END
GO

-- 14. COMUNICACAO COM O CLIENTE (comunicacoes_cliente)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comunicacoes_cliente')
BEGIN
    CREATE TABLE comunicacoes_cliente (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id),
        mensagem NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(50) DEFAULT 'PENDENTE',
        enviado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela comunicacoes_cliente criada com sucesso.';
END
GO

-- =========================================================================
-- CARGA DE DADOS INICIAIS (SEEDS)
-- =========================================================================

-- Status da Ordem de Servico (Kanban)
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 1) INSERT INTO status_ordem (id, nome, descricao) VALUES (1, 'Aberto', 'Ordem de servico cadastrada e aguardando triagem');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 2) INSERT INTO status_ordem (id, nome, descricao) VALUES (2, 'Em Diagnostico', 'Tecnico analisando o equipamento');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 3) INSERT INTO status_ordem (id, nome, descricao) VALUES (3, 'Aguardando Aprovacao', 'Orcamento enviado ao cliente');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 4) INSERT INTO status_ordem (id, nome, descricao) VALUES (4, 'Aguardando Peca', 'Peca solicitada ao fornecedor');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 5) INSERT INTO status_ordem (id, nome, descricao) VALUES (5, 'Em Execucao / Manutencao', 'Reparo em andamento');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 6) INSERT INTO status_ordem (id, nome, descricao) VALUES (6, 'Concluido', 'Reparo e testes finalizados');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 7) INSERT INTO status_ordem (id, nome, descricao) VALUES (7, 'Entregue ao Cliente', 'Aparelho retirado pelo cliente');
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 8) INSERT INTO status_ordem (id, nome, descricao) VALUES (8, 'Cancelado', 'Orcamento recusado ou OS cancelada');

-- Categorias de Equipamentos Padrao
SET IDENTITY_INSERT categorias_equipamento ON;
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 1) INSERT INTO categorias_equipamento (id, nome) VALUES (1, 'Notebook');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 2) INSERT INTO categorias_equipamento (id, nome) VALUES (2, 'Computador / Desktop');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 3) INSERT INTO categorias_equipamento (id, nome) VALUES (3, 'Smartphone / Celular');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 4) INSERT INTO categorias_equipamento (id, nome) VALUES (4, 'Tablet');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 5) INSERT INTO categorias_equipamento (id, nome) VALUES (5, 'Impressora');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 6) INSERT INTO categorias_equipamento (id, nome) VALUES (6, 'Televisor / Monitor');
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 7) INSERT INTO categorias_equipamento (id, nome) VALUES (7, 'Outros Eletroeletronicos');
SET IDENTITY_INSERT categorias_equipamento OFF;

-- Tipos de Servico
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 1) INSERT INTO tipos_servico (id, nome) VALUES (1, 'Manutencao Preventiva / Limpeza');
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 2) INSERT INTO tipos_servico (id, nome) VALUES (2, 'Manutencao Corretiva');
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 3) INSERT INTO tipos_servico (id, nome) VALUES (3, 'Troca de Componente / Peca');
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 4) INSERT INTO tipos_servico (id, nome) VALUES (4, 'Formatacao e Instalacao de SO');
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 5) INSERT INTO tipos_servico (id, nome) VALUES (5, 'Remocao de Virus e Otimizacao');
IF NOT EXISTS (SELECT 1 FROM tipos_servico WHERE id = 6) INSERT INTO tipos_servico (id, nome) VALUES (6, 'Reparo em Placa / Eletronica');

-- Usuarios Padrao para Teste
-- Senhas Bcrypt (fator 12):
-- admin123 -> $2a$12$e8w6Q3U48uBgl6rD46m/7.qYfV/YjLdNu0m8C98W0dCq6U6p1mC5G
-- 123456   -> $2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@mediator.com')
BEGIN
    INSERT INTO usuarios (nome, email, senha_hash, cargo, status, telefone, cidade)
    VALUES ('Administrador Rocha Magazine', 'admin@mediator.com', '$2a$12$e8w6Q3U48uBgl6rD46m/7.qYfV/YjLdNu0m8C98W0dCq6U6p1mC5G', 'ADMIN', 'ATIVO', '(17) 99999-0001', 'Viradouro');
END

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'ana@mediator.com')
BEGIN
    INSERT INTO usuarios (nome, email, senha_hash, cargo, status, telefone, cidade)
    VALUES ('Ana Costa (Atendente)', 'ana@mediator.com', '$2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a', 'ATENDENTE', 'ATIVO', '(17) 99999-0002', 'Viradouro');
END

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'carlos@mediator.com')
BEGIN
    INSERT INTO usuarios (nome, email, senha_hash, cargo, status, telefone, cidade)
    VALUES ('Carlos Souza (Tecnico)', 'carlos@mediator.com', '$2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a', 'TECNICO', 'ATIVO', '(17) 99999-0003', 'Viradouro');
END
GO
