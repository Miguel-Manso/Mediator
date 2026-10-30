const { getPool, sql } = require('../config/db');

class ReportModel {
  /**
   * Cruzamento de dados Master-Detail para Relatórios Operacionais (RF12)
   */
  static async obterRelatorioMasterDetail({
    dataInicio = null,
    dataFim = null,
    clienteId = null,
    tecnicoId = null,
    statusId = null,
    tipoReparo = null,
    agrupamento = 'cliente', // 'cliente' | 'tecnico' | 'status' | 'geral'
    apenasAtivos = true,
  } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let whereClause = 'WHERE 1=1';

    if (apenasAtivos) {
      whereClause += ' AND os.ativo = 1';
    }

    if (dataInicio && String(dataInicio).trim() !== '') {
      req.input('dataInicio', sql.NVarChar, String(dataInicio).trim().slice(0, 10));
      whereClause += ' AND CAST(os.aberto_em AS DATE) >= CAST(@dataInicio AS DATE)';
    }

    if (dataFim && String(dataFim).trim() !== '') {
      req.input('dataFim', sql.NVarChar, String(dataFim).trim().slice(0, 10));
      whereClause += ' AND CAST(os.aberto_em AS DATE) <= CAST(@dataFim AS DATE)';
    }

    if (clienteId && String(clienteId).trim() !== '') {
      req.input('clienteId', sql.VarChar, String(clienteId).trim());
      whereClause += ' AND os.cliente_id = @clienteId';
    }

    if (tecnicoId && String(tecnicoId).trim() !== '') {
      req.input('tecnicoId', sql.VarChar, String(tecnicoId).trim());
      whereClause += ' AND os.tecnico_id = @tecnicoId';
    }

    if (statusId && !isNaN(Number(statusId))) {
      req.input('statusId', sql.Int, Number(statusId));
      whereClause += ' AND os.status_id = @statusId';
    }

    if (tipoReparo && String(tipoReparo).trim() !== '') {
      req.input('tipoReparo', sql.NVarChar, `%${String(tipoReparo).trim()}%`);
      whereClause += ' AND os.tipo_reparo LIKE @tipoReparo';
    }

    const query = `
      SELECT 
        os.id AS ordemId,
        os.numero_ordem AS numeroOrdem,
        os.tipo_reparo AS tipoReparo,
        os.descricao_problema AS descricaoProblema,
        os.laudo_tecnico AS laudoTecnico,
        os.aberto_em AS abertoEm,
        os.fechado_em AS fechadoEm,
        os.ativo AS ordemAtiva,
        DATEDIFF(day, os.aberto_em, ISNULL(os.fechado_em, GETDATE())) AS diasEmAberto,
        -- Status
        st.id AS statusId,
        st.nome AS statusNome,
        st.cor AS statusCor,
        st.ordem AS statusOrdem,
        -- Cliente
        c.id AS clienteId,
        c.nome AS clienteNome,
        c.cpf AS clienteCpf,
        c.telefone AS clienteTelefone,
        c.email AS clienteEmail,
        -- Técnico
        ut.id AS tecnicoId,
        ut.nome AS tecnicoNome,
        ut.email AS tecnicoEmail,
        -- Atendente
        ua.id AS atendenteId,
        ua.nome AS atendenteNome,
        -- Equipamento
        e.id AS equipamentoId,
        e.descricao AS equipamentoDescricao,
        e.numero_serie AS equipamentoNumeroSerie,
        cat.nome AS categoriaNome,
        mc.nome AS marcaNome,
        m.nome AS modeloNome,
        -- Subtotais de Peças / Insumos
        ISNULL((
          SELECT SUM(po.quantidade * po.preco_unitario)
          FROM produtos_ordem po
          WHERE po.ordem_id = os.id AND po.ativo = 1
        ), 0.00) AS totalProdutos,
        ISNULL((
          SELECT COUNT(po.id)
          FROM produtos_ordem po
          WHERE po.ordem_id = os.id AND po.ativo = 1
        ), 0) AS quantidadePecas
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
    `;

    const res = await req.query(query);
    const ordens = res.recordset || [];

    // Cálculo dos KPIs / Resumo Geral
    const totalOrdens = ordens.length;
    let valorTotalProdutos = 0;
    let totalDias = 0;
    const statusMap = {};
    const clientesSet = new Set();
    const tecnicosSet = new Set();

    ordens.forEach((o) => {
      const valorProd = Number(o.totalProdutos || 0);
      valorTotalProdutos += valorProd;
      totalDias += Number(o.diasEmAberto || 0);

      if (o.clienteId) clientesSet.add(o.clienteId);
      if (o.tecnicoId) tecnicosSet.add(o.tecnicoId);

      if (!statusMap[o.statusId]) {
        statusMap[o.statusId] = {
          statusId: o.statusId,
          nome: o.statusNome,
          cor: o.statusCor,
          quantidade: 0,
        };
      }
      statusMap[o.statusId].quantidade += 1;
    });

    const tempoMedioDias = totalOrdens > 0 ? Number((totalDias / totalOrdens).toFixed(1)) : 0;
    const resumo = {
      totalOrdens,
      totalClientes: clientesSet.size,
      totalTecnicos: tecnicosSet.size,
      valorTotalProdutos: Number(valorTotalProdutos.toFixed(2)),
      tempoMedioDias,
      distribuicaoStatus: Object.values(statusMap).map((st) => ({
        ...st,
        percentual: totalOrdens > 0 ? Number(((st.quantidade / totalOrdens) * 100).toFixed(1)) : 0,
      })),
    };

    // Montagem da Estrutura Master-Detail Conforme Agrupamento
    let grupos = [];

    if (agrupamento === 'cliente') {
      const gruposCliente = {};
      ordens.forEach((o) => {
        const cId = o.clienteId;
        if (!gruposCliente[cId]) {
          gruposCliente[cId] = {
            master: {
              clienteId: o.clienteId,
              nome: o.clienteNome,
              cpf: o.clienteCpf,
              telefone: o.clienteTelefone,
              email: o.clienteEmail,
              totalOrdens: 0,
              valorTotal: 0,
              ordensConcluidas: 0,
              ordensEmAberto: 0,
            },
            detalhes: [],
          };
        }

        const g = gruposCliente[cId];
        g.master.totalOrdens += 1;
        g.master.valorTotal += Number(o.totalProdutos || 0);
        if (Number(o.statusId) === 8 || Number(o.statusId) === 7) {
          g.master.ordensConcluidas += 1;
        } else {
          g.master.ordensEmAberto += 1;
        }

        g.detalhes.push({
          ordemId: o.ordemId,
          numeroOrdem: o.numeroOrdem,
          tipoReparo: o.tipoReparo,
          descricaoProblema: o.descricaoProblema,
          laudoTecnico: o.laudoTecnico,
          abertoEm: o.abertoEm,
          fechadoEm: o.fechadoEm,
          diasEmAberto: o.diasEmAberto,
          status: {
            id: o.statusId,
            nome: o.statusNome,
            cor: o.statusCor,
          },
          tecnico: o.tecnicoId
            ? { id: o.tecnicoId, nome: o.tecnicoNome, email: o.tecnicoEmail }
            : null,
          atendente: { id: o.atendenteId, nome: o.atendenteNome },
          equipamento: {
            id: o.equipamentoId,
            descricao: o.equipamentoDescricao,
            numeroSerie: o.equipamentoNumeroSerie,
            categoria: o.categoriaNome,
            marca: o.marcaNome,
            modelo: o.modeloNome,
          },
          totalProdutos: Number(o.totalProdutos || 0),
          quantidadePecas: o.quantidadePecas,
        });
      });

      grupos = Object.values(gruposCliente).map((g) => ({
        ...g,
        master: {
          ...g.master,
          valorTotal: Number(g.master.valorTotal.toFixed(2)),
        },
      }));
    } else if (agrupamento === 'tecnico') {
      const gruposTecnico = {};
      ordens.forEach((o) => {
        const tId = o.tecnicoId || 'SEM_TECNICO';
        if (!gruposTecnico[tId]) {
          gruposTecnico[tId] = {
            master: {
              tecnicoId: o.tecnicoId || null,
              nome: o.tecnicoNome || 'Sem Técnico Atribuído',
              email: o.tecnicoEmail || '-',
              totalOrdens: 0,
              valorTotal: 0,
              ordensConcluidas: 0,
              ordensEmAndamento: 0,
            },
            detalhes: [],
          };
        }

        const g = gruposTecnico[tId];
        g.master.totalOrdens += 1;
        g.master.valorTotal += Number(o.totalProdutos || 0);
        if (Number(o.statusId) === 8 || Number(o.statusId) === 7) {
          g.master.ordensConcluidas += 1;
        } else {
          g.master.ordensEmAndamento += 1;
        }

        g.detalhes.push({
          ordemId: o.ordemId,
          numeroOrdem: o.numeroOrdem,
          tipoReparo: o.tipoReparo,
          descricaoProblema: o.descricaoProblema,
          abertoEm: o.abertoEm,
          fechadoEm: o.fechadoEm,
          diasEmAberto: o.diasEmAberto,
          status: {
            id: o.statusId,
            nome: o.statusNome,
            cor: o.statusCor,
          },
          cliente: {
            id: o.clienteId,
            nome: o.clienteNome,
            cpf: o.clienteCpf,
            telefone: o.clienteTelefone,
          },
          equipamento: {
            descricao: o.equipamentoDescricao,
            categoria: o.categoriaNome,
            marca: o.marcaNome,
            modelo: o.modeloNome,
          },
          totalProdutos: Number(o.totalProdutos || 0),
        });
      });

      grupos = Object.values(gruposTecnico).map((g) => ({
        ...g,
        master: {
          ...g.master,
          valorTotal: Number(g.master.valorTotal.toFixed(2)),
        },
      }));
    } else if (agrupamento === 'status') {
      const gruposStatus = {};
      ordens.forEach((o) => {
        const sId = o.statusId;
        if (!gruposStatus[sId]) {
          gruposStatus[sId] = {
            master: {
              statusId: o.statusId,
              nome: o.statusNome,
              cor: o.statusCor,
              ordem: o.statusOrdem,
              totalOrdens: 0,
              valorTotal: 0,
            },
            detalhes: [],
          };
        }

        const g = gruposStatus[sId];
        g.master.totalOrdens += 1;
        g.master.valorTotal += Number(o.totalProdutos || 0);

        g.detalhes.push({
          ordemId: o.ordemId,
          numeroOrdem: o.numeroOrdem,
          tipoReparo: o.tipoReparo,
          abertoEm: o.abertoEm,
          cliente: { id: o.clienteId, nome: o.clienteNome, telefone: o.clienteTelefone },
          tecnico: o.tecnicoId ? { id: o.tecnicoId, nome: o.tecnicoNome } : null,
          equipamento: { descricao: o.equipamentoDescricao, marca: o.marcaNome },
          totalProdutos: Number(o.totalProdutos || 0),
        });
      });

      grupos = Object.values(gruposStatus)
        .sort((a, b) => a.master.ordem - b.master.ordem)
        .map((g) => ({
          ...g,
          master: {
            ...g.master,
            valorTotal: Number(g.master.valorTotal.toFixed(2)),
          },
        }));
    } else {
      // Agrupamento Geral: lista de ordens individualmente detalhadas
      grupos = ordens.map((o) => ({
        master: {
          ordemId: o.ordemId,
          numeroOrdem: o.numeroOrdem,
          tipoReparo: o.tipoReparo,
          abertoEm: o.abertoEm,
          fechadoEm: o.fechadoEm,
          diasEmAberto: o.diasEmAberto,
          valorTotal: Number(Number(o.totalProdutos || 0).toFixed(2)),
        },
        detalhes: [
          {
            cliente: { id: o.clienteId, nome: o.clienteNome, cpf: o.clienteCpf, telefone: o.clienteTelefone },
            tecnico: o.tecnicoId ? { id: o.tecnicoId, nome: o.tecnicoNome } : null,
            atendente: { id: o.atendenteId, nome: o.atendenteNome },
            equipamento: { descricao: o.equipamentoDescricao, marca: o.marcaNome, modelo: o.modeloNome },
            status: { id: o.statusId, nome: o.statusNome, cor: o.statusCor },
            problema: o.descricaoProblema,
            laudo: o.laudoTecnico,
          },
        ],
      }));
    }

    return {
      resumo,
      agrupamento,
      filtrosAplicados: {
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        clienteId: clienteId || null,
        tecnicoId: tecnicoId || null,
        statusId: statusId || null,
      },
      grupos,
    };
  }
}

module.exports = ReportModel;
