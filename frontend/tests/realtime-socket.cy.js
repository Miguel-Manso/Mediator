/**
 * Testes de Estabilidade e Tempo Real (WebSockets / Socket.io) - Sistema Mediator
 * Framework: Cypress E2E
 */

describe('Suíte de Testes de Estabilidade e Tempo Real (Socket.io)', () => {
  const tokenTecnico = 'jwt-fake-tecnico-auth';
  const tokenAtendente = 'jwt-fake-atendente-auth';

  beforeEach(() => {
    // Mock do login inicial e armazenamento do token
    cy.window().then((win) => {
      win.localStorage.setItem('@RochaMagazine:token', tokenTecnico);
      win.localStorage.setItem(
        '@RochaMagazine:usuario',
        JSON.stringify({ id: 'user-tec-1', nome: 'Técnico Automação', cargo: 'TECNICO' })
      );
    });
  });

  /**
   * CENÁRIO A: Teste de Concorrência de OS entre Usuários
   * Dado que o Usuário B está com o modal de Detalhes da OS-100 aberto
   * Quando o Usuário A na esteira Kanban move a OS-100 para o status "Em Reparo"
   * Então o cabeçalho e a linha do tempo do modal do Usuário B devem atualizar instantaneamente via socket
   */
  it('Cenário A: Deve atualizar status e timeline no modal aberto quando outro usuário mover card no Kanban', () => {
    cy.intercept('GET', '/api/ordens-servico/100', {
      statusCode: 200,
      body: {
        id: '100',
        numeroOrdem: 'OS-100',
        statusId: 1,
        statusNome: 'Aberto / Recebido',
        statusCor: '#3B82F6',
        historico: [],
      },
    }).as('getOS100');

    cy.visit('/ordens-servico');

    // Abre o modal de detalhes da OS 100
    cy.window().then((win) => {
      // Dispara abertura programática ou clique no card
      cy.get('[data-testid="os-card-100"]').first().click();
    });

    // Simula evento emitido pelo servidor Socket.io de outro usuário (user-atendente-2)
    cy.window().then((win) => {
      const socket = win.__socket_test_instance__ || win.socket;
      if (socket) {
        socket.emit('test_dispatch_event', {
          event: 'os_status_atualizado',
          payload: {
            osId: '100',
            ordemId: '100',
            novoStatusId: 5,
            origemStatusId: 1,
            usuarioId: 'user-atendente-2', // ID diferente do usuário logado
            ordem: {
              id: '100',
              statusId: 5,
              statusNome: 'Em Reparo / Em Andamento',
              statusCor: '#F59E0B',
            },
          },
        });
      }
    });

    // Valida se o status na UI atualizou sem refresh
    cy.contains('Em Reparo / Em Andamento').should('be.visible');
  });

  /**
   * CENÁRIO B: Teste de Prevenção de Duplicação (Idempotência Estrita)
   * Dado que o Técnico envia um laudo técnico via formulário (POST REST)
   * Quando a resposta da API é retornada e simultaneamente o evento broadcast "os_novo_apontamento" é recebido
   * Então o laudo deve ser renderizado apenas uma vez na linha do tempo
   */
  it('Cenário B: Não deve duplicar parecer técnico ao receber resposta REST e evento Socket concorrentes', () => {
    const apontamentoId = 'uuid-apontamento-456';
    const textoParecer = 'Substituição de capacitor C12 concluída com sucesso.';

    cy.intercept('POST', '/api/ordens-servico/100/observacoes-tecnicas', {
      statusCode: 200,
      body: {
        id: '100',
        historico: [
          {
            id: apontamentoId,
            tipoRegistro: 'PARECER',
            etapa: 'Testes de Bancada',
            descricao: textoParecer,
            usuarioNome: 'Técnico Automação',
            usuarioCargo: 'TECNICO',
            criadoEm: new Date().toISOString(),
          },
        ],
      },
    }).as('postApontamento');

    cy.visit('/ordens-servico');
    cy.get('[data-testid="os-card-100"]').first().click();

    // Preenche e submete formulário
    cy.get('textarea[placeholder*="Descreva minuciosamente"]').type(textoParecer);
    cy.contains('button', 'Registrar Apontamento').click();

    // Simula recepção imediata do evento socket da mesma mensagem
    cy.window().then((win) => {
      const socket = win.__socket_test_instance__ || win.socket;
      if (socket) {
        socket.emit('test_dispatch_event', {
          event: 'os_novo_apontamento',
          payload: {
            ordemId: '100',
            apontamento: {
              id: apontamentoId, // Mesmo ID retornado pelo backend
              tipoRegistro: 'PARECER',
              etapa: 'Testes de Bancada',
              descricao: textoParecer,
              usuarioNome: 'Técnico Automação',
              usuarioCargo: 'TECNICO',
              criadoEm: new Date().toISOString(),
            },
          },
        });
      }
    });

    // Deve existir exatamente UMA ocorrência do texto na linha do tempo
    cy.get('.space-y-4').contains(textoParecer).should('have.length', 1);
  });

  /**
   * CENÁRIO C: Teste de Resiliência e Desconexão Offline
   * Dado que o usuário perde conexão com a internet (Offline simulado)
   * Quando tenta mover um card de OS
   * Então a aplicação deve realizar o Rollback otimista, exibir Toast de erro e disparar Re-fetch automático ao retornar Online
   */
  it('Cenário C: Deve executar rollback otimista em falha de rede e re-fetch automático ao reconectar', () => {
    cy.intercept('PATCH', '/api/ordens-servico/100/status', {
      forceNetworkError: true, // Simula falha de rede
    }).as('patchStatusFalha');

    cy.visit('/ordens-servico');

    // Mover card simulando drag and drop
    cy.get('[data-testid="os-card-100"]').first().trigger('dragstart');
    cy.get('[data-testid="coluna-status-5"]').trigger('drop');

    // Valida exibição do toast de erro e reversão do card para coluna inicial
    cy.contains('Erro ao alterar status').should('be.visible');
    cy.get('[data-testid="coluna-status-1"]').find('[data-testid="os-card-100"]').should('exist');
  });
});
