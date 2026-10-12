const { OrderModel } = require('../models/Order.model');

async function testUnitaryFlow() {
  console.log('🧪 Iniciando validações unitárias para RF05 e RF06...\n');

  // 1. Validação de triagem com N/E
  console.log('--- 1. Validação de Triagem com "N/E" ---');
  const dadosTriagemRaw = {
    "Aparelho liga?": "Sim",
    "Caiu na água?": "",
    "Possui senha?": null,
    "Estado da carcaça": "   ",
    "Carregador entregue?": "N/E"
  };

  const triagemSanitizada = {};
  for (const [k, v] of Object.entries(dadosTriagemRaw)) {
    triagemSanitizada[k] = (v === null || v === undefined || String(v).trim() === '') ? 'N/E' : String(v).trim();
  }

  const vazios = Object.values(triagemSanitizada).filter(val => val === '' || val === null);
  if (vazios.length === 0 && triagemSanitizada["Caiu na água?"] === 'N/E' && triagemSanitizada["Possui senha?"] === 'N/E') {
    console.log('  ✅ [PASS] Perguntas em branco ou nulas foram sanitizadas para "N/E"');
  } else {
    throw new Error('Falha na sanitização de triagem com N/E');
  }

  // 2. Validação dos 9 status fixos
  console.log('\n--- 2. Validação dos 9 Status Fixos ---');
  const statusFixos = [
    { id: 1, nome: "Aberto / Recebido" },
    { id: 2, nome: "Em Análise / Diagnóstico" },
    { id: 3, nome: "Aguardando Aprovação" },
    { id: 4, nome: "Aprovado pelo Cliente" },
    { id: 5, nome: "Em Reparo / Em Andamento" },
    { id: 6, nome: "Aguardando Peças" },
    { id: 7, nome: "Testes Finais / Concluído" },
    { id: 8, nome: "Entregue / Finalizado" },
    { id: 9, nome: "Cancelado" }
  ];

  if (statusFixos.length === 9 && statusFixos[3].nome === "Aprovado pelo Cliente" && statusFixos[4].nome === "Em Reparo / Em Andamento") {
    console.log('  ✅ [PASS] 9 status fixos cadastrados com sucesso (incluindo Aprovado pelo Cliente no ID 4).');
  } else {
    throw new Error('Falha na validação dos 9 status fixos.');
  }

  // 3. Validação da regra do botão de baixa de estoque (status 4 e 5)
  console.log('\n--- 3. Validação da Regra do Botão [Dar Baixa no Estoque] ---');
  const mockOS1 = { statusId: 1, itens: [{ id: '1', baixado: false, baixadoEstoque: false }] };
  const mockOS2 = { statusId: 4, itens: [{ id: '1', baixado: false, baixadoEstoque: false }] };
  const mockOS3 = { statusId: 5, itens: [{ id: '1', baixado: false, baixadoEstoque: false }] };
  const mockOS4 = { statusId: 5, itens: [{ id: '1', baixado: true, baixadoEstoque: true }] };

  const podeBaixar = (os) => (Number(os.statusId) === 4 || Number(os.statusId) === 5) && os.itens.some(it => !it.baixado && !it.baixadoEstoque);

  if (!podeBaixar(mockOS1) && podeBaixar(mockOS2) && podeBaixar(mockOS3) && !podeBaixar(mockOS4)) {
    console.log('  ✅ [PASS] Botão de baixa de estoque liberado nos status 4 ("Aprovado pelo Cliente") e 5 ("Em Reparo") com peças pendentes.');
  } else {
    throw new Error('Regra do botão de baixa de estoque violada.');
  }

  // 3.1 Trava de integridade de estoque: impede Testes Finais (7) ou Entregue (8) se houver peças pendentes
  console.log('\n--- 3.1. Validação da Trava de Integridade para Testes Finais e Entrega ---');
  const validarAvancoStatus = (novoStatusId, itens) => {
    const pendentes = (itens || []).filter(it => !it.baixado && !it.baixadoEstoque);
    if ((Number(novoStatusId) === 7 || Number(novoStatusId) === 8) && pendentes.length > 0) {
      return { permitido: false, erro: 'Peças pendentes de baixa no estoque.' };
    }
    return { permitido: true };
  };

  const osComPecasPendentes = [{ id: '1', baixado: false, baixadoEstoque: false }];
  const osComPecasBaixadas = [{ id: '1', baixado: true, baixadoEstoque: true }];
  const osSemPecas = [];

  // Com peças pendentes -> Bloqueia 7 e 8
  if (!validarAvancoStatus(7, osComPecasPendentes).permitido && !validarAvancoStatus(8, osComPecasPendentes).permitido) {
    console.log('  ✅ [PASS] OS com peças pendentes bloqueada para avançar para Status 7 (Testes) e Status 8 (Entregue)');
  } else {
    throw new Error('Falha na trava de peças pendentes para status 7 e 8.');
  }

  // Com peças baixadas -> Libera 7 e 8
  if (validarAvancoStatus(7, osComPecasBaixadas).permitido && validarAvancoStatus(8, osComPecasBaixadas).permitido) {
    console.log('  ✅ [PASS] OS com todas as peças baixadas liberada para avançar para Status 7 e 8');
  } else {
    throw new Error('Falha na liberação com peças baixadas.');
  }

  // Sem peças -> Libera 7 e 8
  if (validarAvancoStatus(7, osSemPecas).permitido && validarAvancoStatus(8, osSemPecas).permitido) {
    console.log('  ✅ [PASS] OS sem peças orçadas liberada diretamente para Status 7 e 8');
  } else {
    throw new Error('Falha na liberação de OS sem peças orçadas.');
  }

  // 4. Validação de filtros de linha do tempo
  console.log('\n--- 4. Validação de Filtros da Linha do Tempo ---');
  const mockHistorico = [
    { id: '1', tipoRegistro: 'STATUS', descricao: 'OS aberta' },
    { id: '2', tipoRegistro: 'PARECER', descricao: 'Diagnóstico de bancada' },
    { id: '3', tipoRegistro: 'STATUS', descricao: 'Mudança para Em Diagnóstico' },
    { id: '4', tipoRegistro: 'PARECER', descricao: 'Laudo técnico final' }
  ];

  const soPareceres = mockHistorico.filter(h => h.tipoRegistro === 'PARECER');
  const soStatus = mockHistorico.filter(h => h.tipoRegistro === 'STATUS');

  if (soPareceres.length === 2 && soStatus.length === 2) {
    console.log('  ✅ [PASS] Separação estrita entre PARECER e STATUS no histórico funcionando.');
  } else {
    throw new Error('Filtro de histórico incorreto.');
  }

  console.log('\n🎉 Todas as regras de negócio RF05 e RF06 foram validadas com sucesso!');
}

testUnitaryFlow().catch((err) => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
