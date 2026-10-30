const AuditLogModel = require('../models/AuditLog.model');

const auditController = {
  /**
   * Consulta restrita de logs de auditoria com filtros dinâmicos (RF11)
   */
  async listar(req, res) {
    try {
      const {
        dataInicio,
        dataFim,
        data,
        usuarioId,
        usuario,
        acao,
        metodo,
        busca,
        pagina = 1,
        limite = 20,
      } = req.query;

      const resultado = await AuditLogModel.listar({
        dataInicio,
        dataFim,
        data,
        usuarioId,
        usuario,
        acao,
        metodo,
        busca,
        pagina: Number(pagina) || 1,
        limite: Number(limite) || 20,
      });

      return res.status(200).json(resultado);
    } catch (erro) {
      console.error('Erro ao listar logs de auditoria:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao consultar logs de auditoria.' });
    }
  },

  /**
   * Obter detalhe de um log de auditoria por ID (RF11)
   */
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const log = await AuditLogModel.buscarPorId(id);

      if (!log) {
        return res.status(404).json({ error: 'Registro de auditoria não localizado.' });
      }

      return res.status(200).json(log);
    } catch (erro) {
      console.error('Erro ao obter log de auditoria:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao buscar detalhes do log.' });
    }
  },
};

module.exports = auditController;
