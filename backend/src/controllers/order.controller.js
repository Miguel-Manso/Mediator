const { getPool, sql } = require('../config/db');
const OrderModel = require('../models/Order.model');
const OrderStatusModel = require('../models/OrderStatus.model');
const socketService = require('../services/socket.service');

const orderController = {
  // Listagem de OS com filtros dinâmicos e paginação (RF09)
  async listar(req, res) {
    try {
      const {
        busca,
        search,
        clienteId,
        cliente,
        tecnicoId,
        tecnico,
        atendenteId,
        atendente,
        tipoServico,
        tipo_servico,
        tipoReparo,
        statusId,
        status,
        dataEntrada,
        data_entrada,
        dataAbertura,
        dataInicio,
        dataEntradaInicio,
        dataFim,
        dataEntradaFim,
        pagina = 1,
        limite = 20,
        apenasAtivos,
      } = req.query;

      const resultado = await OrderModel.listar({
        busca: busca || search || '',
        clienteId: clienteId || null,
        cliente: cliente || null,
        tecnicoId: tecnicoId || null,
        tecnico: tecnico || null,
        atendenteId: atendenteId || null,
        atendente: atendente || null,
        tipoServico: tipoServico || tipo_servico || tipoReparo || null,
        statusId: statusId || null,
        status: status || null,
        dataEntrada: dataEntrada || data_entrada || dataAbertura || null,
        dataInicio: dataInicio || dataEntradaInicio || null,
        dataFim: dataFim || dataEntradaFim || null,
        pagina: Number(pagina) || 1,
        limite: Number(limite) || 20,
        apenasAtivos: apenasAtivos !== 'false',
      });

      return res.status(200).json(resultado);
    } catch (erro) {
      console.error('Erro ao listar ordens de serviço:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar ordens de serviço.' });
    }
  },

  // Detalhe Master-Detail da OS por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const ordem = await OrderModel.buscarPorId(id);

      if (!ordem) {
        return res.status(404).json({ error: 'Ordem de serviço não localizada.' });
      }

      return res.status(200).json(ordem);
    } catch (erro) {
      console.error('Erro ao obter ordem de serviço:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao buscar detalhes da ordem.' });
    }
  },

  // Dados auxiliares para o formulário de abertura e filtros
  async obterAuxiliaresAbertura(req, res) {
    try {
      const pool = await getPool();
      const { clienteId } = req.query;

      // 1. Clientes ativos
      const clientesRes = await pool
        .request()
        .query('SELECT id, nome, cpf, telefone, email FROM clientes WHERE ativo = 1 ORDER BY nome ASC');

      // 2. Equipamentos ativos (filtrados opcionalmente por cliente)
      const eqReq = pool.request();
      let eqQuery = `
        SELECT 
          e.id, 
          e.descricao, 
          e.numero_serie AS numeroSerie, 
          e.cliente_id AS clienteId,
          c.nome AS clienteNome,
          mc.nome AS marcaNome,
          m.nome AS modeloNome,
          cat.nome AS categoriaNome
        FROM equipamentos e
        JOIN clientes c ON c.id = e.cliente_id
        JOIN categorias_equipamento cat ON cat.id = e.categoria_id
        LEFT JOIN marcas mc ON mc.id = e.marca_id
        LEFT JOIN modelos m ON m.id = e.modelo_id
        WHERE e.ativo = 1
      `;
      if (clienteId) {
        eqReq.input('clienteId', sql.VarChar, clienteId);
        eqQuery += ' AND e.cliente_id = @clienteId';
      }
      eqQuery += ' ORDER BY e.descricao ASC';
      const equipamentosRes = await eqReq.query(eqQuery);

      // 3. Técnicos disponíveis (usuários com cargo TECNICO ou ADMIN)
      const tecnicosRes = await pool
        .request()
        .query(`
          SELECT id, nome, email, cargo 
          FROM usuarios 
          WHERE ativo = 1 AND (cargo = 'TECNICO' OR cargo = 'ADMIN') 
          ORDER BY nome ASC
        `);

      // 4. Status de ordem disponíveis
      const statusRes = await pool
        .request()
        .query('SELECT id, nome, descricao, cor, ordem FROM status_ordem WHERE ativo = 1 ORDER BY ordem ASC, id ASC');

      // 5. Produtos / peças em estoque para utilização
      const produtosRes = await pool
        .request()
        .query(`
          SELECT id, nome, descricao, preco, estoque 
          FROM produtos 
          WHERE ativo = 1 
          ORDER BY nome ASC
        `);

      // 6. Atendentes disponíveis (RF09: usuários com cargo ATENDENTE ou ADMIN)
      const atendentesRes = await pool
        .request()
        .query(`
          SELECT id, nome, email, cargo 
          FROM usuarios 
          WHERE ativo = 1 AND (cargo = 'ATENDENTE' OR cargo = 'ADMIN') 
          ORDER BY nome ASC
        `);

      // 7. Catálogo de serviços cadastrados (RF09)
      const servicosRes = await pool
        .request()
        .query(`
          SELECT id, nome 
          FROM servicos 
          WHERE ativo = 1 
          ORDER BY nome ASC
        `);

      return res.status(200).json({
        clientes: clientesRes.recordset,
        equipamentos: equipamentosRes.recordset,
        tecnicos: tecnicosRes.recordset,
        atendentes: atendentesRes.recordset,
        status: statusRes.recordset,
        produtos: produtosRes.recordset,
        servicos: servicosRes.recordset,
      });
    } catch (erro) {
      console.error('Erro ao obter auxiliares de OS:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao carregar dados auxiliares de abertura.' });
    }
  },

  // Abertura de Ordem de Serviço (RF06)
  async criar(req, res) {
    try {
      const {
        clienteId,
        equipamentoId,
        tecnicoId,
        tipoReparo,
        perguntasTriagem,
        descricaoProblema,
        observacoesAtendimento,
      } = req.body || {};

      // Atendente obtido do token JWT
      const atendenteId = req.usuario?.id || req.user?.id;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      if (!atendenteId) {
        return res.status(401).json({ error: 'Usuário atendente não identificado no token.' });
      }

      if (!clienteId) {
        return res.status(400).json({ error: 'O cliente é obrigatório para abertura da OS.' });
      }

      if (!equipamentoId) {
        return res.status(400).json({ error: 'O equipamento é obrigatório para abertura da OS.' });
      }

      if (!descricaoProblema || !String(descricaoProblema).trim()) {
        return res.status(400).json({ error: 'A descrição do problema relatado é obrigatória.' });
      }

      // Validação de vínculo: equipamento pertence ao cliente?
      const pool = await getPool();
      const checaEquipamento = await pool
        .request()
        .input('equipamentoId', sql.VarChar, equipamentoId)
        .input('clienteId', sql.VarChar, clienteId)
        .query('SELECT id FROM equipamentos WHERE id = @equipamentoId AND cliente_id = @clienteId AND ativo = 1');

      if (checaEquipamento.recordset.length === 0) {
        return res.status(400).json({ error: 'O equipamento selecionado não pertence ao cliente informado ou está inativo.' });
      }

      // Gera número sequencial formatado
      const numeroOrdem = await OrderModel.gerarNumeroOrdem();

      const novaOrdem = await OrderModel.criar({
        numeroOrdem,
        clienteId,
        equipamentoId,
        atendenteId,
        tecnicoId: tecnicoId || null,
        statusId: 1, // 1 = Aberto / Recebido
        tipoReparo: tipoReparo || 'OUTRO',
        perguntasTriagem: perguntasTriagem || null,
        descricaoProblema: String(descricaoProblema).trim(),
        observacoesAtendimento: observacoesAtendimento ? String(observacoesAtendimento).trim() : null,
        usuarioCargo,
      });

      // Emite evento de nova OS criada em tempo real
      socketService.emitOsCriada(novaOrdem);

      return res.status(201).json(novaOrdem);
    } catch (erro) {
      console.error('Erro ao abrir ordem de serviço:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao abrir ordem de serviço.' });
    }
  },

  // Atualizar dados gerais da OS
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        tecnicoId,
        descricaoProblema,
        laudoTecnico,
        observacoesAtendimento,
        tipoReparo,
        perguntasTriagem,
      } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      const existente = await OrderModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      // Restrições de perfil na atualização de dados cadastrais / laudo
      const dadosParaAtualizar = {
        tecnicoId,
        descricaoProblema,
        laudoTecnico,
        observacoesAtendimento,
        tipoReparo,
        perguntasTriagem,
      };

      if (usuarioCargo === 'TECNICO') {
        // Técnico não pode alterar dados de triagem/relato inicial do cliente
        dadosParaAtualizar.descricaoProblema = existente.descricaoProblema;
        dadosParaAtualizar.tipoReparo = existente.tipoReparo;
        dadosParaAtualizar.perguntasTriagem = existente.perguntasTriagem;
        dadosParaAtualizar.observacoesAtendimento = existente.observacoesAtendimento;
      } else if (usuarioCargo === 'ATENDENTE') {
        // Atendente não pode inserir ou editar laudo técnico
        if (laudoTecnico && String(laudoTecnico).trim() !== String(existente.laudoTecnico || '').trim()) {
          return res.status(403).json({
            error: 'Atendentes não possuem permissão para registrar ou alterar o laudo técnico da Ordem de Serviço.',
          });
        }
        dadosParaAtualizar.laudoTecnico = existente.laudoTecnico;
      }

      const ordemAtualizada = await OrderModel.atualizar(id, dadosParaAtualizar, {
        usuarioId,
        usuarioCargo,
      });

      // Emite evento de atualização genérica da OS
      socketService.emitOsAtualizada({
        ordemId: id,
        ordem: ordemAtualizada,
      });

      return res.status(200).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao atualizar ordem de serviço:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar ordem de serviço.' });
    }
  },

  // Atualizar Status da OS (RF05 & RF06)
  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const {
        statusId,
        novaEtapaId,
        ordemIndex,
        historico,
        observacao,
      } = req.body || {};

      // Suporte tanto ao payload { novaEtapaId, ordemIndex, historico } quanto { statusId, observacao }
      const novoStatusIdentificador = novaEtapaId !== undefined ? novaEtapaId : statusId;

      if (novoStatusIdentificador === undefined || novoStatusIdentificador === null || novoStatusIdentificador === '') {
        return res.status(400).json({ error: 'O identificador da nova etapa/status (novaEtapaId ou statusId) é obrigatório.' });
      }

      const statusIdNum = Number(novoStatusIdentificador);
      if (isNaN(statusIdNum)) {
        return res.status(400).json({ error: 'O identificador da nova etapa/status deve ser numérico.' });
      }

      const usuarioId =
        historico?.usuarioId || req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(
        req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || ''
      ).toUpperCase();

      const motivo =
        historico?.motivo || observacao || 'Movimentação via esteira Kanban';

      // 1. Validação de existência da OS
      const existente = await OrderModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      // 2. Validação se a etapa de destino existe e está ativa
      const statusDestino = await OrderStatusModel.buscarPorId(statusIdNum);
      if (!statusDestino) {
        return res.status(404).json({ error: 'A etapa/status de destino selecionada não foi localizada no sistema.' });
      }
      if (statusDestino.ativo === false || statusDestino.ativo === 0) {
        return res.status(400).json({ error: `A etapa "${statusDestino.nome}" está inativa e não pode receber Ordens de Serviço.` });
      }

      // 3. Validação de transição de status por perfil (RBAC)
      if (usuarioCargo === 'TECNICO') {
        const statusTecnicosPermitidos = [2, 3, 5, 6, 7];
        if (!statusTecnicosPermitidos.includes(statusIdNum)) {
          return res.status(403).json({
            error: 'Você não tem permissão para movimentar a Ordem de Serviço para este status.',
          });
        }
      } else if (usuarioCargo === 'ATENDENTE') {
        const statusAtendentesPermitidos = [1, 4, 8, 9];
        if (!statusAtendentesPermitidos.includes(statusIdNum)) {
          return res.status(403).json({
            error: 'Você não tem permissão para movimentar a Ordem de Serviço para este status.',
          });
        }
      }

      // 4. Trava de integridade de estoque: impede avanço para Testes Finais (7) ou Entregue (8) se houver peças pendentes de baixa
      if (statusIdNum === 7 || statusIdNum === 8) {
        const temPecasPendentes = await OrderModel.verificarPecasPendentesBaixa(id);
        if (temPecasPendentes) {
          return res.status(400).json({
            error: 'Não é possível avançar a Ordem de Serviço para Testes Finais ou Conclusão/Entrega pois existem peças/produtos orçados pendentes de baixa no estoque. Realize a baixa dos materiais para prosseguir.',
          });
        }
      }

      // 5. Atualização atômica no banco de dados com histórico, movimentação e auditoria ACID
      const ordemAtualizada = await OrderModel.atualizarStatus(
        id,
        statusIdNum,
        usuarioId,
        motivo,
        ordemIndex !== undefined ? Number(ordemIndex) : null,
        {
          usuarioCargo,
          numeroOrdem: existente.numeroOrdem,
          statusAnterior: { id: existente.statusId, nome: existente.statusNome },
          novoStatus: { id: statusDestino.id, nome: statusDestino.nome },
          origem: 'KANBAN_DRAG_AND_DROP',
        }
      );

      // Emite evento de movimentação do Kanban em tempo real
      socketService.emitOsStatusAtualizado({
        ordemId: id,
        novoStatusId: statusIdNum,
        statusAnteriorId: existente.statusId,
        ordemIndex: ordemIndex !== undefined && ordemIndex !== null ? Number(ordemIndex) : null,
        ordem: ordemAtualizada,
        usuarioId,
      });

      return res.status(200).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao alterar status da OS via Kanban:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar status da ordem de serviço.' });
    }
  },

  // Inclusão de observação técnica / parecer pelo técnico (RF06)
  async adicionarObservacaoTecnica(req, res) {
    try {
      const { id } = req.params;
      const { etapa = 'Evolução Técnica', descricao, laudoTecnico } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      if (!descricao || !String(descricao).trim()) {
        return res.status(400).json({ error: 'O texto do parecer ou observação técnica é obrigatório.' });
      }

      const existente = await OrderModel.buscarPorId(id);
      if (!existente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      const ordemAtualizada = await OrderModel.adicionarObservacaoTecnica({
        ordemId: id,
        usuarioId,
        etapa: String(etapa).trim(),
        descricao: String(descricao).trim(),
        laudoTecnico: laudoTecnico ? String(laudoTecnico).trim() : null,
        usuarioCargo,
      });

      // Obtém o apontamento técnico recém-inserido (primeiro item ordenado DESC)
      const novoApontamento = ordemAtualizada?.historico?.[0] || {
        ordemId: id,
        usuarioId,
        etapa: String(etapa).trim(),
        descricao: String(descricao).trim(),
        tipoRegistro: 'PARECER',
        criadoEm: new Date().toISOString(),
      };

      // Emite evento de novo parecer para a sala da OS e do Kanban
      socketService.emitOsNovoApontamento({
        ordemId: id,
        apontamento: novoApontamento,
        ordem: ordemAtualizada,
      });

      return res.status(200).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao adicionar observação técnica:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao adicionar parecer técnico.' });
    }
  },

  // Adicionar produto / peça com baixa de estoque transacional (RF06)
  async adicionarItemProduto(req, res) {
    try {
      const { id } = req.params;
      const { produtoId, quantidade, precoUnitario } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      if (!produtoId) {
        return res.status(400).json({ error: 'O produtoId é obrigatório.' });
      }

      const qtd = Number(quantidade);
      if (isNaN(qtd) || qtd <= 0) {
        return res.status(400).json({ error: 'A quantidade deve ser um número maior que zero.' });
      }

      if (precoUnitario !== undefined && precoUnitario !== null && String(precoUnitario).trim() !== '') {
        const precoNum = Number(precoUnitario);
        if (isNaN(precoNum) || precoNum <= 0) {
          return res.status(400).json({ error: 'O valor unitário da peça deve ser estritamente maior que zero (R$ > 0).' });
        }
      }

      const ordemExistente = await OrderModel.buscarPorId(id);
      if (!ordemExistente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      const ordemAtualizada = await OrderModel.adicionarItemProduto({
        ordemId: id,
        produtoId,
        quantidade: Math.floor(qtd),
        precoUnitario: precoUnitario !== undefined && precoUnitario !== null && String(precoUnitario).trim() !== '' ? Number(precoUnitario) : null,
        usuarioId,
        usuarioCargo,
      });

      return res.status(201).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao adicionar produto na OS:', erro);
      const isValidation = erro.message && (
        erro.message.includes('Estoque insuficiente') ||
        erro.message.includes('não localizado') ||
        erro.message.includes('inativo')
      );
      return res.status(isValidation ? 400 : 500).json({
        error: erro.message || 'Erro ao associar peça à ordem de serviço.',
      });
    }
  },

  // Remover produto / peça da OS com estorno de estoque transacional (RF06)
  async removerItemProduto(req, res) {
    try {
      const { id, itemId } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      const ordemExistente = await OrderModel.buscarPorId(id);
      if (!ordemExistente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      const ordemAtualizada = await OrderModel.removerItemProduto({
        ordemId: id,
        itemOrdemId: itemId,
        usuarioId,
        usuarioCargo,
      });

      return res.status(200).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao remover produto da OS:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao remover peça da ordem.' });
    }
  },

  // Alternar ativo/inativo (Soft Delete)
  async alternarStatusOrdem(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      const ordem = await OrderModel.buscarPorId(id);
      if (!ordem) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      const atualizado = await OrderModel.alternarStatus(id, {
        usuarioId,
        usuarioCargo,
      });

      return res.status(200).json({
        message: `Ordem ${atualizado.numeroOrdem} ${atualizado.ativo ? 'reativada' : 'inativada'} com sucesso.`,
        ordem: atualizado,
      });
    } catch (erro) {
      console.error('Erro ao alterar status ativo da OS:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao alternar status ativo da ordem.' });
    }
  },

  // Baixa de estoque das peças orçadas (RF06 - apenas no status "Em Reparo / Em Andamento")
  async baixarEstoque(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      const ordemExistente = await OrderModel.buscarPorId(id);
      if (!ordemExistente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      if (Number(ordemExistente.statusId) !== 4 && Number(ordemExistente.statusId) !== 5) {
        return res.status(400).json({
          error: 'A baixa de estoque só pode ser executada quando a OS estiver no status "Aprovado pelo Cliente" ou "Em Reparo / Em Andamento".',
        });
      }

      const ordemAtualizada = await OrderModel.baixarEstoque({
        ordemId: id,
        usuarioId,
        usuarioCargo,
        numeroOrdem: ordemExistente.numeroOrdem,
      });

      // Emite evento de baixa no estoque em tempo real
      socketService.emitOsEstoqueBaixado({
        ordemId: id,
        ordem: ordemAtualizada,
      });

      return res.status(200).json({
        message: 'Baixa de estoque realizada com sucesso.',
        ordem: ordemAtualizada,
      });
    } catch (erro) {
      console.error('Erro ao baixar estoque da OS:', erro);
      const isValidation = erro.message && (
        erro.message.includes('Estoque insuficiente') ||
        erro.message.includes('Não há peças') ||
        erro.message.includes('status')
      );
      return res.status(isValidation ? 400 : 500).json({
        error: erro.message || 'Erro ao processar baixa de estoque da OS.',
      });
    }
  },

  // Atribuir ou alterar técnico responsável da OS (RF06)
  async atribuirTecnico(req, res) {
    try {
      const { id } = req.params;
      const { tecnicoId } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const usuarioCargo = String(req.usuario?.cargo || req.usuario?.role || req.user?.cargo || req.user?.role || '').toUpperCase();

      const ordemExistente = await OrderModel.buscarPorId(id);
      if (!ordemExistente) {
        return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      }

      // Se for técnico assumindo a OS sem passar tecnicoId, ou passando a si mesmo:
      let idTecnicoAlvo = tecnicoId;
      if (!idTecnicoAlvo && usuarioCargo === 'TECNICO') {
        idTecnicoAlvo = usuarioId;
      }

      const ordemAtualizada = await OrderModel.atribuirTecnico({
        ordemId: id,
        tecnicoId: idTecnicoAlvo || null,
        usuarioId,
        usuarioCargo,
      });

      // Emite evento de atribuição de técnico / atualização de OS em tempo real
      socketService.emitOsAtualizada({
        ordemId: id,
        dados: { tecnicoId: idTecnicoAlvo },
        ordem: ordemAtualizada,
      });

      return res.status(200).json(ordemAtualizada);
    } catch (erro) {
      console.error('Erro ao atribuir técnico à OS:', erro);
      return res.status(400).json({ error: erro.message || 'Erro ao atribuir técnico à OS.' });
    }
  },
};

module.exports = orderController;
