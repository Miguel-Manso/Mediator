const { getPool, sql } = require('../config/db');
const OrderStatusModel = require('../models/OrderStatus.model');

const orderStatusController = {
  // Listagem de status com filtros e ordenação
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const incluirInativos = req.query.incluirInativos === 'true' || req.query.inativos === 'true';
      const apenasAtivos = !incluirInativos && req.query.apenasAtivos !== 'false';

      const statusList = await OrderStatusModel.listar({ busca, apenasAtivos });
      return res.status(200).json(statusList);
    } catch (erro) {
      console.error('Erro ao listar status de ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar status da ordem de serviço.' });
    }
  },

  // Detalhar status por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const statusItem = await OrderStatusModel.buscarPorId(id);

      if (!statusItem) {
        return res.status(404).json({ error: 'Status de ordem de serviço não encontrado.' });
      }

      return res.status(200).json(statusItem);
    } catch (erro) {
      console.error('Erro ao obter status da ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao obter status da ordem.' });
    }
  },

  // Criar novo status
  async criar(req, res) {
    try {
      const { id, nome, descricao, cor, ordem } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do status é obrigatório.' });
      }

      const duplicado = await OrderStatusModel.buscarPorNome(nome);
      if (duplicado) {
        return res.status(409).json({ error: `Já existe um status cadastrado com o nome "${nome}".` });
      }

      const statusCriado = await OrderStatusModel.criar({
        id: id ? Number(id) : undefined,
        nome: String(nome).trim(),
        descricao: descricao ? String(descricao).trim() : null,
        cor: cor ? String(cor).trim() : '#3B82F6',
        ordem: ordem !== undefined ? Number(ordem) : 0,
      });

      // Auditoria em logs_sistema
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_STATUS_ORDEM')
          .input('entidade', sql.NVarChar, 'status_ordem')
          .input('entidade_id', sql.NVarChar, String(statusCriado.id))
          .input('detalhes', sql.NVarChar, JSON.stringify(statusCriado))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (logErr) {
        console.warn('Falha ao auditar criação de status:', logErr.message);
      }

      return res.status(201).json(statusCriado);
    } catch (erro) {
      console.error('Erro ao criar status da ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao criar status de ordem de serviço.' });
    }
  },

  // Atualizar status existente
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, cor, ordem, ativo } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const existente = await OrderStatusModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Status não localizado no sistema.' });
      }

      if (nome && String(nome).trim()) {
        const duplicado = await OrderStatusModel.buscarPorNome(nome, id);
        if (duplicado) {
          return res.status(409).json({ error: `Já existe outro status com o nome "${nome}".` });
        }
      }

      const statusAtualizado = await OrderStatusModel.atualizar(id, {
        nome,
        descricao,
        cor,
        ordem,
        ativo,
      });

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_STATUS_ORDEM')
          .input('entidade', sql.NVarChar, 'status_ordem')
          .input('entidade_id', sql.NVarChar, String(id))
          .input('detalhes', sql.NVarChar, JSON.stringify({ antes: existente, depois: statusAtualizado }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (logErr) {
        console.warn('Falha ao auditar atualização de status:', logErr.message);
      }

      return res.status(200).json(statusAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar status da ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar status de ordem de serviço.' });
    }
  },

  // Alternar ativo/inativo (Soft Delete)
  async alternarStatus(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const existente = await OrderStatusModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Status de ordem não encontrado.' });
      }

      const alterado = await OrderStatusModel.alternarStatus(id);

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ALTERNAR_STATUS_ORDEM')
          .input('entidade', sql.NVarChar, 'status_ordem')
          .input('entidade_id', sql.NVarChar, String(id))
          .input('detalhes', sql.NVarChar, JSON.stringify({ antes: existente.ativo, agora: alterado.ativo }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (logErr) {
        console.warn('Falha ao auditar alternância de status:', logErr.message);
      }

      return res.status(200).json({
        message: `Status "${alterado.nome}" ${alterado.ativo ? 'ativado' : 'inativado'} com sucesso.`,
        status: alterado,
      });
    } catch (erro) {
      console.error('Erro ao alternar status da ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao alternar status da ordem.' });
    }
  },

  // Exclusão lógica (Soft Delete)
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const existente = await OrderStatusModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Status não localizado.' });
      }

      const desativado = await OrderStatusModel.excluir(id);

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'DESATIVAR_STATUS_ORDEM')
          .input('entidade', sql.NVarChar, 'status_ordem')
          .input('entidade_id', sql.NVarChar, String(id))
          .input('detalhes', sql.NVarChar, JSON.stringify({ status: desativado }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (logErr) {
        console.warn('Falha ao auditar desativação de status:', logErr.message);
      }

      return res.status(200).json({
        message: 'Status inativado com sucesso.',
        status: desativado,
      });
    } catch (erro) {
      console.error('Erro ao excluir status da ordem:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao desativar status de ordem.' });
    }
  },
};

module.exports = orderStatusController;
