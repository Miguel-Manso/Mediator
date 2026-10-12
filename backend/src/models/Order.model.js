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

  // Listagem com paginação e múltiplos filtros
  static async listar({
    clienteId = null,
    tecnicoId = null,
    statusId = null,
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

    if (clienteId) {
      req.input('clienteId', sql.VarChar, clienteId);
      whereClause += ' AND os.cliente_id = @clienteId';
    }

    if (tecnicoId) {
      req.input('tecnicoId', sql.VarChar, tecnicoId);
      whereClause += ' AND os.tecnico_id = @tecnicoId';
    }

    if (statusId) {
      req.input('statusId', sql.Int, Number(statusId));
      whereClause += ' AND os.status_id = @statusId';
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
      JOIN clientes c ON c.id = os.cliente_id
      JOIN equipamentos e ON e.id = os.equipamento_id
      LEFT JOIN modelos m ON m.id = e.modelo_id
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
        ORDER BY po.criado_em ASC
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

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Atualizar dados gerais da OS
  static async atualizar(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request().input('id', sql.VarChar, id);
    const sets = ['atualizado_em = GETDATE()'];

    if (dados.tecnicoId !== undefined) {
      sets.push('tecnico_id = @tecnicoId');
      req.input('tecnicoId', sql.VarChar, dados.tecnicoId || null);
    }
    if (dados.descricaoProblema !== undefined) {
      sets.push('descricao_problema = @descricaoProblema');
      req.input('descricaoProblema', sql.NVarChar, dados.descricaoProblema);
    }
    if (dados.laudoTecnico !== undefined) {
      sets.push('laudo_tecnico = @laudoTecnico');
      req.input('laudoTecnico', sql.NVarChar, dados.laudoTecnico);
    }
    if (dados.observacoesAtendimento !== undefined) {
      sets.push('observacoes_atendimento = @observacoesAtendimento');
      req.input('observacoesAtendimento', sql.NVarChar, dados.observacoesAtendimento);
    }
    if (dados.tipoReparo !== undefined) {
      sets.push('tipo_reparo = @tipoReparo');
      req.input('tipoReparo', sql.NVarChar, dados.tipoReparo);
    }
    if (dados.perguntasTriagem !== undefined) {
      sets.push('perguntas_triagem = @perguntasTriagem');
      const val = typeof dados.perguntasTriagem === 'string' ? dados.perguntasTriagem : JSON.stringify(dados.perguntasTriagem);
      req.input('perguntasTriagem', sql.NVarChar, val);
    }
    if (dados.ativo !== undefined) {
      sets.push('ativo = @ativo');
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }

    const query = `
      UPDATE ordens_servico
      SET ${sets.join(', ')}
      WHERE id = @id
    `;
    await req.query(query);
    return this.buscarPorId(id);
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

  // Atualização de Status da OS com registro de histórico e movimentação
  static async atualizarStatus(id, novoStatusId, usuarioId, observacao = '') {
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

      updateQuery += ' WHERE id = @id';

      await new sql.Request(transaction)
        .input('id', sql.VarChar, id)
        .input('statusId', sql.Int, statusIdNum)
        .query(updateQuery);

      // Nome do status novo para o histórico
      const statusRes = await new sql.Request(transaction)
        .input('statusId', sql.Int, statusIdNum)
        .query('SELECT nome FROM status_ordem WHERE id = @statusId');
      const nomeStatus = statusRes.recordset[0]?.nome || `Status ${statusIdNum}`;

      const textoHistorico = observacao && observacao.trim()
        ? `Status alterado para "${nomeStatus}". Observação: ${observacao.trim()}`
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

      await transaction.commit();
      return this.buscarPorId(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Inclusão de observação técnica / parecer da etapa pelo técnico
  static async adicionarObservacaoTecnica({ ordemId, usuarioId, etapa = 'Parecer Técnico', descricao, laudoTecnico = null }) {
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

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Lançamento de peça/produto como orçamento (baixado_estoque = 0, sem deduzir estoque)
  static async adicionarItemProduto({ ordemId, produtoId, quantidade, precoUnitario, usuarioId }) {
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

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Remoção de peça da OS (se estava baixada, estorna ao estoque; se apenas orçada, apenas desvincula)
  static async removerItemProduto({ ordemId, itemOrdemId, usuarioId }) {
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

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Baixa atômica de peças no estoque (RF06 - apenas no status "Em Reparo / Em Andamento")
  static async baixarEstoque({ ordemId, usuarioId }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Verifica se a OS existe e está no status 4 ("Em Reparo / Em Andamento")
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

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Atribuir ou alterar técnico responsável da OS
  static async atribuirTecnico({ ordemId, tecnicoId, usuarioId }) {
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

      await transaction.commit();
      return this.buscarPorId(ordemId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Cancelar ou inativar OS (Soft delete)
  static async alternarStatus(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE ordens_servico
        SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END,
            atualizado_em = GETDATE()
        WHERE id = @id
      `);

    return this.buscarPorId(id);
  }
}

module.exports = OrderModel;
