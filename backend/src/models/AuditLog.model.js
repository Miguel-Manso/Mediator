const { getPool, sql } = require('../config/db');

class AuditLogModel {
  /**
   * Listar logs de auditoria com filtros dinâmicos e paginação (RF11)
   */
  static async listar({
    dataInicio = null,
    dataFim = null,
    data = null,
    usuarioId = null,
    usuario = null,
    acao = null,
    metodo = null,
    busca = '',
    pagina = 1,
    limite = 20,
  } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let whereClause = 'WHERE 1=1';

    // Filtro por Data Inicial
    if (dataInicio && String(dataInicio).trim() !== '') {
      req.input('dataInicio', sql.NVarChar, String(dataInicio).trim().slice(0, 10));
      whereClause += ' AND CAST(al.criado_em AS DATE) >= CAST(@dataInicio AS DATE)';
    }

    // Filtro por Data Final
    if (dataFim && String(dataFim).trim() !== '') {
      req.input('dataFim', sql.NVarChar, String(dataFim).trim().slice(0, 10));
      whereClause += ' AND CAST(al.criado_em AS DATE) <= CAST(@dataFim AS DATE)';
    }

    // Filtro por Data Pontual
    if (data && String(data).trim() !== '') {
      req.input('dataPontual', sql.NVarChar, String(data).trim().slice(0, 10));
      whereClause += ' AND CAST(al.criado_em AS DATE) = CAST(@dataPontual AS DATE)';
    }

    // Filtro por Usuário (ID ou Termo de Nome/E-mail)
    const filtroUsuario = usuarioId || usuario;
    if (filtroUsuario && String(filtroUsuario).trim() !== '') {
      const val = String(filtroUsuario).trim();
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      if (isGuid) {
        req.input('usuarioId', sql.VarChar, val);
        whereClause += ' AND al.usuario_id = @usuarioId';
      } else {
        req.input('usuarioTermo', sql.NVarChar, `%${val}%`);
        whereClause += ' AND (al.usuario_nome LIKE @usuarioTermo OR u.nome LIKE @usuarioTermo OR u.email LIKE @usuarioTermo)';
      }
    }

    // Filtro por Ação
    if (acao && String(acao).trim() !== '') {
      req.input('acaoTermo', sql.NVarChar, `%${String(acao).trim()}%`);
      whereClause += ' AND al.acao LIKE @acaoTermo';
    }

    // Filtro por Método HTTP
    if (metodo && String(metodo).trim() !== '') {
      req.input('metodo', sql.NVarChar, String(metodo).trim().toUpperCase());
      whereClause += ' AND al.metodo = @metodo';
    }

    // Busca textual genérica
    if (busca && String(busca).trim() !== '') {
      req.input('buscaGeral', sql.NVarChar, `%${String(busca).trim()}%`);
      whereClause += ` AND (
        al.usuario_nome LIKE @buscaGeral OR
        al.acao LIKE @buscaGeral OR
        al.rota LIKE @buscaGeral OR
        al.entidade_id LIKE @buscaGeral OR
        al.dados_alterados LIKE @buscaGeral
      )`;
    }

    // 1. Contagem total
    const countQuery = `
      SELECT COUNT(1) AS total
      FROM AuditLogs al
      LEFT JOIN usuarios u ON u.id = al.usuario_id
      ${whereClause}
    `;
    const countRes = await req.query(countQuery);
    const total = countRes.recordset[0]?.total || 0;

    // 2. Paginação
    const offset = Math.max(0, (Number(pagina) - 1) * Number(limite));
    req.input('offset', sql.Int, offset);
    req.input('limite', sql.Int, Number(limite));

    const dataQuery = `
      SELECT 
        al.id,
        al.usuario_id AS usuarioId,
        al.usuario_nome AS usuarioNome,
        u.email AS usuarioEmail,
        u.cargo AS usuarioCargo,
        al.acao,
        al.metodo,
        al.rota,
        al.entidade,
        al.entidade_id AS entidadeId,
        al.dados_alterados AS dadosAlterados,
        al.endereco_ip AS enderecoIp,
        al.criado_em AS criadoEm
      FROM AuditLogs al
      LEFT JOIN usuarios u ON u.id = al.usuario_id
      ${whereClause}
      ORDER BY al.criado_em DESC
      OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `;
    const dataRes = await req.query(dataQuery);

    // Formata o JSON stringificado de dadosAlterados para objeto legível se possível
    const logsFormatados = dataRes.recordset.map((item) => {
      let parsedDados = item.dadosAlterados;
      if (item.dadosAlterados && typeof item.dadosAlterados === 'string') {
        try {
          parsedDados = JSON.parse(item.dadosAlterados);
        } catch (e) {
          // mantém string original
        }
      }
      return {
        ...item,
        dadosAlteradosParsed: parsedDados,
      };
    });

    return {
      dados: logsFormatados,
      total,
      pagina: Number(pagina),
      limite: Number(limite),
      totalPaginas: Math.ceil(total / Number(limite)) || 1,
    };
  }

  /**
   * Buscar um log específico por ID
   */
  static async buscarPorId(id) {
    if (!id) return null;
    const pool = await getPool();
    const res = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        SELECT 
          al.id,
          al.usuario_id AS usuarioId,
          al.usuario_nome AS usuarioNome,
          u.email AS usuarioEmail,
          u.cargo AS usuarioCargo,
          al.acao,
          al.metodo,
          al.rota,
          al.entidade,
          al.entidade_id AS entidadeId,
          al.dados_alterados AS dadosAlterados,
          al.endereco_ip AS enderecoIp,
          al.criado_em AS criadoEm
        FROM AuditLogs al
        LEFT JOIN usuarios u ON u.id = al.usuario_id
        WHERE al.id = @id
      `);

    const log = res.recordset[0];
    if (!log) return null;

    if (log.dadosAlterados && typeof log.dadosAlterados === 'string') {
      try {
        log.dadosAlteradosParsed = JSON.parse(log.dadosAlterados);
      } catch (e) {
        log.dadosAlteradosParsed = log.dadosAlterados;
      }
    }

    return log;
  }
}

module.exports = AuditLogModel;
