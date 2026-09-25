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

-- 1. TABELA DE ENDERECOS (enderecos)
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
    CREATE INDEX idx_enderecos_cidade ON enderecos(cidade);
    PRINT 'Tabela enderecos criada com sucesso.';
END
GO

-- 2. TABELA DE USUARIOS (usuarios)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        nome NVARCHAR(120) NOT NULL,
        email NVARCHAR(180) UNIQUE NOT NULL,
        senha_hash NVARCHAR(255) NOT NULL,
        cargo NVARCHAR(20) NOT NULL DEFAULT 'ATENDENTE', -- 'ADMIN', 'ATENDENTE', 'TECNICO'
        status NVARCHAR(20) NOT NULL DEFAULT 'ATIVO',    -- 'ATIVO', 'INATIVO'
        ativo BIT DEFAULT 1,
        telefone NVARCHAR(20) NULL,
        endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL,
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_usuarios_email ON usuarios(email);
    CREATE INDEX idx_usuarios_cargo ON usuarios(cargo);
    CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
    PRINT 'Tabela usuarios criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'ativo')
    BEGIN
        ALTER TABLE usuarios ADD ativo BIT DEFAULT 1;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'endereco_id')
    BEGIN
        ALTER TABLE usuarios ADD endereco_id VARCHAR(36) NULL FOREIGN KEY REFERENCES enderecos(id) ON DELETE SET NULL;
    END
    -- Drop legado de cidade se existir
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'cidade')
    BEGIN
        DECLARE @dfUserCidade NVARCHAR(128);
        SELECT @dfUserCidade = name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('usuarios') AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('usuarios'), 'cidade', 'ColumnId');
        IF @dfUserCidade IS NOT NULL EXEC('ALTER TABLE usuarios DROP CONSTRAINT ' + @dfUserCidade);
        ALTER TABLE usuarios DROP COLUMN cidade;
    END
END
GO

-- 3. TABELA DE CLIENTES (clientes)
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
    CREATE INDEX idx_clientes_nome ON clientes(nome);
    CREATE INDEX idx_clientes_cpf ON clientes(cpf);
    CREATE INDEX idx_clientes_telefone ON clientes(telefone);
    CREATE INDEX idx_clientes_ativo ON clientes(ativo);
    PRINT 'Tabela clientes criada com sucesso.';
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
        SELECT @dfClienteSenha = name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('clientes') AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('clientes'), 'senha_hash', 'ColumnId');
        IF @dfClienteSenha IS NOT NULL EXEC('ALTER TABLE clientes DROP CONSTRAINT ' + @dfClienteSenha);
        ALTER TABLE clientes DROP COLUMN senha_hash;
    END
    -- Drop legado de cidade e endereco se existirem
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'cidade')
    BEGIN
        DECLARE @dfClienteCidade NVARCHAR(128);
        SELECT @dfClienteCidade = name FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('clientes') AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('clientes'), 'cidade', 'ColumnId');
        IF @dfClienteCidade IS NOT NULL EXEC('ALTER TABLE clientes DROP CONSTRAINT ' + @dfClienteCidade);
        ALTER TABLE clientes DROP COLUMN cidade;
    END
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'endereco')
    BEGIN
        ALTER TABLE clientes DROP COLUMN endereco;
    END
END
GO

-- 4. LOGS DO SISTEMA E AUDITORIA (logs_sistema)
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
    CREATE INDEX idx_logs_entidade ON logs_sistema(entidade);
    PRINT 'Tabela logs_sistema criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('logs_sistema') AND name = 'ativo')
    BEGIN
        ALTER TABLE logs_sistema ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 5. CATEGORIAS DE EQUIPAMENTO (categorias_equipamento)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categorias_equipamento')
BEGIN
    CREATE TABLE categorias_equipamento (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL,
        ativo BIT DEFAULT 1
    );
    PRINT 'Tabela categorias_equipamento criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('categorias_equipamento') AND name = 'ativo')
    BEGIN
        ALTER TABLE categorias_equipamento ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 6. MARCAS (marcas)
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
    PRINT 'Tabela marcas criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('marcas') AND name = 'ativo')
    BEGIN
        ALTER TABLE marcas ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 7. MODELOS (modelos)
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
    CREATE INDEX idx_modelos_nome ON modelos(nome);
    PRINT 'Tabela modelos criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('modelos') AND name = 'ativo')
    BEGIN
        ALTER TABLE modelos ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 8. EQUIPAMENTOS (equipamentos)
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
    CREATE INDEX idx_equipamentos_marca ON equipamentos(marca_id);
    CREATE INDEX idx_equipamentos_modelo ON equipamentos(modelo_id);
    CREATE INDEX idx_equipamentos_numero_serie ON equipamentos(numero_serie);
    PRINT 'Tabela equipamentos criada com sucesso.';
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
GO

-- 9. PRODUTOS / PECAS (produtos)
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
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos') AND name = 'ativo')
    BEGIN
        ALTER TABLE produtos ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 10. STATUS DA ORDEM DE SERVICO (status_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'status_ordem')
BEGIN
    CREATE TABLE status_ordem (
        id INT PRIMARY KEY,
        nome NVARCHAR(50) NOT NULL,
        descricao NVARCHAR(100) NULL,
        ativo BIT DEFAULT 1
    );
    PRINT 'Tabela status_ordem criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('status_ordem') AND name = 'ativo')
    BEGIN
        ALTER TABLE status_ordem ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 11. SERVICOS (antigo tipos_servico)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'servicos')
BEGIN
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'tipos_servico')
    BEGIN
        EXEC sp_rename 'tipos_servico', 'servicos';
        PRINT 'Tabela tipos_servico renomeada para servicos.';
    END
    ELSE
    BEGIN
        CREATE TABLE servicos (
            id INT PRIMARY KEY,
            nome NVARCHAR(100) NOT NULL,
            ativo BIT DEFAULT 1,
            criado_em DATETIME2 DEFAULT GETDATE(),
            atualizado_em DATETIME2 DEFAULT GETDATE()
        );
        PRINT 'Tabela servicos criada com sucesso.';
    END
END
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'servicos')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('servicos') AND name = 'ativo')
    BEGIN
        ALTER TABLE servicos ADD ativo BIT DEFAULT 1;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('servicos') AND name = 'criado_em')
    BEGIN
        ALTER TABLE servicos ADD criado_em DATETIME2 DEFAULT GETDATE();
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('servicos') AND name = 'atualizado_em')
    BEGIN
        ALTER TABLE servicos ADD atualizado_em DATETIME2 DEFAULT GETDATE();
    END
END
GO

-- 12. ORDENS DE SERVICO (ordens_servico)
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
    CREATE INDEX idx_ordens_ativo ON ordens_servico(ativo);
    PRINT 'Tabela ordens_servico criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ordens_servico') AND name = 'ativo')
    BEGIN
        ALTER TABLE ordens_servico ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 13. ITENS / PRODUTOS DA OS (produtos_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'produtos_ordem')
BEGIN
    CREATE TABLE produtos_ordem (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        produto_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES produtos(id),
        quantidade INT NOT NULL DEFAULT 1,
        preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ativo BIT DEFAULT 1,
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela produtos_ordem criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('produtos_ordem') AND name = 'ativo')
    BEGIN
        ALTER TABLE produtos_ordem ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 14. ITENS / SERVICOS DA OS (servicos_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'servicos_ordem')
BEGIN
    CREATE TABLE servicos_ordem (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        servico_id INT NOT NULL FOREIGN KEY REFERENCES servicos(id),
        valor DECIMAL(10,2) NOT NULL,
        quantidade INT DEFAULT 1,
        ativo BIT DEFAULT 1,
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_servicos_ordem_ordem ON servicos_ordem(ordem_id);
    CREATE INDEX idx_servicos_ordem_servico ON servicos_ordem(servico_id);
    PRINT 'Tabela servicos_ordem criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('servicos_ordem') AND name = 'ativo')
    BEGIN
        ALTER TABLE servicos_ordem ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 15. HISTORICO DE ANDAMENTO DA OS (historico_ordens)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'historico_ordens')
BEGIN
    CREATE TABLE historico_ordens (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        usuario_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES usuarios(id),
        descricao NVARCHAR(MAX) NOT NULL,
        ativo BIT DEFAULT 1,
        criado_em DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX idx_historico_ordem ON historico_ordens(ordem_id);
    PRINT 'Tabela historico_ordens criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('historico_ordens') AND name = 'ativo')
    BEGIN
        ALTER TABLE historico_ordens ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 16. PAGAMENTO E RESUMO FINANCEIRO (pagamentos_ordem)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pagamentos_ordem')
BEGIN
    CREATE TABLE pagamentos_ordem (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) UNIQUE NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        valor_servico DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_produtos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tempo_execucao NVARCHAR(50) NULL,
        servico_id INT NULL FOREIGN KEY REFERENCES servicos(id),
        ativo BIT DEFAULT 1,
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela pagamentos_ordem criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pagamentos_ordem') AND name = 'ativo')
    BEGIN
        ALTER TABLE pagamentos_ordem ADD ativo BIT DEFAULT 1;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pagamentos_ordem') AND name = 'servico_id')
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pagamentos_ordem') AND name = 'tipo_servico_id')
        BEGIN
            EXEC sp_rename 'pagamentos_ordem.tipo_servico_id', 'servico_id', 'COLUMN';
        END
        ELSE
        BEGIN
            ALTER TABLE pagamentos_ordem ADD servico_id INT NULL FOREIGN KEY REFERENCES servicos(id);
        END
    END
END
GO

-- 17. MOVIMENTACAO DE STATUS (movimentacoes_status)
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
    PRINT 'Tabela movimentacoes_status criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('movimentacoes_status') AND name = 'ativo')
    BEGIN
        ALTER TABLE movimentacoes_status ADD ativo BIT DEFAULT 1;
    END
END
GO

-- 18. COMUNICACAO COM O CLIENTE (comunicacoes_cliente)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comunicacoes_cliente')
BEGIN
    CREATE TABLE comunicacoes_cliente (
        id VARCHAR(36) PRIMARY KEY DEFAULT LOWER(NEWID()),
        ordem_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES ordens_servico(id) ON DELETE CASCADE,
        cliente_id VARCHAR(36) NOT NULL FOREIGN KEY REFERENCES clientes(id),
        mensagem NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(50) DEFAULT 'PENDENTE',
        ativo BIT DEFAULT 1,
        enviado_em DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Tabela comunicacoes_cliente criada com sucesso.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('comunicacoes_cliente') AND name = 'ativo')
    BEGIN
        ALTER TABLE comunicacoes_cliente ADD ativo BIT DEFAULT 1;
    END
END
GO

-- =========================================================================
-- CARGA DE DADOS INICIAIS (SEEDS)
-- =========================================================================

-- Status da Ordem de Servico (Kanban)
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 1) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (1, 'Aberto', 'Ordem de servico cadastrada e aguardando triagem', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 2) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (2, 'Em Diagnostico', 'Tecnico analisando o equipamento', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 3) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (3, 'Aguardando Aprovacao', 'Orcamento enviado ao cliente', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 4) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (4, 'Aguardando Peca', 'Peca solicitada ao fornecedor', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 5) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (5, 'Em Execucao / Manutencao', 'Reparo em andamento', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 6) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (6, 'Concluido', 'Reparo e testes finalizados', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 7) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (7, 'Entregue ao Cliente', 'Aparelho retirado pelo cliente', 1);
IF NOT EXISTS (SELECT 1 FROM status_ordem WHERE id = 8) INSERT INTO status_ordem (id, nome, descricao, ativo) VALUES (8, 'Cancelado', 'Orcamento recusado ou OS cancelada', 1);

-- Categorias de Equipamentos Padrao
SET IDENTITY_INSERT categorias_equipamento ON;
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 1) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (1, 'Notebook', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 2) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (2, 'Computador / Desktop', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 3) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (3, 'Smartphone / Celular', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 4) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (4, 'Tablet', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 5) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (5, 'Impressora', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 6) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (6, 'Televisor / Monitor', 1);
IF NOT EXISTS (SELECT 1 FROM categorias_equipamento WHERE id = 7) INSERT INTO categorias_equipamento (id, nome, ativo) VALUES (7, 'Outros Eletroeletronicos', 1);
SET IDENTITY_INSERT categorias_equipamento OFF;

-- Servicos
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 1) INSERT INTO servicos (id, nome, ativo) VALUES (1, 'Manutencao Preventiva / Limpeza', 1);
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 2) INSERT INTO servicos (id, nome, ativo) VALUES (2, 'Manutencao Corretiva', 1);
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 3) INSERT INTO servicos (id, nome, ativo) VALUES (3, 'Troca de Componente / Peca', 1);
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 4) INSERT INTO servicos (id, nome, ativo) VALUES (4, 'Formatacao e Instalacao de SO', 1);
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 5) INSERT INTO servicos (id, nome, ativo) VALUES (5, 'Remocao de Virus e Otimizacao', 1);
IF NOT EXISTS (SELECT 1 FROM servicos WHERE id = 6) INSERT INTO servicos (id, nome, ativo) VALUES (6, 'Reparo em Placa / Eletronica', 1);

-- Marcas Padrao
IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Dell') INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Dell', 1);
IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Samsung') INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Samsung', 1);
IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Apple') INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Apple', 1);
IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'Lenovo') INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'Lenovo', 1);
IF NOT EXISTS (SELECT 1 FROM marcas WHERE nome = 'HP') INSERT INTO marcas (id, nome, ativo) VALUES (LOWER(NEWID()), 'HP', 1);

-- Modelos Padrao
IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Dell')
BEGIN
    DECLARE @marcaDell VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Dell');
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Inspiron 15 3000')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Inspiron 15 3000', @marcaDell, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Vostro 3520')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Vostro 3520', @marcaDell, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'OptiPlex 3080 Desktop')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'OptiPlex 3080 Desktop', @marcaDell, 1);
END

IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Samsung')
BEGIN
    DECLARE @marcaSamsung VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Samsung');
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Galaxy Book 3')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Galaxy Book 3', @marcaSamsung, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Galaxy S23 5G')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Galaxy S23 5G', @marcaSamsung, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'Galaxy Tab S9')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'Galaxy Tab S9', @marcaSamsung, 1);
END

IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Apple')
BEGIN
    DECLARE @marcaApple VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Apple');
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'MacBook Air M2')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'MacBook Air M2', @marcaApple, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'iPhone 14')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'iPhone 14', @marcaApple, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'iPad 10ª Geração')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'iPad 10ª Geração', @marcaApple, 1);
END

IF EXISTS (SELECT 1 FROM marcas WHERE nome = 'Lenovo')
BEGIN
    DECLARE @marcaLenovo VARCHAR(36) = (SELECT TOP 1 id FROM marcas WHERE nome = 'Lenovo');
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'IdeaPad 3 15ALC6')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'IdeaPad 3 15ALC6', @marcaLenovo, 1);
    IF NOT EXISTS (SELECT 1 FROM modelos WHERE nome = 'ThinkPad E14')
        INSERT INTO modelos (id, nome, marca_id, ativo) VALUES (LOWER(NEWID()), 'ThinkPad E14', @marcaLenovo, 1);
END

-- Produtos e Peças Padrao para Testes
IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'SSD 480GB Kingston A400 SATA')
    INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
    VALUES (LOWER(NEWID()), 'SSD 480GB Kingston A400 SATA', 'Armazenamento de alta velocidade para upgrade de notebooks e desktops', 219.90, 18, 1);

IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Memória RAM 8GB DDR4 3200MHz')
    INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
    VALUES (LOWER(NEWID()), 'Memória RAM 8GB DDR4 3200MHz', 'Módulo de memória RAM para computadores e notebooks modernos', 149.00, 24, 1);

IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Pasta Térmica Implastec Silver 5g')
    INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
    VALUES (LOWER(NEWID()), 'Pasta Térmica Implastec Silver 5g', 'Composto térmico com prata para alta dissipação de calor em CPUs', 35.00, 30, 1);

IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Fonte ATX 500W 80 Plus Bronze')
    INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
    VALUES (LOWER(NEWID()), 'Fonte ATX 500W 80 Plus Bronze', 'Fonte bivolt com PFC ativo para computadores de escritório e gamers', 289.00, 4, 1);

IF NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Cabo HDMI 2.0 Blindado 2 Metros')
    INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
    VALUES (LOWER(NEWID()), 'Cabo HDMI 2.0 Blindado 2 Metros', 'Cabo de alta definição 4K Ultra HD com conectores banhados a ouro', 29.90, 45, 1);

-- Usuarios Padrao para Teste
-- Senhas Bcrypt (fator 12):
-- admin123 -> $2a$12$e8w6Q3U48uBgl6rD46m/7.qYfV/YjLdNu0m8C98W0dCq6U6p1mC5G
-- 123456   -> $2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a

-- Criação / Obtenção de Endereço Padrão (Normalizado) para os Usuários Padrão
DECLARE @enderecoPadraoId VARCHAR(36);
SELECT TOP 1 @enderecoPadraoId = id FROM enderecos WHERE cidade = 'Viradouro';

IF @enderecoPadraoId IS NULL
BEGIN
    SET @enderecoPadraoId = LOWER(NEWID());
    INSERT INTO enderecos (id, logradouro, numero, bairro, cidade, uf, cep)
    VALUES (@enderecoPadraoId, 'Rua Principal', '100', 'Centro', 'Viradouro', 'SP', '14740-000');
END

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@mediator.com')
BEGIN
    INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status, ativo, telefone, endereco_id)
    VALUES (LOWER(NEWID()), 'Administrador Rocha Magazine', 'admin@mediator.com', '$2a$12$e8w6Q3U48uBgl6rD46m/7.qYfV/YjLdNu0m8C98W0dCq6U6p1mC5G', 'ADMIN', 'ATIVO', 1, '(17) 99999-0001', @enderecoPadraoId);
END

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'ana@mediator.com')
BEGIN
    INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status, ativo, telefone, endereco_id)
    VALUES (LOWER(NEWID()), 'Ana Costa (Atendente)', 'ana@mediator.com', '$2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a', 'ATENDENTE', 'ATIVO', 1, '(17) 99999-0002', @enderecoPadraoId);
END

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'carlos@mediator.com')
BEGIN
    INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status, ativo, telefone, endereco_id)
    VALUES (LOWER(NEWID()), 'Carlos Souza (Tecnico)', 'carlos@mediator.com', '$2a$12$P5qLhA2c7t35fM2B26Z9j.56s3TfQ8R2F2b3.Y6B5xK8v7Q2s0b5a', 'TECNICO', 'ATIVO', 1, '(17) 99999-0003', @enderecoPadraoId);
END
GO

