const { getPool, sql } = require('../config/db');

class OrderModel {
  // Gera número formatado OS-YYYYMM-XXXX
  static async gerarNumeroOrdem() {
    const pool = await getPool();
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const prefixo = `OS-${ano}${mes}-`;

    const res = await pool
      .request()
      .input('prefixo', sql.NVarChar, `${prefixo}%`)
      .query(`
        SELECT TOP 1 numero_ordem 
        FROM ordens_servico 
        WHERE numero_ordem LIKE @prefixo 
        ORDER BY numero_ordem DESC
      `);

    let proximoNumero = 1;
    if (res.recordset.length > 0) {
      const ultimoNumeroStr = res.recordset[0].numero_ordem;
      const partes = ultimoNumeroStr.split('-');
      if (partes.length === 3) {
        const sequencial = parseInt(partes[2], 10);
        if (!isNaN(sequencial)) {
          proximoNumero = sequencial + 1;
        }
      }
    }

    return `${prefixo}${String(proximoNumero).padStart(4, '0')}`;
  }

  // Listagem com paginação e múltiplos filtros dinâmicos (RF09)
  static async listar({
    clienteId = null,
    cliente = null,
    tecnicoId = null,
    tecnico = null,
    atendenteId = null,
    atendente = null,
    tipoServico = null,
    tipo_servico = null,
    tipoReparo = null,
    statusId = null,
    status = null,
    dataEntrada = null,
    data_entrada = null,
    dataAbertura = null,
    dataInicio = null,
    dataEntradaInicio = null,
    dataFim = null,
    dataEntradaFim = null,
    busca = '',
    pagina = 1,
    limite = 20,
    apenasAtivos = true,
  } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let whereClause = 'WHERE 1=1';

    if (apenasAtivos) {
      whereClause += ' AND os.ativo = 1';
    }

    // Filtro dinâmico por Cliente (RF09: aceita ID, Nome ou CPF)
    const filtroCliente = clienteId || cliente;
    if (filtroCliente && String(filtroCliente).trim() !== '') {
      const val = String(filtroCliente).trim();
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      if (isGuid) {
        req.input('clienteId', sql.VarChar, val);
        whereClause += ' AND os.cliente_id = @clienteId';
      } else {
        req.input('clienteTermo', sql.NVarChar, `%${val}%`);
        whereClause += ' AND (c.nome LIKE @clienteTermo OR c.cpf LIKE @clienteTermo)';
      }
    }

    // Filtro dinâmico por Técnico (RF09: aceita ID ou Nome)
    const filtroTecnico = tecnicoId || tecnico;
    if (filtroTecnico && String(filtroTecnico).trim() !== '') {
      const val = String(filtroTecnico).trim();
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      if (isGuid) {
        req.input('tecnicoId', sql.VarChar, val);
        whereClause += ' AND os.tecnico_id = @tecnicoId';
      } else {
        req.input('tecnicoTermo', sql.NVarChar, `%${val}%`);
        whereClause += ' AND ut.nome LIKE @tecnicoTermo';
      }
    }

    // Filtro dinâmico por Atendente (RF09: aceita ID ou Nome)
    const filtroAtendente = atendenteId || atendente;
    if (filtroAtendente && String(filtroAtendente).trim() !== '') {
      const val = String(filtroAtendente).trim();
      const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      if (isGuid) {
        req.input('atendenteId', sql.VarChar, val);
        whereClause += ' AND os.atendente_id = @atendenteId';
      } else {
        req.input('atendenteTermo', sql.NVarChar, `%${val}%`);
        whereClause += ' AND ua.nome LIKE @atendenteTermo';
      }
    }

    // Filtro dinâmico por Tipo de Serviço / Reparo (RF09)
    const filtroTipoServico = tipoServico || tipo_servico || tipoReparo;
    if (filtroTipoServico && String(filtroTipoServico).trim() !== '') {
      const val = String(filtroTipoServico).trim();
      req.input('tipoServicoTermo', sql.NVarChar, `%${val}%`);
      whereClause += ' AND os.tipo_reparo LIKE @tipoServicoTermo';
    }

    // Filtro dinâmico por Status (RF09: aceita ID numérico ou Nome)
    const filtroStatus = statusId || status;
    if (filtroStatus && String(filtroStatus).trim() !== '') {
      const val = String(filtroStatus).trim();
      if (!isNaN(Number(val))) {
        req.input('statusId', sql.Int, Number(val));
        whereClause += ' AND os.status_id = @statusId';
      } else {
        req.input('statusNomeTermo', sql.NVarChar, `%${val}%`);
        whereClause += ' AND st.nome LIKE @statusNomeTermo';
      }
    }

    // Filtro dinâmico por Data de Entrada (RF09: data pontual ou período)
    const filtroDataEntrada = dataEntrada || data_entrada || dataAbertura;
    if (filtroDataEntrada && String(filtroDataEntrada).trim() !== '') {
      const dataStr = String(filtroDataEntrada).trim().slice(0, 10);
      req.input('dataEntradaPontual', sql.NVarChar, dataStr);
      whereClause += ' AND CAST(os.aberto_em AS DATE) = CAST(@dataEntradaPontual AS DATE)';
    }

    const filtroInicio = dataInicio || dataEntradaInicio;
    if (filtroInicio && String(filtroInicio).trim() !== '') {
      const dataStr = String(filtroInicio).trim().slice(0, 10);
      req.input('dataEntradaInicio', sql.NVarChar, dataStr);
      whereClause += ' AND CAST(os.aberto_em AS DATE) >= CAST(@dataEntradaInicio AS DATE)';
    }

    const filtroFim = dataFim || dataEntradaFim;
    if (filtroFim && String(filtroFim).trim() !== '') {
      const dataStr = String(filtroFim).trim().slice(0, 10);
      req.input('dataEntradaFim', sql.NVarChar, dataStr);
      whereClause += ' AND CAST(os.aberto_em AS DATE) <= CAST(@dataEntradaFim AS DATE)';
    }

    if (busca && String(busca).trim() !== '') {
      req.input('termoBusca', sql.NVarChar, `%${String(busca).trim()}%`);
      whereClause += ` AND (
        os.numero_ordem LIKE @termoBusca OR 
        c.nome LIKE @termoBusca OR 
        c.cpf LIKE @termoBusca OR 
        e.descricao LIKE @termoBusca OR
        m.nome LIKE @termoBusca OR
        os.descricao_problema LIKE @termoBusca
      )`;
    }

    // Contagem total
    const countQuery = `
      SELECT COUNT(1) AS total
      FROM ordens_servico os
      JOIN status_ordem st ON st.id = os.status_id
      JOIN clientes c ON c.id = os.cliente_id
      JOIN equipamentos e ON e.id = os.equipamento_id
      LEFT JOIN marcas mc ON mc.id = e.marca_id
      LEFT JOIN modelos m ON m.id = e.modelo_id
      JOIN usuarios ua ON ua.id = os.atendente_id
      LEFT JOIN usuarios ut ON ut.id = os.tecnico_id
      ${whereClause}
    `;
    const countRes = await req.query(countQuery);
    const total = countRes.recordset[0]?.total || 0;

    // Paginação
    const offset = Math.max(0, (Number(pagina) - 1) * Number(limite));
    req.input('offset', sql.Int, offset);
    req.input('limite', sql.Int, Number(limite));

    const dataQuery = `
      SELECT 
        os.id,
        os.numero_ordem AS numeroOrdem,
        os.tipo_reparo AS tipoReparo,
        os.perguntas_triagem AS perguntasTriagem,
        os.descricao_problema AS descricaoProblema,
        os.laudo_tecnico AS laudoTecnico,
        os.observacoes_atendimento AS observacoesAtendimento,
        os.status_id AS statusId,
        st.nome AS statusNome,
        st.cor AS statusCor,
        st.ordem AS statusOrdem,
        os.cliente_id AS clienteId,
        c.nome AS clienteNome,
        c.cpf AS clienteCpf,
        c.telefone AS clienteTelefone,
        os.equipamento_id AS equipamentoId,
        e.descricao AS equipamentoDescricao,
        e.numero_serie AS equipamentoNumeroSerie,
        mc.nome AS marcaNome,
        m.nome AS modeloNome,
        cat.nome AS categoriaNome,
        os.atendente_id AS atendenteId,
        ua.nome AS atendenteNome,
        os.tecnico_id AS tecnicoId,
        ut.nome AS tecnicoNome,
        os.aberto_em AS abertoEm,
        os.fechado_em AS fechadoEm,
        os.criado_em AS criadoEm,
        os.atualizado_em AS atualizadoEm,
        os.ativo,
        ISNULL((
          SELECT SUM(po.quantidade * po.preco_unitario)
          FROM produtos_ordem po
          WHERE po.ordem_id = os.id AND po.ativo = 1
        ), 0.00) AS totalProdutos
      FROM ordens_servico os
      JOIN status_ordem st ON st.id = os.status_id
      JOIN clientes c ON c.id = os.cliente_id
      JOIN equipamentos e ON e.id = os.equipamento_id
      JOIN categorias_equipamento cat ON cat.id = e.categoria_id
      LEFT JOIN marcas mc ON mc.id = e.marca_id
      LEFT JOIN modelos m ON m.id = e.modelo_id
      JOIN usuarios ua ON ua.id = os.atendente_id
      LEFT JOIN usuarios ut ON ut.id = os.tecnico_id
      ${whereClause}
      ORDER BY os.aberto_em DESC
      OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `;

    const dataRes = await req.query(dataQuery);

    return {
      dados: dataRes.recordset,
      total,
      pagina: Number(pagina),
      limite: Number(limite),
      totalPaginas: Math.ceil(total / Number(limite)) || 1,
    };
  }

  // Detalhe Master-Detail completo da OS
  static async buscarPorId(id) {
    if (!id) return null;
    const pool = await getPool();

    // 1. Dados mestres da OS
    const osRes = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        SELECT 
          os.id,
          os.numero_ordem AS numeroOrdem,
          os.tipo_reparo AS tipoReparo,
          os.perguntas_triagem AS perguntasTriagem,
          os.descricao_problema AS descricaoProblema,
          os.laudo_tecnico AS laudoTecnico,
          os.observacoes_atendimento AS observacoesAtendimento,
          os.status_id AS statusId,
          st.nome AS statusNome,
          st.cor AS statusCor,
          st.ordem AS statusOrdem,
          os.cliente_id AS clienteId,
          c.nome AS clienteNome,
          c.cpf AS clienteCpf,
          c.email AS clienteEmail,
          c.telefone AS clienteTelefone,
          os.equipamento_id AS equipamentoId,
          e.descricao AS equipamentoDescricao,
          e.numero_serie AS equipamentoNumeroSerie,
          mc.nome AS marcaNome,
          m.nome AS modeloNome,
          cat.nome AS categoriaNome,
          os.atendente_id AS atendenteId,
          ua.nome AS atendenteNome,
          ua.email AS atendenteEmail,
          os.tecnico_id AS tecnicoId,
          ut.nome AS tecnicoNome,
          ut.email AS tecnicoEmail,
          os.aberto_em AS abertoEm,
          os.fechado_em AS fechadoEm,
          os.criado_em AS criadoEm,
          os.atualizado_em AS atualizadoEm,
          os.ativo
        FROM ordens_servico os
        JOIN status_ordem st ON st.id = os.status_id
        JOIN clientes c ON c.id = os.cliente_id
        JOIN equipamentos e ON e.id = os.equipamento_id
        JOIN categorias_equipamento cat ON cat.id = e.categoria_id
        LEFT JOIN marcas mc ON mc.id = e.marca_id
        LEFT JOIN modelos m ON m.id = e.modelo_id
        JOIN usuarios ua ON ua.id = os.atendente_id
        LEFT JOIN usuarios ut ON ut.id = os.tecnico_id
        WHERE os.id = @id
      `);

    const ordem = osRes.recordset[0];
    if (!ordem) return null;

    // Parse perguntas de triagem se stringificada
    if (ordem.perguntasTriagem && typeof ordem.perguntasTriagem === 'string') {
      try {
        ordem.perguntasTriagem = JSON.parse(ordem.perguntasTriagem);
      } catch (e) {
        // mantém como está caso não seja JSON
      }
    }

    // 2. Peças e insumos utilizados na OS
    const itensRes = await pool
      .request()
      .input('ordemId', sql.VarChar, id)
      .query(`
        SELECT 
          po.id,
          po.ordem_id AS ordemId,
          po.produto_id AS produtoId,
          p.nome AS produtoNome,
          p.descricao AS produtoDescricao,
          p.estoque AS estoqueAtual,
          po.quantidade,
          po.preco_unitario AS precoUnitario,
          (po.quantidade * po.preco_unitario) AS subtotal,
          ISNULL(po.baixado, po.baixado_estoque) AS baixado,
          po.baixado_estoque AS baixadoEstoque,
          po.baixado_em AS baixadoEm,
          po.baixado_por AS baixadoPor,
          ub.nome AS baixadoPorNome,
          u.nome AS usuarioNome,
          po.criado_em AS criadoEm
        FROM produtos_ordem po
        JOIN produtos p ON p.id = po.produto_id
        LEFT JOIN usuarios u ON u.id = po.usuario_id
        LEFT JOIN usuarios ub ON ub.id = po.baixado_por
        WHERE po.ordem_id = @ordemId AND po.ativo = 1
        ORDER BY po.criado_em DESC
      `);

    ordem.itens = itensRes.recordset;
    ordem.totalProdutos = itensRes.recordset.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

    // 3. Histórico de evolução técnica e etapas
    const histRes = await pool
      .request()
      .input('ordemId', sql.VarChar, id)
      .query(`
        SELECT 
          ho.id,
          ho.ordem_id AS ordemId,
          ho.usuario_id AS usuarioId,
          u.nome AS usuarioNome,
          u.cargo AS usuarioCargo,
          ho.status_id AS statusId,
          st.nome AS statusNome,
          st.cor AS statusCor,
          ho.etapa,
          ho.tipo_registro AS tipoRegistro,
          ho.descricao,
          ho.criado_em AS criadoEm
        FROM historico_ordens ho
        JOIN usuarios u ON u.id = ho.usuario_id
        LEFT JOIN status_ordem st ON st.id = ho.status_id
        WHERE ho.ordem_id = @ordemId AND ho.ativo = 1
        ORDER BY ho.criado_em DESC
      `);

    ordem.historico = histRes.recordset;

    return ordem;
  }

  // Abertura de Ordem de Serviço (RF06)
  static async criar({
    numeroOrdem,
    clienteId,
    equipamentoId,
    atendenteId,
    tecnicoId = null,
    statusId = 1,
    tipoReparo = 'OUTRO',
    perguntasTriagem = null,
    descricaoProblema,
    observacoesAtendimento = null,
    usuarioCargo = 'ATENDENTE',
  }) {
    const pool = await getPool();
    const id = (await pool.request().query('SELECT LOWER(NEWID()) AS id')).recordset[0].id;
    
    // Tratamento de triagem com preenchimento obrigatório 'N/E' para campos em branco
    let perguntasSanitizadas = perguntasTriagem;
    if (perguntasTriagem && typeof perguntasTriagem === 'object') {
      perguntasSanitizadas = {};
      for (const [k, v] of Object.entries(perguntasTriagem)) {
        perguntasSanitizadas[k] = (v === undefined || v === null || String(v).trim() === '') ? 'N/E' : String(v).trim();
      }
    }
    const perguntasJson = perguntasSanitizadas ? (typeof perguntasSanitizadas === 'string' ? perguntasSanitizadas : JSON.stringify(perguntasSanitizadas)) : null;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Inserir a OS
      await new sql.Request(transaction)
        .input('id', sql.VarChar, id)
        .input('numeroOrdem', sql.NVarChar, numeroOrdem)
        .input('tipoReparo', sql.NVarChar, tipoReparo)
        .input('perguntasTriagem', sql.NVarChar, perguntasJson)
        .input('descricaoProblema', sql.NVarChar, descricaoProblema)
        .input('observacoesAtendimento', sql.NVarChar, observacoesAtendimento)
        .input('statusId', sql.Int, Number(statusId) || 1)
        .input('clienteId', sql.VarChar, clienteId)
        .input('equipamentoId', sql.VarChar, equipamentoId)
        .input('atendenteId', sql.VarChar, atendenteId)
        .input('tecnicoId', sql.VarChar, tecnicoId || null)
        .query(`
          INSERT INTO ordens_servico (
            id, numero_ordem, tipo_reparo, perguntas_triagem,
            descricao_problema, observacoes_atendimento,
            status_id, cliente_id, equipamento_id, atendente_id, tecnico_id,
            ativo, aberto_em, criado_em, atualizado_em
          ) VALUES (
            @id, @numeroOrdem, @tipoReparo, @perguntasTriagem,
            @descricaoProblema, @observacoesAtendimento,
            @statusId, @clienteId, @equipamentoId, @atendenteId, @tecnicoId,
            1, GETDATE(), GETDATE(), GETDATE()
          )
        `);

      // Obter nome do atendente
      const userRes = await new sql.Request(transaction)
        .input('atendenteId', sql.VarChar, atendenteId)
        .query('SELECT nome FROM usuarios WHERE id = @atendenteId');
      const nomeAtendente = userRes.recordset[0]?.nome || 'Atendente';

      // 2. Primeiro registro no histórico técnico (tipo STATUS)
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, id)
        .input('usuarioId', sql.VarChar, atendenteId)
        .input('statusId', sql.Int, Number(statusId) || 1)
        .input('etapa', sql.NVarChar, 'Abertura da OS')
        .input('descricao', sql.NVarChar, `Abertura da ordem realizada por ${nomeAtendente}.`)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'STATUS', @statusId, @etapa, @descricao, 1, GETDATE())
        `);

      // 3. Movimentação inicial de status
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, id)
        .input('statusId', sql.Int, Number(statusId) || 1)
        .input('usuarioId', sql.VarChar, atendenteId)
        .query(`
          INSERT INTO movimentacoes_status (id, ordem_id, status_id, usuario_id, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @statusId, @usuarioId, 1, GETDATE())
        `);

      // 4. Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, atendenteId)
        .input('acao', sql.NVarChar, 'ABERTURA_ORDEM_SERVICO')
        .input('entidade', sql.NVarChar, 'ordens_servico')
        .input('entidade_id', sql.NVarChar, id)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: atendenteId,
          cargo: usuarioCargo,
          numeroOrdem,
          clienteId,
          equipamentoId,
          tipoReparo,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Atualizar dados gerais da OS com transação e auditoria atômica
  static async atualizar(id, dados, contextoAuditoria = {}) {
    if (!id) return null;
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const sets = ['atualizado_em = GETDATE()'];
      const updateReq = new sql.Request(transaction).input('id', sql.VarChar, id);

      if (dados.tecnicoId !== undefined) {
        sets.push('tecnico_id = @tecnicoId');
        updateReq.input('tecnicoId', sql.VarChar, dados.tecnicoId || null);
      }
      if (dados.descricaoProblema !== undefined) {
        sets.push('descricao_problema = @descricaoProblema');
        updateReq.input('descricaoProblema', sql.NVarChar, dados.descricaoProblema);
      }
      if (dados.laudoTecnico !== undefined) {
        sets.push('laudo_tecnico = @laudoTecnico');
        updateReq.input('laudoTecnico', sql.NVarChar, dados.laudoTecnico);
      }
      if (dados.observacoesAtendimento !== undefined) {
        sets.push('observacoes_atendimento = @observacoesAtendimento');
        updateReq.input('observacoesAtendimento', sql.NVarChar, dados.observacoesAtendimento);
      }
      if (dados.tipoReparo !== undefined) {
        sets.push('tipo_reparo = @tipoReparo');
        updateReq.input('tipoReparo', sql.NVarChar, dados.tipoReparo);
      }
      if (dados.perguntasTriagem !== undefined) {
        sets.push('perguntas_triagem = @perguntasTriagem');
        const val = typeof dados.perguntasTriagem === 'string' ? dados.perguntasTriagem : JSON.stringify(dados.perguntasTriagem);
        updateReq.input('perguntasTriagem', sql.NVarChar, val);
      }
      if (dados.ativo !== undefined) {
        sets.push('ativo = @ativo');
        updateReq.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
      }

      await updateReq.query(`
        UPDATE ordens_servico
        SET ${sets.join(', ')}
        WHERE id = @id
      `);

      // Auditoria em logs_sistema dentro da mesma transação
      if (contextoAuditoria?.usuarioId) {
        await new sql.Request(transaction)
          .input('usuario_id', sql.VarChar, contextoAuditoria.usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_ORDEM_SERVICO')
          .input('entidade', sql.NVarChar, 'ordens_servico')
          .input('entidade_id', sql.NVarChar, id)
          .input('detalhes', sql.NVarChar, JSON.stringify({
            usuario_id: contextoAuditoria.usuarioId,
            cargo: contextoAuditoria.usuarioCargo || '',
            tecnicoId: dados.tecnicoId,
            laudoTecnico: dados.laudoTecnico ? true : false,
          }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      }

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Verifica se há peças orçadas ativas que ainda não foram baixadas no estoque
  static async verificarPecasPendentesBaixa(ordemId) {
    const pool = await getPool();
    const res = await pool
      .request()
      .input('ordemId', sql.VarChar, ordemId)
      .query(`
        SELECT COUNT(*) AS pendentes
        FROM produtos_ordem po
        WHERE po.ordem_id = @ordemId 
          AND po.ativo = 1 
          AND (
            (po.baixado = 0 OR po.baixado IS NULL) 
            AND (po.baixado_estoque = 0 OR po.baixado_estoque IS NULL)
          )
      `);
    return Number(res.recordset[0]?.pendentes || 0) > 0;
  }

  // Atualização de Status da OS com registro de histórico, movimentação e auditoria ACID
  static async atualizarStatus(id, novoStatusId, usuarioId, observacao = '', ordemIndex = null, dadosAuditoria = {}) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const statusIdNum = Number(novoStatusId);

      // Trava de integridade de estoque: impede avanço para Testes Finais (7) ou Entregue (8) se houver peças orçadas pendentes de baixa
      if (statusIdNum === 7 || statusIdNum === 8) {
        const pendentesRes = await new sql.Request(transaction)
          .input('ordemId', sql.VarChar, id)
          .query(`
            SELECT COUNT(*) AS pendentes
            FROM produtos_ordem po
            WHERE po.ordem_id = @ordemId 
              AND po.ativo = 1 
              AND (
                (po.baixado = 0 OR po.baixado IS NULL) 
                AND (po.baixado_estoque = 0 OR po.baixado_estoque IS NULL)
              )
          `);
        const totalPendentes = Number(pendentesRes.recordset[0]?.pendentes || 0);
        if (totalPendentes > 0) {
          throw new Error(
            'Não é possível avançar a Ordem de Serviço para este status pois existem peças/produtos orçados pendentes de baixa no estoque. Realize a baixa dos materiais para prosseguir.'
          );
        }
      }

      // Status 8 (Entregue / Finalizado) ou 9 (Cancelado) encerram a OS
      const ehFechamento = statusIdNum === 8 || statusIdNum === 9;

      let updateQuery = `
        UPDATE ordens_servico
        SET status_id = @statusId,
            atualizado_em = GETDATE()
      `;

      if (ehFechamento) {
        updateQuery += ', fechado_em = ISNULL(fechado_em, GETDATE())';
      } else {
        updateQuery += ', fechado_em = NULL';
      }

      const updateReq = new sql.Request(transaction)
        .input('id', sql.VarChar, id)
        .input('statusId', sql.Int, statusIdNum);

      if (ordemIndex !== null && ordemIndex !== undefined) {
        updateQuery += ', ordem_kanban = @ordemIndex';
        updateReq.input('ordemIndex', sql.Int, Number(ordemIndex) || 0);
      }

      updateQuery += ' WHERE id = @id';

      await updateReq.query(updateQuery);

      // Nome do status novo para o histórico
      const statusRes = await new sql.Request(transaction)
        .input('statusId', sql.Int, statusIdNum)
        .query('SELECT nome FROM status_ordem WHERE id = @statusId');
      const nomeStatus = statusRes.recordset[0]?.nome || `Status ${statusIdNum}`;

      const textoHistorico = observacao && String(observacao).trim()
        ? `Status alterado para "${nomeStatus}". Motivo/Observação: ${String(observacao).trim()}`
        : `Status alterado para "${nomeStatus}".`;

      // Inserir no histórico (tipo STATUS)
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, id)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('statusId', sql.Int, statusIdNum)
        .input('etapa', sql.NVarChar, `Transição para ${nomeStatus}`)
        .input('descricao', sql.NVarChar, textoHistorico)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'STATUS', @statusId, @etapa, @descricao, 1, GETDATE())
        `);

      // Inserir na tabela de movimentações
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, id)
        .input('statusId', sql.Int, statusIdNum)
        .input('usuarioId', sql.VarChar, usuarioId)
        .query(`
          INSERT INTO movimentacoes_status (id, ordem_id, status_id, usuario_id, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @statusId, @usuarioId, 1, GETDATE())
        `);

      // Inserir auditoria detalhada em logs_sistema na mesma transação ACID
      const detalhesAuditoria = {
        usuario_id: usuarioId,
        cargo: dadosAuditoria.usuarioCargo || '',
        numeroOrdem: dadosAuditoria.numeroOrdem || '',
        statusAnterior: dadosAuditoria.statusAnterior || null,
        novoStatus: dadosAuditoria.novoStatus || { id: statusIdNum, nome: nomeStatus },
        ordemIndex: ordemIndex !== undefined && ordemIndex !== null ? Number(ordemIndex) : null,
        motivo: observacao || '',
        origem: dadosAuditoria.origem || 'KANBAN_DRAG_AND_DROP',
        timestamp: new Date().toISOString(),
      };

      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'MOVIMENTACAO_KANBAN_STATUS')
        .input('entidade', sql.NVarChar, 'ordens_servico')
        .input('entidade_id', sql.NVarChar, id)
        .input('detalhes', sql.NVarChar, JSON.stringify(detalhesAuditoria))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Inclusão de observação técnica / parecer da etapa pelo técnico
  static async adicionarObservacaoTecnica({ ordemId, usuarioId, etapa = 'Parecer Técnico', descricao, laudoTecnico = null, usuarioCargo = '' }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Obter status atual da OS
      const osRes = await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .query('SELECT status_id FROM ordens_servico WHERE id = @ordemId');

      const statusId = osRes.recordset[0]?.status_id || null;

      // 2. Se foi passado laudo técnico, atualizar na OS
      if (laudoTecnico !== null && laudoTecnico !== undefined) {
        await new sql.Request(transaction)
          .input('ordemId', sql.VarChar, ordemId)
          .input('laudoTecnico', sql.NVarChar, String(laudoTecnico).trim())
          .query('UPDATE ordens_servico SET laudo_tecnico = @laudoTecnico, atualizado_em = GETDATE() WHERE id = @ordemId');
      }

      // 3. Inserir no histórico técnico (tipo PARECER)
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('statusId', sql.Int, statusId)
        .input('etapa', sql.NVarChar, etapa)
        .input('descricao', sql.NVarChar, descricao)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'PARECER', @statusId, @etapa, @descricao, 1, GETDATE())
        `);

      // 4. Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'PARECER_TECNICO_OS')
        .input('entidade', sql.NVarChar, 'ordens_servico')
        .input('entidade_id', sql.NVarChar, ordemId)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: usuarioId,
          cargo: usuarioCargo,
          ordemId,
          etapa,
          laudoTecnico: !!laudoTecnico,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Lançamento de peça/produto como orçamento com auditoria atômica
  static async adicionarItemProduto({ ordemId, produtoId, quantidade, precoUnitario, usuarioId, usuarioCargo = '' }) {
    const pool = await getPool();
    const qtdNum = Number(quantidade) || 1;
    if (qtdNum <= 0) {
      throw new Error('A quantidade deve ser maior que zero.');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verifica produto existente e ativo
      const prodRes = await new sql.Request(transaction)
        .input('produtoId', sql.VarChar, produtoId)
        .query(`
          SELECT id, nome, preco, estoque, ativo 
          FROM produtos 
          WHERE id = @produtoId
        `);

      const produto = prodRes.recordset[0];
      if (!produto) {
        throw new Error('Produto não localizado.');
      }
      if (!produto.ativo) {
        throw new Error(`O produto "${produto.nome}" está inativo.`);
      }

      const precoFinal = precoUnitario !== undefined && precoUnitario !== null 
        ? Number(precoUnitario) 
        : Number(produto.preco);

      if (isNaN(precoFinal) || precoFinal <= 0) {
        throw new Error('O valor unitário da peça deve ser estritamente maior que zero (R$ > 0).');
      }

      // 2. Inserir em produtos_ordem com baixado_estoque = 0 (apenas orçamento preliminar)
      const itemIdRes = await new sql.Request(transaction).query('SELECT LOWER(NEWID()) AS id');
      const itemId = itemIdRes.recordset[0].id;

      await new sql.Request(transaction)
        .input('id', sql.VarChar, itemId)
        .input('ordemId', sql.VarChar, ordemId)
        .input('produtoId', sql.VarChar, produtoId)
        .input('quantidade', sql.Int, qtdNum)
        .input('precoUnitario', sql.Decimal(10, 2), precoFinal)
        .input('usuarioId', sql.VarChar, usuarioId)
        .query(`
          INSERT INTO produtos_ordem (id, ordem_id, produto_id, quantidade, preco_unitario, baixado, baixado_estoque, usuario_id, ativo, criado_em, atualizado_em)
          VALUES (@id, @ordemId, @produtoId, @quantidade, @precoUnitario, 0, 0, @usuarioId, 1, GETDATE(), GETDATE())
        `);

      // 3. Apontamento no histórico da OS (tipo PARECER)
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('etapa', sql.NVarChar, 'Orçamento de Peça')
        .input(
          'descricao',
          sql.NVarChar,
          `Peça orçada para a OS: ${qtdNum}x "${produto.nome}" a R$ ${precoFinal.toFixed(2)} cada (Aguardando baixa no estoque).`
        )
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'PARECER', NULL, @etapa, @descricao, 1, GETDATE())
        `);

      // 4. Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'CONSUMO_PECA_OS')
        .input('entidade', sql.NVarChar, 'produtos_ordem')
        .input('entidade_id', sql.NVarChar, ordemId)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: usuarioId,
          cargo: usuarioCargo,
          produtoId,
          quantidade: qtdNum,
          precoUnitario: precoFinal,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Remoção de peça da OS com auditoria atômica
  static async removerItemProduto({ ordemId, itemOrdemId, usuarioId, usuarioCargo = '' }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Busca item em produtos_ordem
      const itemRes = await new sql.Request(transaction)
        .input('itemOrdemId', sql.VarChar, itemOrdemId)
        .input('ordemId', sql.VarChar, ordemId)
        .query(`
          SELECT po.id, po.ordem_id, po.produto_id, po.quantidade, po.preco_unitario, ISNULL(po.baixado, po.baixado_estoque) AS baixado, po.baixado_estoque, p.nome AS produtoNome
          FROM produtos_ordem po
          JOIN produtos p ON p.id = po.produto_id
          WHERE po.id = @itemOrdemId AND po.ordem_id = @ordemId AND po.ativo = 1
        `);

      const item = itemRes.recordset[0];
      if (!item) {
        throw new Error('Item de produto da ordem não localizado ou já removido.');
      }

      const estornarEstoque = Boolean(item.baixado || item.baixado_estoque);

      // 2. Se a peça já havia sido baixada no estoque, devolve a quantidade
      if (estornarEstoque) {
        await new sql.Request(transaction)
          .input('produtoId', sql.VarChar, item.produto_id)
          .input('qtd', sql.Int, item.quantidade)
          .query(`
            UPDATE produtos
            SET estoque = estoque + @qtd,
                atualizado_em = GETDATE()
            WHERE id = @produtoId
          `);
      }

      // 3. Remove ou inativa o item na OS
      await new sql.Request(transaction)
        .input('itemOrdemId', sql.VarChar, itemOrdemId)
        .query('UPDATE produtos_ordem SET ativo = 0, atualizado_em = GETDATE() WHERE id = @itemOrdemId');

      // 4. Apontamento no histórico (tipo PARECER)
      const descHist = estornarEstoque
        ? `Peça removida da OS e estornada ao estoque: ${item.quantidade}x "${item.produtoNome}".`
        : `Peça orçada removida da OS: ${item.quantidade}x "${item.produtoNome}".`;

      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('etapa', sql.NVarChar, estornarEstoque ? 'Estorno de Peça' : 'Remoção de Orçamento')
        .input('descricao', sql.NVarChar, descHist)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'PARECER', NULL, @etapa, @descricao, 1, GETDATE())
        `);

      // 5. Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'ESTORNO_PECA_OS')
        .input('entidade', sql.NVarChar, 'produtos_ordem')
        .input('entidade_id', sql.NVarChar, itemOrdemId)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: usuarioId,
          cargo: usuarioCargo,
          ordemId,
          itemId: itemOrdemId,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Baixa atômica de peças no estoque (RF06) com auditoria atômica
  static async baixarEstoque({ ordemId, usuarioId, usuarioCargo = '', numeroOrdem = '' }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verifica se a OS existe e está no status 4 ("Aprovado") ou 5 ("Em Reparo")
      const osRes = await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .query('SELECT id, numero_ordem, status_id FROM ordens_servico WHERE id = @ordemId AND ativo = 1');

      const os = osRes.recordset[0];
      if (!os) {
        throw new Error('Ordem de serviço não localizada.');
      }

      if (Number(os.status_id) !== 4 && Number(os.status_id) !== 5) {
        throw new Error('A baixa de estoque só pode ser executada quando a OS estiver no status "Aprovado pelo Cliente" ou "Em Reparo / Em Andamento".');
      }

      // 2. Busca todas as peças orçadas que ainda não foram baixadas
      const itensRes = await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .query(`
          SELECT po.id, po.produto_id, po.quantidade, p.nome AS produtoNome, p.estoque AS estoqueAtual, p.ativo AS produtoAtivo
          FROM produtos_ordem po
          JOIN produtos p WITH (UPDLOCK, ROWLOCK) ON p.id = po.produto_id
          WHERE po.ordem_id = @ordemId AND po.ativo = 1 AND ((po.baixado = 0 OR po.baixado IS NULL) AND (po.baixado_estoque = 0 OR po.baixado_estoque IS NULL))
        `);

      const itensPendentes = itensRes.recordset;
      if (!itensPendentes || itensPendentes.length === 0) {
        throw new Error('Não há peças pendentes de baixa no estoque para esta Ordem de Serviço.');
      }

      // 3. Valida se o estoque de cada produto é suficiente antes de efetivar qualquer subtração
      for (const item of itensPendentes) {
        if (!item.produtoAtivo) {
          throw new Error(`O produto "${item.produtoNome}" está inativo.`);
        }
        if (item.estoqueAtual < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para "${item.produtoNome}". Saldo atual no estoque: ${item.estoqueAtual}, necessário: ${item.quantidade}.`
          );
        }
      }

      // 4. Executa a baixa atômica de cada produto e atualiza produtos_ordem
      const itensBaixadosNomes = [];
      for (const item of itensPendentes) {
        await new sql.Request(transaction)
          .input('produtoId', sql.VarChar, item.produto_id)
          .input('qtd', sql.Int, item.quantidade)
          .query(`
            UPDATE produtos
            SET estoque = estoque - @qtd,
                atualizado_em = GETDATE()
            WHERE id = @produtoId
          `);

        await new sql.Request(transaction)
          .input('itemId', sql.VarChar, item.id)
          .input('usuarioId', sql.VarChar, usuarioId)
          .query(`
            UPDATE produtos_ordem 
            SET baixado = 1,
                baixado_estoque = 1,
                baixado_em = GETDATE(),
                baixado_por = @usuarioId,
                atualizado_em = GETDATE() 
            WHERE id = @itemId
          `);

        itensBaixadosNomes.push(`${item.quantidade}x "${item.produtoNome}"`);
      }

      // 5. Obter nome do usuário que realizou a baixa
      const userRes = await new sql.Request(transaction)
        .input('usuarioId', sql.VarChar, usuarioId)
        .query('SELECT nome FROM usuarios WHERE id = @usuarioId');
      const nomeUsuario = userRes.recordset[0]?.nome || 'Usuário';

      // 6. Registro no histórico da OS (tipo PARECER)
      const descHist = `Baixa de estoque realizada por ${nomeUsuario}. Itens baixados: ${itensBaixadosNomes.join(', ')}.`;
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('statusId', sql.Int, Number(os.status_id))
        .input('etapa', sql.NVarChar, 'Baixa de Estoque')
        .input('descricao', sql.NVarChar, descHist)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'PARECER', @statusId, @etapa, @descricao, 1, GETDATE())
        `);

      // 7. Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'BAIXA_ESTOQUE_OS')
        .input('entidade', sql.NVarChar, 'produtos_ordem')
        .input('entidade_id', sql.NVarChar, ordemId)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: usuarioId,
          cargo: usuarioCargo,
          ordemId,
          numeroOrdem: numeroOrdem || os.numero_ordem,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Atribuir ou alterar técnico responsável da OS com auditoria atômica
  static async atribuirTecnico({ ordemId, tecnicoId, usuarioId, usuarioCargo = '' }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const osRes = await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .query('SELECT id, tecnico_id FROM ordens_servico WHERE id = @ordemId AND ativo = 1');

      const os = osRes.recordset[0];
      if (!os) {
        throw new Error('Ordem de serviço não encontrada.');
      }

      let nomeTecnico = 'Não atribuído';
      if (tecnicoId) {
        const tecRes = await new sql.Request(transaction)
          .input('tecnicoId', sql.VarChar, tecnicoId)
          .query('SELECT nome, cargo FROM usuarios WHERE id = @tecnicoId AND ativo = 1');
        const tec = tecRes.recordset[0];
        if (!tec) {
          throw new Error('Técnico informado não localizado ou inativo.');
        }
        nomeTecnico = tec.nome;
      }

      // Atualizar OS
      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('tecnicoId', sql.VarChar, tecnicoId || null)
        .query('UPDATE ordens_servico SET tecnico_id = @tecnicoId, atualizado_em = GETDATE() WHERE id = @ordemId');

      // Obter nome de quem executou a atribuição
      const userRes = await new sql.Request(transaction)
        .input('usuarioId', sql.VarChar, usuarioId)
        .query('SELECT nome FROM usuarios WHERE id = @usuarioId');
      const nomeUsuario = userRes.recordset[0]?.nome || 'Usuário';

      const descHist = tecnicoId === usuarioId
        ? `Técnico ${nomeUsuario} assumiu a responsabilidade por esta Ordem de Serviço.`
        : `Técnico responsável alterado para "${nomeTecnico}" por ${nomeUsuario}.`;

      await new sql.Request(transaction)
        .input('ordemId', sql.VarChar, ordemId)
        .input('usuarioId', sql.VarChar, usuarioId)
        .input('etapa', sql.NVarChar, 'Atribuição Técnica')
        .input('descricao', sql.NVarChar, descHist)
        .query(`
          INSERT INTO historico_ordens (id, ordem_id, usuario_id, tipo_registro, status_id, etapa, descricao, ativo, criado_em)
          VALUES (LOWER(NEWID()), @ordemId, @usuarioId, 'PARECER', NULL, @etapa, @descricao, 1, GETDATE())
        `);

      // Auditoria atômica em logs_sistema na mesma transação
      await new sql.Request(transaction)
        .input('usuario_id', sql.VarChar, usuarioId)
        .input('acao', sql.NVarChar, 'ATRIBUIR_TECNICO_OS')
        .input('entidade', sql.NVarChar, 'ordens_servico')
        .input('entidade_id', sql.NVarChar, ordemId)
        .input('detalhes', sql.NVarChar, JSON.stringify({
          usuario_id: usuarioId,
          cargo: usuarioCargo,
          ordemId,
          tecnicoId,
        }))
        .query(`
          INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
          VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
        `);

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Cancelar ou inativar OS (Soft delete) com transação e auditoria atômica
  static async alternarStatus(id, contextoAuditoria = {}) {
    if (!id) return null;
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Obter estado atual da OS
      const buscaAtual = await new sql.Request(transaction)
        .input('id', sql.VarChar, id)
        .query('SELECT id, ativo, numero_ordem FROM ordens_servico WHERE id = @id');

      const osAtual = buscaAtual.recordset[0];
      if (!osAtual) {
        await transaction.rollback();
        return null;
      }

      const novoAtivo = osAtual.ativo === 1 ? 0 : 1;

      // 2. Atualizar status ativo
      await new sql.Request(transaction)
        .input('id', sql.VarChar, id)
        .input('novoAtivo', sql.Bit, novoAtivo)
        .query(`
          UPDATE ordens_servico
          SET ativo = @novoAtivo,
              atualizado_em = GETDATE()
          WHERE id = @id
        `);

      // 3. Auditoria atômica em logs_sistema na mesma transação
      if (contextoAuditoria?.usuarioId) {
        await new sql.Request(transaction)
          .input('usuario_id', sql.VarChar, contextoAuditoria.usuarioId)
          .input('acao', sql.NVarChar, 'ALTERNAR_ATIVO_OS')
          .input('entidade', sql.NVarChar, 'ordens_servico')
          .input('entidade_id', sql.NVarChar, id)
          .input('detalhes', sql.NVarChar, JSON.stringify({
            usuario_id: contextoAuditoria.usuarioId,
            cargo: contextoAuditoria.usuarioCargo || '',
            ativoAnterior: osAtual.ativo,
            ativoNovo: novoAtivo,
          }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      }

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = OrderModel;
