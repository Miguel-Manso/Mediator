const { getPool, sql } = require('../config/db');
const ProductModel = require('../models/Product.model');

const productController = {
  // Listagem de produtos/peças com filtro por busca, status, ordenação e paginação
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const incluirInativos = req.query.incluirInativos === 'true' || req.query.inativos === 'true';
      const apenasAtivos = !incluirInativos && req.query.apenasAtivos !== 'false';
      const orderBy = req.query.orderBy || req.query.ordenarPor || 'nome';
      const orderDirection = req.query.orderDirection || req.query.ordem || 'ASC';
      const pagina = req.query.pagina ? Number(req.query.pagina) : null;
      const limite = req.query.limite ? Number(req.query.limite) : null;

      const resultado = await ProductModel.listar({
        busca,
        apenasAtivos,
        orderBy,
        orderDirection,
        pagina,
        limite,
      });
      return res.status(200).json(resultado);
    } catch (erro) {
      console.error('Erro ao listar produtos:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar produtos.' });
    }
  },

  // Buscar por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const produto = await ProductModel.buscarPorId(id);

      if (!produto) {
        return res.status(404).json({ error: 'Produto não localizado no sistema.' });
      }

      return res.status(200).json(produto);
    } catch (erro) {
      console.error('Erro ao obter produto:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao obter produto.' });
    }
  },

  // Cadastro de produto
  async criar(req, res) {
    try {
      const { nome, descricao, preco, estoque } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
      }

      const precoNumerico = Number(preco);
      if (isNaN(precoNumerico) || precoNumerico <= 0) {
        return res.status(400).json({ error: 'O preço deve ser um valor numérico maior que zero (R$ > 0).' });
      }

      const estoqueNumerico = Number(estoque);
      if (isNaN(estoqueNumerico) || estoqueNumerico < 0) {
        return res.status(400).json({ error: 'A quantidade em estoque deve ser um número inteiro maior ou igual a zero.' });
      }

      const produto = await ProductModel.criar({
        nome: String(nome).trim(),
        descricao: descricao ? String(descricao).trim() : null,
        preco: precoNumerico,
        estoque: Math.floor(estoqueNumerico),
      });

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_PRODUTO')
          .input('entidade', sql.NVarChar, 'produtos')
          .input('entidade_id', sql.NVarChar, produto.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: produto.nome, preco: produto.preco, estoque: produto.estoque })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de produto:', erroLog.message);
      }

      return res.status(201).json(produto);
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

      const produtoExistente = await ProductModel.buscarPorId(id);
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não localizado para atualização.' });
      }

      const dadosAtualizacao = {};

      if (nome !== undefined) {
        const nomeTrim = String(nome).trim();
        if (!nomeTrim) {
          return res.status(400).json({ error: 'O nome do produto não pode ser vazio.' });
        }
        dadosAtualizacao.nome = nomeTrim;
      }

      if (descricao !== undefined) {
        dadosAtualizacao.descricao = descricao ? String(descricao).trim() : null;
      }

      if (preco !== undefined) {
        const precoNum = Number(preco);
        if (isNaN(precoNum) || precoNum <= 0) {
          return res.status(400).json({ error: 'O preço deve ser maior que zero (R$ > 0).' });
        }
        dadosAtualizacao.preco = precoNum;
      }

      if (estoque !== undefined) {
        const estoqueNum = Number(estoque);
        if (isNaN(estoqueNum) || estoqueNum < 0) {
          return res.status(400).json({ error: 'O estoque deve ser maior ou igual a zero.' });
        }
        dadosAtualizacao.estoque = Math.floor(estoqueNum);
      }

      if (ativo !== undefined) {
        dadosAtualizacao.ativo = ativo ? 1 : 0;
      }

      const produtoAtualizado = await ProductModel.atualizar(id, dadosAtualizacao);

      // Auditoria
      try {
        const pool = await getPool();
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

      const produtoExistente = await ProductModel.buscarPorId(id);
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não localizado para inativação.' });
      }

      const produtoInativado = await ProductModel.inativar(id);

      // Auditoria
      try {
        const pool = await getPool();
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

      const produtoExistente = await ProductModel.buscarPorId(id);
      if (!produtoExistente) {
        return res.status(404).json({ error: 'Produto não localizado.' });
      }

      const novoStatus = ativo !== undefined ? (ativo ? 1 : 0) : produtoExistente.ativo ? 0 : 1;
      const produtoAtualizado = novoStatus === 1
        ? await ProductModel.ativar(id)
        : await ProductModel.inativar(id);

      // Auditoria
      try {
        const pool = await getPool();
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
