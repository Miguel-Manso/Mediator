const { getPool, sql } = require('../config/db');
const ProductModel = require('../models/Product.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const productController = {
  // Listagem de produtos/peças com filtro por busca, status e paginação controlada
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
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
        whereClause += ' AND (nome LIKE @termoBusca OR descricao LIKE @termoBusca)';
      }

      if (apenasAtivos) {
        whereClause += ' AND ativo = 1';
      }

      // 1. Contagem total respeitando filtros
      const countQuery = `
        SELECT COUNT(id) AS total
        FROM produtos
        ${whereClause}
      `;
      const countResult = await reqCount.query(countQuery);
      const total = countResult.recordset[0]?.total || 0;

      // 2. Consulta de dados paginados
      let dataQuery = `
        SELECT 
          id, 
          nome, 
          descricao, 
          preco, 
          estoque, 
          ativo, 
          criado_em AS criadoEm, 
          atualizado_em AS atualizadoEm
        FROM produtos
        ${whereClause}
        ORDER BY nome ASC
      `;

      if (paginado !== false) {
        const offset = (pagina - 1) * limite;
        reqData.input('offset', sql.Int, offset);
        reqData.input('limite', sql.Int, limite);
        dataQuery += ' OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY';
      }

      const result = await reqData.query(dataQuery);
      const produtos = result.recordset.map((row) => new ProductModel(row));
      const paginacao = buildPaginationMeta(total, pagina, limite);

      return res.status(200).json({
        dados: produtos,
        produtos,
        paginacao,
      });
    } catch (erro) {
      console.error('Erro ao listar produtos:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar produtos.' });
    }
  },

  // Buscar produto por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID do produto não informado.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          SELECT 
            id, 
            nome, 
            descricao, 
            preco, 
            estoque, 
            ativo, 
            criado_em AS criadoEm, 
            atualizado_em AS atualizadoEm
          FROM produtos
          WHERE id = @id
        `);

      const row = result.recordset[0];
      if (!row) {
        return res.status(404).json({ error: 'Produto não localizado no sistema.' });
      }

      return res.status(200).json(new ProductModel(row));
    } catch (erro) {
      console.error('Erro ao obter produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao obter produto.' });
    }
  },

  // Cadastro de produto
  async criar(req, res) {
    try {
      const dadosModelo = new ProductModel(req.body);
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!dadosModelo.nome) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
      }

      if (dadosModelo.preco < 0.10) {
        return res.status(400).json({ error: 'O preço do produto deve ser de no mínimo R$ 0,10.' });
      }

      if (dadosModelo.estoque < 0) {
        return res.status(400).json({ error: 'A quantidade em estoque deve ser um número inteiro maior ou igual a zero.' });
      }

      const pool = await getPool();
      const result = await pool
        .request()
        .input('nome', sql.NVarChar, dadosModelo.nome)
        .input('descricao', sql.NVarChar, dadosModelo.descricao)
        .input('preco', sql.Decimal(10, 2), dadosModelo.preco)
        .input('estoque', sql.Int, dadosModelo.estoque)
        .query(`
          INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
          OUTPUT 
            inserted.id, inserted.nome, inserted.descricao, 
            inserted.preco, inserted.estoque, inserted.ativo, 
            inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @nome, @descricao, @preco, @estoque, 1)
        `);

      const produtoCriado = new ProductModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_PRODUTO')
          .input('entidade', sql.NVarChar, 'produtos')
          .input('entidade_id', sql.NVarChar, produtoCriado.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: produtoCriado.nome, preco: produtoCriado.preco, estoque: produtoCriado.estoque })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de produto:', erroLog.message);
      }

      return res.status(201).json(produtoCriado);
    } catch (erro) {
      console.error('Erro ao criar produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar produto.' });
    }
  },

  // Atualização de produto
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, preco, estoque, ativo } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do produto não informado.' });
      }

      const pool = await getPool();

      // Checa existência
      const checagem = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, preco, estoque, ativo FROM produtos WHERE id = @id');

      if (checagem.recordset.length === 0) {
        return res.status(404).json({ error: 'Produto não localizado para atualização.' });
      }

      const reqUpdate = pool.request().input('id', sql.VarChar, id);
      let query = 'UPDATE produtos SET atualizado_em = GETDATE()';

      if (nome !== undefined) {
        const nomeTrim = String(nome).trim();
        if (!nomeTrim) {
          return res.status(400).json({ error: 'O nome do produto não pode ser vazio.' });
        }
        query += ', nome = @nome';
        reqUpdate.input('nome', sql.NVarChar, nomeTrim);
      }

      if (descricao !== undefined) {
        query += ', descricao = @descricao';
        reqUpdate.input('descricao', sql.NVarChar, descricao ? String(descricao).trim() : null);
      }

      if (preco !== undefined) {
        const precoNum = Number(preco);
        if (isNaN(precoNum) || precoNum < 0.10) {
          return res.status(400).json({ error: 'O preço do produto deve ser de no mínimo R$ 0,10.' });
        }
        query += ', preco = @preco';
        reqUpdate.input('preco', sql.Decimal(10, 2), precoNum);
      }

      if (estoque !== undefined) {
        const estoqueNum = Number(estoque);
        if (isNaN(estoqueNum) || estoqueNum < 0) {
          return res.status(400).json({ error: 'O estoque deve ser maior ou igual a zero.' });
        }
        query += ', estoque = @estoque';
        reqUpdate.input('estoque', sql.Int, Math.floor(estoqueNum));
      }

      if (ativo !== undefined) {
        query += ', ativo = @ativo';
        reqUpdate.input('ativo', sql.Bit, ativo ? 1 : 0);
      }

      query += `
        OUTPUT 
          inserted.id, inserted.nome, inserted.descricao, 
          inserted.preco, inserted.estoque, inserted.ativo, 
          inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `;

      const result = await reqUpdate.query(query);
      const produtoAtualizado = new ProductModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_PRODUTO')
          .input('entidade', sql.NVarChar, 'produtos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: produtoAtualizado.nome,
              preco: produtoAtualizado.preco,
              estoque: produtoAtualizado.estoque,
              ativo: produtoAtualizado.ativo,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de produto:', erroLog.message);
      }

      return res.status(200).json(produtoAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar produto.' });
    }
  },

  // Inativação lógica / Soft Delete
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do produto não informado.' });
      }

      const pool = await getPool();
      const checagem = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, ativo FROM produtos WHERE id = @id');

      const produtoExistente = checagem.recordset[0];
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não localizado para inativação.' });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE produtos 
          SET ativo = 0, atualizado_em = GETDATE()
          OUTPUT 
            inserted.id, inserted.nome, inserted.descricao, 
            inserted.preco, inserted.estoque, inserted.ativo, 
            inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const produtoInativado = new ProductModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_PRODUTO')
          .input('entidade', sql.NVarChar, 'produtos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: produtoExistente.nome,
              ativoAnterior: produtoExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de produto:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Produto inativado com sucesso.',
        produto: produtoInativado,
      });
    } catch (erro) {
      console.error('Erro ao inativar produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar produto.' });
    }
  },

  // Alternar status
  async alternarStatus(req, res) {
    try {
      const { id } = req.params;
      const { ativo } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const pool = await getPool();
      const checagem = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, ativo FROM produtos WHERE id = @id');

      const produtoExistente = checagem.recordset[0];
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não localizado.' });
      }

      const novoStatus = ativo !== undefined ? (ativo ? 1 : 0) : produtoExistente.ativo ? 0 : 1;

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .input('ativo', sql.Bit, novoStatus)
        .query(`
          UPDATE produtos 
          SET ativo = @ativo, atualizado_em = GETDATE()
          OUTPUT 
            inserted.id, inserted.nome, inserted.descricao, 
            inserted.preco, inserted.estoque, inserted.ativo, 
            inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const produtoAtualizado = new ProductModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, novoStatus === 1 ? 'ATIVAR_PRODUTO' : 'INATIVAR_PRODUTO')
          .input('entidade', sql.NVarChar, 'produtos')
          .input('entidade_id', sql.NVarChar, id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ novoStatus }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de alteração de status de produto:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: `Produto ${novoStatus === 1 ? 'ativado' : 'inativado'} com sucesso.`,
        produto: produtoAtualizado,
      });
    } catch (erro) {
      console.error('Erro ao alternar status do produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao alternar status do produto.' });
    }
  },
};

module.exports = productController;
