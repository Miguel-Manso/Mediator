const { getPool, sql } = require('../config/db');
const EquipmentModel = require('../models/Equipment.model');
const BrandModel = require('../models/Brand.model');
const ModelModel = require('../models/Model.model');
const CategoryModel = require('../models/Category.model');
const ClientModel = require('../models/Client.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const equipmentController = {
  // Listagem com busca, filtros e paginação controlada
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const clienteId = req.query.clienteId || req.query.cliente_id || null;
      const categoriaId = req.query.categoriaId || req.query.categoria_id || null;
      const marcaId = req.query.marcaId || req.query.marca_id || null;
      const apenasAtivos = req.query.apenasAtivos === 'true' || req.query.ativos === 'true';
      const { pagina, limite } = getPaginationParams(req.query, 10, 100);
      const paginado = req.query.todas !== 'true' && req.query.paginado !== 'false';

      const pool = await getPool();
      const reqCount = pool.request();
      const reqData = pool.request();

      let whereClause = ' WHERE 1=1';

      if (busca && String(busca).trim() !== '') {
        const termo = `%${String(busca).trim()}%`;
        reqCount.input('termoBusca', sql.NVarChar, termo);
        reqData.input('termoBusca', sql.NVarChar, termo);
        whereClause += `
          AND (
            e.descricao LIKE @termoBusca 
            OR e.numero_serie LIKE @termoBusca 
            OR c.nome LIKE @termoBusca 
            OR m.nome LIKE @termoBusca 
            OR mo.nome LIKE @termoBusca 
            OR cat.nome LIKE @termoBusca
          )
        `;
      }

      if (clienteId) {
        reqCount.input('clienteId', sql.VarChar, clienteId);
        reqData.input('clienteId', sql.VarChar, clienteId);
        whereClause += ' AND e.cliente_id = @clienteId';
      }

      if (categoriaId) {
        const catNum = Number(categoriaId);
        reqCount.input('categoriaId', sql.Int, catNum);
        reqData.input('categoriaId', sql.Int, catNum);
        whereClause += ' AND e.categoria_id = @categoriaId';
      }

      if (marcaId) {
        reqCount.input('marcaId', sql.VarChar, marcaId);
        reqData.input('marcaId', sql.VarChar, marcaId);
        whereClause += ' AND e.marca_id = @marcaId';
      }

      if (apenasAtivos) {
        whereClause += ' AND e.ativo = 1';
      }

      // 1. Contagem total
      const countQuery = `
        SELECT COUNT(e.id) AS total
        FROM equipamentos e
        LEFT JOIN marcas m ON e.marca_id = m.id
        LEFT JOIN modelos mo ON e.modelo_id = mo.id
        LEFT JOIN clientes c ON e.cliente_id = c.id
        LEFT JOIN categorias_equipamento cat ON e.categoria_id = cat.id
        ${whereClause}
      `;
      const countResult = await reqCount.query(countQuery);
      const total = countResult.recordset[0]?.total || 0;

      // 2. Query de dados paginados
      let dataQuery = `
        SELECT 
          e.id, 
          e.descricao, 
          e.numero_serie AS numeroSerie, 
          e.marca_id AS marcaId, 
          e.modelo_id AS modeloId, 
          e.cliente_id AS clienteId, 
          e.categoria_id AS categoriaId, 
          e.ativo, 
          e.criado_em AS criadoEm, 
          e.atualizado_em AS atualizadoEm,
          m.nome AS marcaNome,
          mo.nome AS modeloNome,
          c.nome AS clienteNome,
          c.telefone AS clienteTelefone,
          c.cpf AS clienteCpf,
          cat.nome AS categoriaNome
        FROM equipamentos e
        LEFT JOIN marcas m ON e.marca_id = m.id
        LEFT JOIN modelos mo ON e.modelo_id = mo.id
        LEFT JOIN clientes c ON e.cliente_id = c.id
        LEFT JOIN categorias_equipamento cat ON e.categoria_id = cat.id
        ${whereClause}
        ORDER BY e.criado_em DESC
      `;

      if (paginado !== false) {
        const offset = (pagina - 1) * limite;
        reqData.input('offset', sql.Int, offset);
        reqData.input('limite', sql.Int, limite);
        dataQuery += ' OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY';
      }

      const result = await reqData.query(dataQuery);
      const equipamentos = result.recordset.map((row) => new EquipmentModel(row));
      const paginacao = buildPaginationMeta(total, pagina, limite);

      return res.status(200).json({
        dados: equipamentos,
        equipamentos,
        paginacao,
      });
    } catch (erro) {
      console.error('Erro ao listar equipamentos:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar equipamentos.' });
    }
  },

  // Dados auxiliares para popular selects nos formulários do front
  async obterAuxiliares(_req, res) {
    try {
      const pool = await getPool();

      const [resClientes, resCategorias, resMarcas, resModelos] = await Promise.all([
        pool.query("SELECT id, nome, cpf, telefone FROM clientes WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome FROM categorias_equipamento WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome FROM marcas WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome, marca_id AS marcaId FROM modelos WHERE ativo = 1 ORDER BY nome ASC"),
      ]);

      return res.status(200).json({
        clientes: resClientes.recordset.map((r) => new ClientModel(r)),
        categorias: resCategorias.recordset.map((r) => new CategoryModel(r)),
        marcas: resMarcas.recordset.map((r) => new BrandModel(r)),
        modelos: resModelos.recordset.map((r) => new ModelModel(r)),
      });
    } catch (erro) {
      console.error('Erro ao obter dados auxiliares:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao carregar dados auxiliares de equipamentos.' });
    }
  },

  // Buscar equipamento por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID do equipamento não informado.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          SELECT 
            e.id, 
            e.descricao, 
            e.numero_serie AS numeroSerie, 
            e.marca_id AS marcaId, 
            e.modelo_id AS modeloId, 
            e.cliente_id AS clienteId, 
            e.categoria_id AS categoriaId, 
            e.ativo, 
            e.criado_em AS criadoEm, 
            e.atualizado_em AS atualizadoEm,
            m.nome AS marcaNome,
            mo.nome AS modeloNome,
            c.nome AS clienteNome,
            c.telefone AS clienteTelefone,
            c.cpf AS clienteCpf,
            cat.nome AS categoriaNome
          FROM equipamentos e
          LEFT JOIN marcas m ON e.marca_id = m.id
          LEFT JOIN modelos mo ON e.modelo_id = mo.id
          LEFT JOIN clientes c ON e.cliente_id = c.id
          LEFT JOIN categorias_equipamento cat ON e.categoria_id = cat.id
          WHERE e.id = @id
        `);

      const row = result.recordset[0];
      if (!row) {
        return res.status(404).json({ error: 'Equipamento não localizado no sistema.' });
      }

      return res.status(200).json(new EquipmentModel(row));
    } catch (erro) {
      console.error('Erro ao buscar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao buscar equipamento.' });
    }
  },

  // Cadastro de novo equipamento
  async criar(req, res) {
    try {
      const dadosModelo = new EquipmentModel(req.body);
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!dadosModelo.descricao) {
        return res.status(400).json({ error: 'A descrição do equipamento é obrigatória.' });
      }

      if (!dadosModelo.clienteId) {
        return res.status(400).json({ error: 'O cliente proprietário do equipamento é obrigatório.' });
      }

      if (!dadosModelo.categoriaId) {
        return res.status(400).json({ error: 'A categoria do equipamento é obrigatória.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('descricao', sql.NVarChar, dadosModelo.descricao)
        .input('numero_serie', sql.NVarChar, dadosModelo.numeroSerie)
        .input('marca_id', sql.VarChar, dadosModelo.marcaId)
        .input('modelo_id', sql.VarChar, dadosModelo.modeloId)
        .input('cliente_id', sql.VarChar, dadosModelo.clienteId)
        .input('categoria_id', sql.Int, dadosModelo.categoriaId)
        .query(`
          INSERT INTO equipamentos (id, descricao, numero_serie, marca_id, modelo_id, cliente_id, categoria_id, ativo)
          OUTPUT 
            inserted.id, inserted.descricao, inserted.numero_serie AS numeroSerie, 
            inserted.marca_id AS marcaId, inserted.modelo_id AS modeloId, 
            inserted.cliente_id AS clienteId, inserted.categoria_id AS categoriaId, 
            inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @descricao, @numero_serie, @marca_id, @modelo_id, @cliente_id, @categoria_id, 1)
        `);

      const equipamentoCriado = new EquipmentModel(result.recordset[0]);

      // Auditoria obrigatória
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, equipamentoCriado.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamentoCriado.descricao,
              clienteId: equipamentoCriado.clienteId,
              categoriaId: equipamentoCriado.categoriaId,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de equipamento:', erroLog.message);
      }

      return res.status(201).json(equipamentoCriado);
    } catch (erro) {
      console.error('Erro ao criar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar equipamento.' });
    }
  },

  // Atualização de equipamento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        descricao,
        numeroSerie,
        numero_serie,
        marcaId,
        marca_id,
        modeloId,
        modelo_id,
        clienteId,
        cliente_id,
        categoriaId,
        categoria_id,
        ativo,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do equipamento não informado.' });
      }

      const pool = await getPool();
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, descricao, ativo FROM equipamentos WHERE id = @id');

      if (checkExistente.recordset.length === 0) {
        return res.status(404).json({ error: 'Equipamento não localizado para atualização.' });
      }

      const reqUpdate = pool.request().input('id', sql.VarChar, id);
      let query = 'UPDATE equipamentos SET atualizado_em = GETDATE()';

      if (descricao !== undefined) {
        const descTrim = String(descricao).trim();
        if (!descTrim) {
          return res.status(400).json({ error: 'A descrição não pode ser vazia.' });
        }
        query += ', descricao = @descricao';
        reqUpdate.input('descricao', sql.NVarChar, descTrim);
      }

      if (numeroSerie !== undefined || numero_serie !== undefined) {
        const serie = numeroSerie !== undefined ? numeroSerie : numero_serie;
        query += ', numero_serie = @numero_serie';
        reqUpdate.input('numero_serie', sql.NVarChar, serie ? String(serie).trim() : null);
      }

      if (marcaId !== undefined || marca_id !== undefined) {
        const marca = marcaId !== undefined ? marcaId : marca_id;
        query += ', marca_id = @marca_id';
        reqUpdate.input('marca_id', sql.VarChar, marca || null);
      }

      if (modeloId !== undefined || modelo_id !== undefined) {
        const modelo = modeloId !== undefined ? modeloId : modelo_id;
        query += ', modelo_id = @modelo_id';
        reqUpdate.input('modelo_id', sql.VarChar, modelo || null);
      }

      if (clienteId !== undefined || cliente_id !== undefined) {
        const clienteFinal = clienteId !== undefined ? clienteId : cliente_id;
        if (!clienteFinal) {
          return res.status(400).json({ error: 'O cliente proprietário não pode ser nulo.' });
        }
        query += ', cliente_id = @cliente_id';
        reqUpdate.input('cliente_id', sql.VarChar, clienteFinal);
      }

      if (categoriaId !== undefined || categoria_id !== undefined) {
        const catFinal = categoriaId !== undefined ? categoriaId : categoria_id;
        if (!catFinal) {
          return res.status(400).json({ error: 'A categoria do equipamento não pode ser nula.' });
        }
        query += ', categoria_id = @categoria_id';
        reqUpdate.input('categoria_id', sql.Int, Number(catFinal));
      }

      if (ativo !== undefined) {
        query += ', ativo = @ativo';
        reqUpdate.input('ativo', sql.Bit, ativo ? 1 : 0);
      }

      query += `
        OUTPUT 
          inserted.id, inserted.descricao, inserted.numero_serie AS numeroSerie, 
          inserted.marca_id AS marcaId, inserted.modelo_id AS modeloId, 
          inserted.cliente_id AS clienteId, inserted.categoria_id AS categoriaId, 
          inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `;

      const result = await reqUpdate.query(query);
      const equipamentoAtualizado = new EquipmentModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamentoAtualizado.descricao,
              ativo: equipamentoAtualizado.ativo,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de equipamento:', erroLog.message);
      }

      return res.status(200).json(equipamentoAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar equipamento.' });
    }
  },

  // Inativação lógica / Soft Delete
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do equipamento não informado.' });
      }

      const pool = await getPool();
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, descricao, ativo FROM equipamentos WHERE id = @id');

      const equipamentoExistente = checkExistente.recordset[0];
      if (!equipamentoExistente) {
        return res.status(404).json({ error: 'Equipamento não localizado para inativação.' });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE equipamentos 
          SET ativo = 0, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.descricao, inserted.ativo, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const equipamentoInativado = new EquipmentModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamentoExistente.descricao,
              ativoAnterior: equipamentoExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de equipamento:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Equipamento inativado com sucesso.',
        equipamento: equipamentoInativado,
      });
    } catch (erro) {
      console.error('Erro ao inativar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar equipamento.' });
    }
  },

  // Alternar status (ativar/inativar)
  async alternarStatus(req, res) {
    try {
      const { id } = req.params;
      const { ativo } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const pool = await getPool();
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, descricao, ativo FROM equipamentos WHERE id = @id');

      const equipamentoExistente = checkExistente.recordset[0];
      if (!equipamentoExistente) {
        return res.status(404).json({ error: 'Equipamento não localizado.' });
      }

      const novoStatus = ativo !== undefined ? (ativo ? 1 : 0) : equipamentoExistente.ativo ? 0 : 1;

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('ativo', sql.Bit, novoStatus)
        .query(`
          UPDATE equipamentos 
          SET ativo = @ativo, atualizado_em = GETDATE()
          OUTPUT 
            inserted.id, inserted.descricao, inserted.numero_serie AS numeroSerie, 
            inserted.marca_id AS marcaId, inserted.modelo_id AS modeloId, 
            inserted.cliente_id AS clienteId, inserted.categoria_id AS categoriaId, 
            inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const equipamentoAtualizado = new EquipmentModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, novoStatus === 1 ? 'ATIVAR_EQUIPAMENTO' : 'INATIVAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ novoStatus }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de alteração de status de equipamento:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: `Equipamento ${novoStatus === 1 ? 'ativado' : 'inativado'} com sucesso.`,
        equipamento: equipamentoAtualizado,
      });
    } catch (erro) {
      console.error('Erro ao alternar status do equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao alternar status do equipamento.' });
    }
  },

  // Cadastro rápido de marca diretamente pelo modal de equipamentos
  async criarMarca(req, res) {
    try {
      const dadosMarca = new BrandModel(req.body);
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!dadosMarca.nome) {
        return res.status(400).json({ error: 'O nome da marca é obrigatório.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('nome', sql.NVarChar, dadosMarca.nome)
        .query(`
          INSERT INTO marcas (id, nome, ativo)
          OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @nome, 1)
        `);

      const novaMarca = new BrandModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_MARCA')
          .input('entidade', sql.NVarChar, 'marcas')
          .input('entidade_id', sql.NVarChar, novaMarca.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novaMarca.nome }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de marca:', erroLog.message);
      }

      return res.status(201).json(novaMarca);
    } catch (erro) {
      console.error('Erro ao criar marca:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar marca.' });
    }
  },

  // Cadastro rápido de modelo diretamente pelo modal de equipamentos
  async criarModelo(req, res) {
    try {
      const dadosModelo = new ModelModel(req.body);
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!dadosModelo.nome) {
        return res.status(400).json({ error: 'O nome do modelo é obrigatório.' });
      }

      if (!dadosModelo.marcaId) {
        return res.status(400).json({ error: 'A marca associada ao modelo é obrigatória.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('nome', sql.NVarChar, dadosModelo.nome)
        .input('marca_id', sql.VarChar, dadosModelo.marcaId)
        .query(`
          INSERT INTO modelos (id, nome, marca_id, ativo)
          OUTPUT inserted.id, inserted.nome, inserted.marca_id AS marcaId, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @nome, @marca_id, 1)
        `);

      const novoModelo = new ModelModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_MODELO')
          .input('entidade', sql.NVarChar, 'modelos')
          .input('entidade_id', sql.NVarChar, novoModelo.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novoModelo.nome, marcaId: dadosModelo.marcaId }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de modelo:', erroLog.message);
      }

      return res.status(201).json(novoModelo);
    } catch (erro) {
      console.error('Erro ao criar modelo:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar modelo.' });
    }
  },

  // Cadastro rápido de categoria de equipamento diretamente pelo modal
  async criarCategoria(req, res) {
    try {
      const dadosCategoria = new CategoryModel(req.body);
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!dadosCategoria.nome) {
        return res.status(400).json({ error: 'O nome da categoria de equipamento é obrigatório.' });
      }

      if (dadosCategoria.nome.length > 100) {
        return res.status(400).json({ error: 'O nome da categoria deve conter no máximo 100 caracteres.' });
      }

      const pool = await getPool();

      // Checar duplicidade de nome
      const checkResult = await pool
        .request()
        .input('nome', sql.NVarChar, dadosCategoria.nome.toLowerCase())
        .query('SELECT id FROM categorias_equipamento WHERE LOWER(nome) = @nome');

      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ error: 'Já existe uma categoria de equipamento com este nome.' });
      }

      const result = await pool
        .request()
        .input('nome', sql.NVarChar, dadosCategoria.nome)
        .query(`
          INSERT INTO categorias_equipamento (nome, ativo)
          OUTPUT inserted.id, inserted.nome, inserted.ativo
          VALUES (@nome, 1)
        `);

      const novaCategoria = new CategoryModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_CATEGORIA_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'categorias_equipamento')
          .input('entidade_id', sql.NVarChar, String(novaCategoria.id))
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novaCategoria.nome }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de categoria de equipamento:', erroLog.message);
      }

      return res.status(201).json(novaCategoria);
    } catch (erro) {
      console.error('Erro ao criar categoria de equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar categoria.' });
    }
  },

  // Atualizar categoria de equipamento
  async atualizarCategoria(req, res) {
    try {
      const { id } = req.params;
      const { nome } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria não informado.' });
      }

      const nomeTrim = nome ? String(nome).trim() : '';
      if (!nomeTrim) {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
      }

      if (nomeTrim.length > 100) {
        return res.status(400).json({ error: 'O nome da categoria deve conter no máximo 100 caracteres.' });
      }

      const pool = await getPool();

      // Checar se a categoria existe
      const checkExistente = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .query('SELECT id, nome, ativo FROM categorias_equipamento WHERE id = @id');

      const categoriaExistente = checkExistente.recordset[0];
      if (!categoriaExistente) {
        return res.status(404).json({ error: 'Categoria de equipamento não encontrada.' });
      }

      // Validar duplicidade case-insensitive com outra categoria ativa
      const checkDup = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .input('nome', sql.NVarChar, nomeTrim.toLowerCase())
        .query('SELECT id FROM categorias_equipamento WHERE LOWER(nome) = @nome AND id != @id AND ativo = 1');

      if (checkDup.recordset.length > 0) {
        return res.status(400).json({ error: 'Já existe outra categoria de equipamento ativa com este nome.' });
      }

      const result = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .input('nome', sql.NVarChar, nomeTrim)
        .query(`
          UPDATE categorias_equipamento
          SET nome = @nome
          OUTPUT inserted.id, inserted.nome, inserted.ativo
          WHERE id = @id
        `);

      const categoriaAtualizada = new CategoryModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_CATEGORIA_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'categorias_equipamento')
          .input('entidade_id', sql.NVarChar, String(id))
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nomeAnterior: categoriaExistente.nome,
              nomeNovo: categoriaAtualizada.nome,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de categoria:', erroLog.message);
      }

      return res.status(200).json(categoriaAtualizada);
    } catch (erro) {
      console.error('Erro ao atualizar categoria de equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar categoria.' });
    }
  },

  // Soft delete / Inativação de categoria
  async excluirCategoria(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria não informado.' });
      }

      const pool = await getPool();

      // Checar se a categoria existe
      const checkExistente = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .query('SELECT id, nome, ativo FROM categorias_equipamento WHERE id = @id');

      const categoriaExistente = checkExistente.recordset[0];
      if (!categoriaExistente) {
        return res.status(404).json({ error: 'Categoria de equipamento não encontrada.' });
      }

      // Validação de integridade referencial: verificar equipamentos ativos vinculados
      const checkUso = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .query('SELECT COUNT(1) AS total FROM equipamentos WHERE categoria_id = @id AND ativo = 1');

      const totalEquipamentos = checkUso.recordset[0]?.total || 0;
      if (totalEquipamentos > 0) {
        return res.status(400).json({
          error: `Não é possível inativar a categoria "${categoriaExistente.nome}" pois existem ${totalEquipamentos} equipamento(s) ativo(s) vinculado(s) a ela.`,
        });
      }

      const result = await pool
        .request()
        .input('id', sql.Int, Number(id))
        .query(`
          UPDATE categorias_equipamento
          SET ativo = 0
          OUTPUT inserted.id, inserted.nome, inserted.ativo
          WHERE id = @id
        `);

      const categoriaInativada = new CategoryModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_CATEGORIA_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'categorias_equipamento')
          .input('entidade_id', sql.NVarChar, String(id))
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: categoriaExistente.nome,
              ativoAnterior: categoriaExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de categoria:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Categoria inativada com sucesso.',
        categoria: categoriaInativada,
      });
    } catch (erro) {
      console.error('Erro ao inativar categoria de equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar categoria.' });
    }
  },

  // Atualizar marca
  async atualizarMarca(req, res) {
    try {
      const { id } = req.params;
      const { nome } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID da marca não informado.' });
      }

      const nomeTrim = nome ? String(nome).trim() : '';
      if (!nomeTrim) {
        return res.status(400).json({ error: 'O nome da marca é obrigatório.' });
      }

      if (nomeTrim.length > 100) {
        return res.status(400).json({ error: 'O nome da marca deve conter no máximo 100 caracteres.' });
      }

      const pool = await getPool();

      // Checar existência
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, ativo FROM marcas WHERE id = @id');

      const marcaExistente = checkExistente.recordset[0];
      if (!marcaExistente) {
        return res.status(404).json({ error: 'Marca não encontrada.' });
      }

      // Checar duplicidade case-insensitive com outra marca ativa
      const checkDup = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('nome', sql.NVarChar, nomeTrim.toLowerCase())
        .query('SELECT id FROM marcas WHERE LOWER(nome) = @nome AND id != @id AND ativo = 1');

      if (checkDup.recordset.length > 0) {
        return res.status(400).json({ error: 'Já existe outra marca ativa com este nome.' });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('nome', sql.NVarChar, nomeTrim)
        .query(`
          UPDATE marcas
          SET nome = @nome, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const marcaAtualizada = new BrandModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_MARCA')
          .input('entidade', sql.NVarChar, 'marcas')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nomeAnterior: marcaExistente.nome,
              nomeNovo: marcaAtualizada.nome,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de marca:', erroLog.message);
      }

      return res.status(200).json(marcaAtualizada);
    } catch (erro) {
      console.error('Erro ao atualizar marca:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar marca.' });
    }
  },

  // Soft delete / Inativação de marca (com cascata lógica nos modelos e verificação de uso)
  async excluirMarca(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID da marca não informado.' });
      }

      const pool = await getPool();

      // Checar existência
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, ativo FROM marcas WHERE id = @id');

      const marcaExistente = checkExistente.recordset[0];
      if (!marcaExistente) {
        return res.status(404).json({ error: 'Marca não encontrada.' });
      }

      // Validação de equipamentos ativos usando esta marca
      const checkUso = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT COUNT(1) AS total FROM equipamentos WHERE marca_id = @id AND ativo = 1');

      const totalEquipamentos = checkUso.recordset[0]?.total || 0;
      if (totalEquipamentos > 0) {
        return res.status(400).json({
          error: `Não é possível inativar a marca "${marcaExistente.nome}" pois existem ${totalEquipamentos} equipamento(s) ativo(s) vinculado(s) a ela.`,
        });
      }

      // Inativação da marca
      const resultMarca = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE marcas
          SET ativo = 0, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      // Inativação em cascata lógica dos modelos vinculados a esta marca
      await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE modelos
          SET ativo = 0, atualizado_em = GETDATE()
          WHERE marca_id = @id
        `);

      const marcaInativada = new BrandModel(resultMarca.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_MARCA')
          .input('entidade', sql.NVarChar, 'marcas')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: marcaExistente.nome,
              cascataModelos: true,
              ativoAnterior: marcaExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de marca:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Marca e seus modelos vinculados foram inativados com sucesso.',
        marca: marcaInativada,
      });
    } catch (erro) {
      console.error('Erro ao inativar marca:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar marca.' });
    }
  },

  // Atualizar modelo
  async atualizarModelo(req, res) {
    try {
      const { id } = req.params;
      const { nome, marcaId, marca_id } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do modelo não informado.' });
      }

      const nomeTrim = nome ? String(nome).trim() : '';
      if (!nomeTrim) {
        return res.status(400).json({ error: 'O nome do modelo é obrigatório.' });
      }

      if (nomeTrim.length > 100) {
        return res.status(400).json({ error: 'O nome do modelo deve conter no máximo 100 caracteres.' });
      }

      const pool = await getPool();

      // Checar se o modelo existe
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, marca_id AS marcaId, ativo FROM modelos WHERE id = @id');

      const modeloExistente = checkExistente.recordset[0];
      if (!modeloExistente) {
        return res.status(404).json({ error: 'Modelo não encontrado.' });
      }

      const marcaFinal = marcaId !== undefined ? marcaId : marca_id !== undefined ? marca_id : modeloExistente.marcaId;

      if (marcaFinal) {
        const checkMarca = await pool
          .request()
          .input('marcaId', sql.VarChar, marcaFinal)
          .query('SELECT id FROM marcas WHERE id = @marcaId AND ativo = 1');

        if (checkMarca.recordset.length === 0) {
          return res.status(400).json({ error: 'A marca informada para o modelo não existe ou está inativa.' });
        }
      }

      // Checar duplicidade do modelo na mesma marca
      const checkDup = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('nome', sql.NVarChar, nomeTrim.toLowerCase())
        .input('marcaId', sql.VarChar, marcaFinal)
        .query(`
          SELECT id FROM modelos 
          WHERE LOWER(nome) = @nome 
            AND marca_id = @marcaId 
            AND id != @id 
            AND ativo = 1
        `);

      if (checkDup.recordset.length > 0) {
        return res.status(400).json({ error: 'Já existe outro modelo ativo com este nome para a marca selecionada.' });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('nome', sql.NVarChar, nomeTrim)
        .input('marca_id', sql.VarChar, marcaFinal)
        .query(`
          UPDATE modelos
          SET nome = @nome, marca_id = @marca_id, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.marca_id AS marcaId, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const modeloAtualizado = new ModelModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_MODELO')
          .input('entidade', sql.NVarChar, 'modelos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nomeAnterior: modeloExistente.nome,
              nomeNovo: modeloAtualizado.nome,
              marcaId: marcaFinal,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de modelo:', erroLog.message);
      }

      return res.status(200).json(modeloAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar modelo:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar modelo.' });
    }
  },

  // Soft delete / Inativação de modelo
  async excluirModelo(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do modelo não informado.' });
      }

      const pool = await getPool();

      // Checar se o modelo existe
      const checkExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, ativo FROM modelos WHERE id = @id');

      const modeloExistente = checkExistente.recordset[0];
      if (!modeloExistente) {
        return res.status(404).json({ error: 'Modelo não encontrado.' });
      }

      // Validação de equipamentos ativos usando este modelo
      const checkUso = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT COUNT(1) AS total FROM equipamentos WHERE modelo_id = @id AND ativo = 1');

      const totalEquipamentos = checkUso.recordset[0]?.total || 0;
      if (totalEquipamentos > 0) {
        return res.status(400).json({
          error: `Não é possível inativar o modelo "${modeloExistente.nome}" pois existem ${totalEquipamentos} equipamento(s) ativo(s) vinculado(s) a ele.`,
        });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE modelos
          SET ativo = 0, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.marca_id AS marcaId, inserted.ativo, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const modeloInativado = new ModelModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_MODELO')
          .input('entidade', sql.NVarChar, 'modelos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: modeloExistente.nome,
              ativoAnterior: modeloExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de modelo:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Modelo inativado com sucesso.',
        modelo: modeloInativado,
      });
    } catch (erro) {
      console.error('Erro ao inativar modelo:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar modelo.' });
    }
  },
};

module.exports = equipmentController;
