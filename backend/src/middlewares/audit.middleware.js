const { getPool, sql } = require('../config/db');

/**
 * Middleware de Auditoria (RF11)
 * Intercepta requisições de mutação (POST, PUT, DELETE, PATCH) nas rotas de OS
 * e grava um log detalhado na tabela AuditLogs.
 */
function auditMiddleware(req, res, next) {
  const metodo = req.method.toUpperCase();
  const metodosAuditaveis = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!metodosAuditaveis.includes(metodo)) {
    return next();
  }

  // Captura o corpo da requisição antes de ser consumido
  const corpoRequisicao = req.body ? { ...req.body } : {};
  if (corpoRequisicao.senha) delete corpoRequisicao.senha;
  if (corpoRequisicao.senha_hash) delete corpoRequisicao.senha_hash;
  if (corpoRequisicao.password) delete corpoRequisicao.password;

  // Aguarda a resposta ser concluída com sucesso para registrar o log
  res.on('finish', async () => {
    // Registra apenas operações que obtiveram sucesso (2xx ou 3xx)
    if (res.statusCode >= 400) {
      return;
    }

    try {
      const pool = await getPool();
      const usuario = req.usuario || req.user || {};
      const usuarioId = usuario.id || null;
      const usuarioNome = usuario.nome || usuario.name || 'Sistema / Não Identificado';

      const rota = req.originalUrl || req.baseUrl + req.path;
      const entidadeId = req.params?.id || req.body?.id || req.body?.ordemId || null;

      // Define uma ação descritiva baseada no método e caminho
      let acao = `${metodo}_ORDEM_SERVICO`;
      const caminho = (req.path || '').toLowerCase();

      if (metodo === 'POST' && (caminho === '/' || caminho === '')) {
        acao = 'CRIACAO_OS';
      } else if (caminho.includes('/status')) {
        acao = 'ATUALIZACAO_STATUS';
      } else if (caminho.includes('/laudo') || caminho.includes('/observacoes-tecnicas')) {
        acao = 'REGISTRO_LAUDO_TECNICO';
      } else if (caminho.includes('/produtos') || caminho.includes('/itens')) {
        acao = metodo === 'DELETE' ? 'REMOCAO_ITEM_PECA' : 'ADICAO_ITEM_PECA';
      } else if (caminho.includes('/baixar-estoque')) {
        acao = 'BAIXA_ESTOQUE_PECA';
      } else if (caminho.includes('/tecnico') || caminho.includes('/assumir')) {
        acao = 'ATRIBUICAO_TECNICO';
      } else if (caminho.includes('/alternar-ativo')) {
        acao = 'ALTERNAR_ATIVO_OS';
      } else if (metodo === 'PUT' || metodo === 'PATCH') {
        acao = 'ATUALIZACAO_DADOS_OS';
      } else if (metodo === 'DELETE') {
        acao = 'EXCLUSAO_OS';
      }

      const dadosAlterados = JSON.stringify({
        params: req.params || {},
        query: req.query || {},
        body: corpoRequisicao,
        statusCode: res.statusCode,
      });

      const enderecoIp =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        null;

      await pool
        .request()
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('usuario_nome', sql.NVarChar, usuarioNome)
        .input('acao', sql.NVarChar, acao)
        .input('metodo', sql.NVarChar, metodo)
        .input('rota', sql.NVarChar, rota)
        .input('entidade', sql.NVarChar, 'ORDEM_SERVICO')
        .input('entidade_id', sql.VarChar, entidadeId ? String(entidadeId) : null)
        .input('dados_alterados', sql.NVarChar, dadosAlterados)
        .input('endereco_ip', sql.NVarChar, enderecoIp ? String(enderecoIp).slice(0, 50) : null)
        .query(`
          INSERT INTO AuditLogs (
            id, usuario_id, usuario_nome, acao, metodo, rota, entidade, entidade_id, dados_alterados, endereco_ip, criado_em
          ) VALUES (
            LOWER(NEWID()), @usuario_id, @usuario_nome, @acao, @metodo, @rota, @entidade, @entidade_id, @dados_alterados, @endereco_ip, GETDATE()
          )
        `);
    } catch (erroLog) {
      console.error('Falha assíncrona ao registrar log de auditoria:', erroLog.message);
    }
  });

  return next();
}

module.exports = auditMiddleware;
