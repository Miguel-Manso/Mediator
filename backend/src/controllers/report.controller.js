const ReportModel = require('../models/Report.model');

const reportController = {
  /**
   * Endpoint Master-Detail para geração de relatórios operacionais (RF12)
   */
  async obterRelatorioOperacional(req, res) {
    try {
      const {
        dataInicio,
        dataFim,
        clienteId,
        tecnicoId,
        statusId,
        tipoReparo,
        agrupamento = 'cliente',
        apenasAtivos,
      } = req.query;

      const relatorio = await ReportModel.obterRelatorioMasterDetail({
        dataInicio,
        dataFim,
        clienteId,
        tecnicoId,
        statusId,
        tipoReparo,
        agrupamento,
        apenasAtivos: apenasAtivos !== 'false',
      });

      return res.status(200).json(relatorio);
    } catch (erro) {
      console.error('Erro ao gerar relatório operacional:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao gerar relatório operacional.' });
    }
  },
};

module.exports = reportController;
