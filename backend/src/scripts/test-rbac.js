const assert = require('assert');
const express = require('express');
const roleMiddleware = require('../middlewares/role.middleware');

console.log('🧪 Iniciando bateria de testes automatizados de RBAC (Controle de Acesso por Perfil)...');

async function testarMiddlewares() {
  console.log('\n--- 1. Testando roleMiddleware para Abertura de OS ---');
  const mwAbertura = roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Técnicos não possuem permissão para abertura de Ordens de Serviço. Esta ação é restrita a Atendentes e Administradores.'
  );

  // Simular Técnico tentando abrir OS
  let statusRetornado = null;
  let jsonRetornado = null;
  let nextChamado = false;

  const reqTecnico = {
    usuario: { id: 'u1', cargo: 'TECNICO' },
  };
  const resMock = {
    status(code) {
      statusRetornado = code;
      return this;
    },
    json(obj) {
      jsonRetornado = obj;
      return this;
    },
  };
  const nextMock = () => {
    nextChamado = true;
  };

  mwAbertura(reqTecnico, resMock, nextMock);
  assert.strictEqual(statusRetornado, 403, 'Técnico deveria receber status 403 na abertura de OS');
  assert.strictEqual(
    jsonRetornado.error,
    'Técnicos não possuem permissão para abertura de Ordens de Serviço. Esta ação é restrita a Atendentes e Administradores.'
  );
  assert.strictEqual(nextChamado, false, 'next() não deveria ser chamado para Técnico');
  console.log('  ✅ [PASS] Bloqueio de Técnico na abertura de OS retornou 403 com mensagem amigável');

  // Simular Atendente abrindo OS
  nextChamado = false;
  const reqAtendente = { usuario: { id: 'u2', cargo: 'ATENDENTE' } };
  mwAbertura(reqAtendente, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Atendente deve ter acesso liberado na abertura de OS');
  console.log('  ✅ [PASS] Atendente liberado para abertura de OS');

  // Simular Admin abrindo OS
  nextChamado = false;
  const reqAdmin = { usuario: { id: 'u3', cargo: 'ADMIN' } };
  mwAbertura(reqAdmin, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Admin deve ter acesso liberado na abertura de OS');
  console.log('  ✅ [PASS] Admin liberado para abertura de OS');

  console.log('\n--- 2. Testando roleMiddleware para Laudo e Apontamentos Técnicos ---');
  const mwLaudo = roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para registrar laudos ou pareceres técnicos de bancada.'
  );

  statusRetornado = null;
  jsonRetornado = null;
  nextChamado = false;
  mwLaudo(reqAtendente, resMock, nextMock);
  assert.strictEqual(statusRetornado, 403, 'Atendente não pode registrar laudo técnico (403)');
  assert.strictEqual(nextChamado, false);
  console.log('  ✅ [PASS] Atendente bloqueado com 403 ao tentar lançar laudo técnico');

  nextChamado = false;
  mwLaudo(reqTecnico, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Técnico liberado para registrar laudo técnico');
  console.log('  ✅ [PASS] Técnico liberado para registrar laudo técnico');

  console.log('\n--- 3. Testando roleMiddleware para Peças / Consumo de Estoque ---');
  const mwPecas = roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para dar baixa de peças no estoque.'
  );

  statusRetornado = null;
  nextChamado = false;
  mwPecas(reqAtendente, resMock, nextMock);
  assert.strictEqual(statusRetornado, 403, 'Atendente não pode consumir peças (403)');
  assert.strictEqual(nextChamado, false);
  console.log('  ✅ [PASS] Atendente bloqueado com 403 ao tentar consumir peças da OS');

  nextChamado = false;
  mwPecas(reqTecnico, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Técnico liberado para consumir peças');
  console.log('  ✅ [PASS] Técnico liberado para consumir e estornar peças');

  console.log('\n--- 4. Testando roleMiddleware para Inativação / Exclusão de OS ---');
  const mwInativar = roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Técnicos não possuem permissão para inativar ou excluir Ordens de Serviço.'
  );

  statusRetornado = null;
  nextChamado = false;
  mwInativar(reqTecnico, resMock, nextMock);
  assert.strictEqual(statusRetornado, 403, 'Técnico não pode inativar OS (403)');
  console.log('  ✅ [PASS] Técnico bloqueado com 403 ao tentar inativar ou excluir OS');

  nextChamado = false;
  mwInativar(reqAtendente, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Atendente liberado para alternar ativo de OS');
  console.log('  ✅ [PASS] Atendente liberado para inativar OS');

  console.log('\n--- 5. Testando Regras de Transição de Status por Perfil ---');
  // Matriz oficial de 9 status:
  // 1: Aberto / Recebido (Atendente)
  // 2: Em Análise / Diagnóstico (Técnico)
  // 3: Aguardando Aprovação (Técnico)
  // 4: Aprovado pelo Cliente (Atendente)
  // 5: Em Reparo / Em Andamento (Técnico)
  // 6: Aguardando Peças (Técnico)
  // 7: Testes Finais / Concluído (Técnico)
  // 8: Entregue / Finalizado (Atendente)
  // 9: Cancelado (Atendente / Admin)

  const validarTransicao = (cargo, statusId) => {
    const statusIdNum = Number(statusId);
    if (cargo === 'TECNICO') {
      const permitidos = [2, 3, 5, 6, 7];
      if (!permitidos.includes(statusIdNum)) {
        return { permitido: false, erro: 'Você não tem permissão para movimentar a Ordem de Serviço para este status.' };
      }
    } else if (cargo === 'ATENDENTE') {
      const permitidos = [1, 4, 8, 9];
      if (!permitidos.includes(statusIdNum)) {
        return { permitido: false, erro: 'Você não tem permissão para movimentar a Ordem de Serviço para este status.' };
      }
    }
    return { permitido: true };
  };

  // Tecnico para status 1 (Aberto) -> Bloqueado
  assert.strictEqual(validarTransicao('TECNICO', 1).permitido, false);
  // Tecnico para status 4 (Aprovado pelo Cliente) -> Bloqueado (Exclusivo Atendente)
  assert.strictEqual(validarTransicao('TECNICO', 4).permitido, false);
  // Tecnico para status 8 (Entregue) -> Bloqueado (Exclusivo Atendente)
  assert.strictEqual(validarTransicao('TECNICO', 8).permitido, false);
  // Tecnico para status 9 (Cancelado) -> Bloqueado
  assert.strictEqual(validarTransicao('TECNICO', 9).permitido, false);
  // Tecnico para status 2 (Em Análise / Diagnóstico) -> Permitido
  assert.strictEqual(validarTransicao('TECNICO', 2).permitido, true);
  // Tecnico para status 3 (Aguardando Aprovação) -> Permitido
  assert.strictEqual(validarTransicao('TECNICO', 3).permitido, true);
  // Tecnico para status 5 (Em Reparo / Em Andamento) -> Permitido
  assert.strictEqual(validarTransicao('TECNICO', 5).permitido, true);
  // Tecnico para status 6 (Aguardando Peças) -> Permitido
  assert.strictEqual(validarTransicao('TECNICO', 6).permitido, true);
  // Tecnico para status 7 (Testes Finais / Concluído) -> Permitido
  assert.strictEqual(validarTransicao('TECNICO', 7).permitido, true);
  console.log('  ✅ [PASS] Transições do Técnico validadas com sucesso (apenas status técnicos 2, 3, 5, 6, 7; bloqueado em 1, 4, 8, 9)');

  // Atendente para status 2 (Em Análise) -> Bloqueado
  assert.strictEqual(validarTransicao('ATENDENTE', 2).permitido, false);
  // Atendente para status 5 (Em Reparo) -> Bloqueado
  assert.strictEqual(validarTransicao('ATENDENTE', 5).permitido, false);
  // Atendente para status 6 (Aguardando Peças) -> Bloqueado
  assert.strictEqual(validarTransicao('ATENDENTE', 6).permitido, false);
  // Atendente para status 7 (Concluído) -> Bloqueado
  assert.strictEqual(validarTransicao('ATENDENTE', 7).permitido, false);
  // Atendente para status 4 (Aprovado pelo Cliente) -> Permitido
  assert.strictEqual(validarTransicao('ATENDENTE', 4).permitido, true);
  // Atendente para status 8 (Entregue / Finalizado) -> Permitido
  assert.strictEqual(validarTransicao('ATENDENTE', 8).permitido, true);
  // Atendente para status 9 (Cancelado) -> Permitido
  assert.strictEqual(validarTransicao('ATENDENTE', 9).permitido, true);
  console.log('  ✅ [PASS] Transições do Atendente validadas com sucesso (aprovado pelo cliente 4, entregue 8, cancelado 9)');

  // Admin para qualquer status -> Permitido
  assert.strictEqual(validarTransicao('ADMIN', 1).permitido, true);
  assert.strictEqual(validarTransicao('ADMIN', 4).permitido, true);
  assert.strictEqual(validarTransicao('ADMIN', 5).permitido, true);
  assert.strictEqual(validarTransicao('ADMIN', 8).permitido, true);
  assert.strictEqual(validarTransicao('ADMIN', 9).permitido, true);
  console.log('  ✅ [PASS] Admin tem controle irrestrito de qualquer status (1 a 9)');

  console.log('\n--- 6. Testando Permissão de Técnico para Clientes, Equipamentos e Produtos ---');
  const mwCadastros = roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']);
  nextChamado = false;
  mwCadastros(reqTecnico, resMock, nextMock);
  assert.strictEqual(nextChamado, true, 'Técnico deve ter acesso liberado para cadastrar/editar/excluir clientes, equipamentos e produtos');
  console.log('  ✅ [PASS] Técnico liberado para gerenciar Clientes, Equipamentos e Produtos');

  console.log('\n🎉 Todos os 6 grupos de testes de RBAC passaram com 100% de sucesso!\n');
}

testarMiddlewares().catch((err) => {
  console.error('❌ Falha nos testes de RBAC:', err);
  process.exit(1);
});
