import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  AlertTriangle,
  Smartphone,
  Laptop,
  Monitor,
  Printer,
  Wrench,
  User,
  Cpu,
  FileText,
  HelpCircle,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { EquipmentSearchModal } from '../common/EquipmentSearchModal';

const TIPOS_REPARO = [
  {
    codigo: 'SMARTPHONE',
    nome: 'Smartphone / Tablet',
    icone: Smartphone,
    perguntas: [
      {
        campo: 'O aparelho liga?',
        tipo: 'select',
        opcoes: ['Sim, normalmente', 'Não liga', 'Liga e desliga em seguida', 'Apenas vibra/notifica'],
      },
      {
        campo: 'Código de Desbloqueio / Senha PIN',
        tipo: 'text',
        placeholder: "Ex: 1234 ou 'Padrão L'",
      },
      {
        campo: 'Teve contato com água ou umidade?',
        tipo: 'select',
        opcoes: ['Não', 'Sim, recente', 'Sim, há algum tempo', 'Suspeita de oxidação'],
      },
      {
        campo: 'Condição da Tela / Visor',
        tipo: 'select',
        opcoes: ['Intacta sem trincas', 'Vidro quebrado (touch funciona)', 'Display manchado/listrado', 'Sem imagem'],
      },
      {
        campo: 'Acessórios deixados na loja',
        tipo: 'text',
        placeholder: 'Ex: Carregador, capa de proteção, chip SIM',
      },
    ],
  },
  {
    codigo: 'NOTEBOOK',
    nome: 'Notebook',
    icone: Laptop,
    perguntas: [
      {
        campo: 'O notebook liga e dá imagem?',
        tipo: 'select',
        opcoes: [
          'Liga e dá vídeo normalmente',
          'Liga LEDs/cooler mas tela fica preta',
          'Não liga nada (morto)',
          'Desliga sozinho após alguns minutos',
        ],
      },
      {
        campo: 'Acompanha fonte / carregador original?',
        tipo: 'select',
        opcoes: ['Sim, entregou fonte original', 'Sim, fonte similar/universal', 'Não deixou fonte'],
      },
      {
        campo: 'Estado da Bateria',
        tipo: 'select',
        opcoes: [
          'Segura carga normalmente',
          'Viciada / Só funciona na tomada',
          'Bateria estufada / aquecendo',
          'Sem bateria instalada',
        ],
      },
      {
        campo: 'Condição da Carcaça e Dobradiças',
        tipo: 'select',
        opcoes: [
          'Intactas sem quebras',
          'Dobradiça dura / quebrando',
          'Carcaça trincada / faltando parafusos',
          'Marcas leves de uso',
        ],
      },
      {
        campo: 'Teclado e Touchpad funcionam?',
        tipo: 'select',
        opcoes: ['Funcionam perfeitamente', 'Teclas falhando ou travadas', 'Touchpad não responde', 'Não testado'],
      },
      {
        campo: 'Senha do Usuário / Sistema Operacional',
        tipo: 'text',
        placeholder: "Ex: Senha do Windows/Mac ou 'Sem senha'",
      },
      {
        campo: 'Cliente solicita Backup de dados?',
        tipo: 'select',
        opcoes: [
          'Não precisa de backup',
          'Sim, backup prioritário de documentos e fotos',
          'HD/SSD já sem dados importantes',
        ],
      },
    ],
  },
  {
    codigo: 'DESKTOP',
    nome: 'Desktop / Computador',
    icone: Monitor,
    perguntas: [
      {
        campo: 'O computador liga e dá sinal de vídeo?',
        tipo: 'select',
        opcoes: [
          'Liga normalmente com vídeo',
          'Liga coolers/ventoinhas mas sem vídeo',
          'Não liga nada (não acende luzes)',
          'Fica ligando e desligando em loop',
        ],
      },
      {
        campo: 'Emite bips sonoros ao ligar?',
        tipo: 'select',
        opcoes: ['Nenhum bip', '1 bip curto (normal)', 'Bips contínuos ou múltiplos', 'Não possui buzzer/speaker'],
      },
      {
        campo: 'Apresenta travamentos ou tela azul?',
        tipo: 'select',
        opcoes: [
          'Não apresenta travamento',
          'Sim, tela azul frequente (BSOD)',
          'Trava ao abrir programas pesados / jogos',
          'Congela na tela de carregamento',
        ],
      },
      {
        campo: 'Possui Placa de Vídeo Dedicada (GPU)?',
        tipo: 'select',
        opcoes: ['Sim, possui GPU dedicada', 'Não, vídeo integrado da placa-mãe', 'Não informado / Gabinete fechado'],
      },
      {
        campo: 'Acompanha cabos ou periféricos?',
        tipo: 'text',
        placeholder: 'Ex: Cabo de força, adaptador Wi-Fi, sem cabos',
      },
      {
        campo: 'Senha do Usuário do Windows',
        tipo: 'text',
        placeholder: "Ex: Senha do Windows ou 'Sem senha'",
      },
      {
        campo: 'Cliente solicita Backup ou Formatação?',
        tipo: 'select',
        opcoes: [
          'Não formatar / Manter sistema',
          'Sim, formatar com backup prévio',
          'Pode formatar sem backup (disco limpo)',
        ],
      },
    ],
  },
  {
    codigo: 'IMPRESSORA',
    nome: 'Impressora',
    icone: Printer,
    perguntas: [
      {
        campo: 'Puxa papel normalmente?',
        tipo: 'select',
        opcoes: [
          'Puxa normalmente',
          'Papel atola constantemente',
          'Não puxa o papel / patinando roletes',
          'Puxa várias folhas de uma vez',
        ],
      },
      {
        campo: 'Barulho de engrenagens ou ruído anormal?',
        tipo: 'select',
        opcoes: [
          'Funcionamento silencioso',
          'Estalos fortes de engrenagem',
          'Ruído agudo de motor',
          'Carro de impressão travando',
        ],
      },
      {
        campo: 'Tipo de Suprimento utilizado',
        tipo: 'select',
        opcoes: ['Cartucho Original', 'Cartucho Compatível', 'Tanque de Tinta de Fábrica', 'Toner Laser'],
      },
      {
        campo: 'Acompanha cabo de força ou fonte externa?',
        tipo: 'select',
        opcoes: ['Sim, entregou fonte/cabo', 'Não deixou cabos'],
      },
      {
        campo: 'Qualidade da Impressão',
        tipo: 'select',
        opcoes: [
          'Impressão perfeita',
          'Falhas na cor preta',
          'Falhas nas cores',
          'Página borrada ou manchada',
          'Não imprime nada',
        ],
      },
    ],
  },
  {
    codigo: 'OUTRO',
    nome: 'Geral / Outros',
    icone: Wrench,
    perguntas: [
      {
        campo: 'O aparelho liga / energiza?',
        tipo: 'select',
        opcoes: ['Sim, normalmente', 'Não liga', 'Mau contato intermitente'],
      },
      {
        campo: 'Condição estética e marcas de avaria',
        tipo: 'select',
        opcoes: ['Excelente estado', 'Marcas leves de uso', 'Queda aparente / Carcaça trincada', 'Sinais de oxidação / umidade'],
      },
      {
        campo: 'Acessórios e cabos deixados',
        tipo: 'text',
        placeholder: 'Ex: Fonte de alimentação, cabo, controle remoto',
      },
    ],
  },
];

export const OrderCreateModal = ({ aberto, aoFechar, aoSucesso }) => {
  const { usuario, user } = useAuth();
  const usuarioLogado = usuario || user;

  const [clientes, setClientes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(true);

  // Campos do formulário
  const [clienteId, setClienteId] = useState('');
  const [equipamentoId, setEquipamentoId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [tipoReparo, setTipoReparo] = useState('NOTEBOOK');
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [observacoesAtendimento, setObservacoesAtendimento] = useState('');

  // Respostas de triagem: { [enunciadoDaPergunta]: resposta }
  const [respostasTriagem, setRespostasTriagem] = useState({});

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [modalPesquisaEquipamento, setModalPesquisaEquipamento] = useState(false);

  const clienteSelecionado = clientes.find((c) => String(c.id) === String(clienteId));

  const handleSelecionarEquipamentoPesquisa = (eq) => {
    if (eq) {
      if (eq.clienteId && String(eq.clienteId) !== String(clienteId)) {
        setClienteId(eq.clienteId);
      }
      setEquipamentoId(eq.id);
    }
  };

  // Inicializa respostas com valores padrão conforme o tipo selecionado
  const inicializarRespostas = (codigoTipo) => {
    const tipoObj = TIPOS_REPARO.find((t) => t.codigo === codigoTipo) || TIPOS_REPARO[0];
    const novasRespostas = {};
    tipoObj.perguntas.forEach((p) => {
      if (p.tipo === 'select' && Array.isArray(p.opcoes) && p.opcoes.length > 0) {
        novasRespostas[p.campo] = p.opcoes[0];
      } else {
        novasRespostas[p.campo] = '';
      }
    });
    setRespostasTriagem(novasRespostas);
  };

  // Carrega dados de clientes, equipamentos e técnicos
  useEffect(() => {
    if (!aberto) return;

    const carregarDados = async () => {
      try {
        setCarregandoAuxiliares(true);
        setErro('');
        const res = await api.get('/ordens-servico/auxiliares');
        setClientes(res.data.clientes || []);
        setEquipamentos(res.data.equipamentos || []);
        setTecnicos(res.data.tecnicos || []);
        inicializarRespostas(tipoReparo);
      } catch (err) {
        console.error('Erro ao carregar dados de abertura de OS:', err);
        setErro('Falha ao carregar lista de clientes e técnicos.');
      } finally {
        setCarregandoAuxiliares(false);
      }
    };

    carregarDados();
  }, [aberto]);

  // Troca de tipo de reparo
  const aoMudarTipoReparo = (codigoTipo) => {
    setTipoReparo(codigoTipo);
    inicializarRespostas(codigoTipo);
  };

  const tipoAtivoObj = TIPOS_REPARO.find((t) => t.codigo === tipoReparo) || TIPOS_REPARO[0];

  // Atualiza uma resposta específica do questionário
  const aoMudarResposta = (campo, valor) => {
    setRespostasTriagem((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // Filtra equipamentos do cliente selecionado
  const equipamentosDoCliente = equipamentos.filter((eq) => eq.clienteId === clienteId);

  // Redefine equipamento ao mudar de cliente
  const aoMudarCliente = (novoClienteId) => {
    setClienteId(novoClienteId);
    setEquipamentoId('');
  };

  const aoEnviarFormulario = async (e) => {
    e.preventDefault();
    setErro('');

    if (!clienteId) {
      setErro('Selecione o cliente atendido.');
      return;
    }

    if (!equipamentoId) {
      setErro('Selecione o equipamento a ser reparado.');
      return;
    }

    if (!descricaoProblema.trim()) {
      setErro('Informe o relato do cliente / descrição do problema.');
      return;
    }

    setSalvando(true);

    try {
      // Regra obrigatória: preencher 'N/E' (Não Especificado / Não Informado) em perguntas não respondidas
      const respostasSanitizadas = {};
      tipoAtivoObj.perguntas.forEach((p) => {
        const val = respostasTriagem[p.campo];
        if (val === undefined || val === null || String(val).trim() === '') {
          respostasSanitizadas[p.campo] = 'N/E';
        } else {
          respostasSanitizadas[p.campo] = String(val).trim();
        }
      });

      await api.post('/ordens-servico', {
        clienteId,
        equipamentoId,
        tecnicoId: tecnicoId || null,
        tipoReparo,
        perguntasTriagem: respostasSanitizadas,
        descricaoProblema: descricaoProblema.trim(),
        observacoesAtendimento: observacoesAtendimento.trim() || null,
      });

      aoSucesso();
      aoFechar();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao realizar abertura da Ordem de Serviço.';
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[94vh] rounded-2xl bg-white shadow-2xl transition-all overflow-hidden border border-slate-100">
        {/* Cabeçalho Fixo do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 flex-shrink-0 bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Abertura de Ordem de Serviço</h2>
            <p className="text-xs text-slate-500">
              Coleta de dados do atendimento, identificação do técnico e triagem guiada por tipo de reparo
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagem de Erro (se houver) */}
        {erro && (
          <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-100 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Corpo do Formulário com Rolagem Interna Suave */}
        {carregandoAuxiliares ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <form id="form-abertura-os" onSubmit={aoEnviarFormulario} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
            {/* Seção 1: Identificação de Atendimento */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <User className="h-4 w-4 text-blue-600" />
                1. Identificação do Atendimento
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Atendente logado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Atendente Responsável
                  </label>
                  <input
                    type="text"
                    disabled
                    value={usuarioLogado?.nome || 'Usuário Atual'}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Técnico inicial (opcional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Técnico Pré-Atribuído (Opcional)
                  </label>
                  <select
                    value={tecnicoId}
                    onChange={(e) => setTecnicoId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs"
                  >
                    <option value="">Nenhum técnico atribuído no momento</option>
                    {tecnicos.map((tec) => (
                      <option key={tec.id} value={tec.id}>
                        {tec.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 2: Cliente e Equipamento */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Cpu className="h-4 w-4 text-emerald-600" />
                2. Cliente e Equipamento
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Cliente */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente *</label>
                  <select
                    required
                    value={clienteId}
                    onChange={(e) => aoMudarCliente(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cpf ? `(CPF: ${c.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Equipamento */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Equipamento Cadastrado *
                    </label>
                    <button
                      type="button"
                      onClick={() => setModalPesquisaEquipamento(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                      title="Abrir modal para pesquisar equipamentos"
                    >
                      <Search className="h-3 w-3" />
                      <span>Pesquisa Avançada</span>
                    </button>
                  </div>
                  <select
                    required
                    disabled={!clienteId}
                    value={equipamentoId}
                    onChange={(e) => setEquipamentoId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 transition shadow-xs"
                  >
                    <option value="">
                      {!clienteId
                        ? 'Selecione um cliente primeiro'
                        : equipamentosDoCliente.length === 0
                        ? 'Nenhum equipamento cadastrado para este cliente'
                        : 'Selecione o equipamento...'}
                    </option>
                    {equipamentosDoCliente.map((eq) => {
                      const marcaMod = [eq.marcaNome || eq.marca?.nome, eq.modeloNome || eq.modelo?.nome].filter(Boolean).join(' ');
                      const ident = eq.numeroSerie 
                        ? (/^\d+$/.test(String(eq.numeroSerie).trim()) ? `ID: ${eq.numeroSerie}` : `N/S: ${eq.numeroSerie}`)
                        : 'S/N';
                      const titulo = marcaMod ? `${marcaMod} — ${ident}` : `${eq.descricao} — ${ident}`;
                      return (
                        <option key={eq.id} value={eq.id}>
                          {titulo}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 3: Tipo de Reparo e Questionário Específico de Triagem (100% Flexível e Responsivo) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <HelpCircle className="h-4 w-4 text-purple-600" />
                3. Tipo de Reparo e Questionário Específico de Triagem
              </h3>

              {/* Botões Seletores Responsivos dos 5 Aparelhos */}
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {TIPOS_REPARO.map((item) => {
                  const Icone = item.icone;
                  const ativo = tipoReparo === item.codigo;
                  return (
                    <button
                      key={item.codigo}
                      type="button"
                      onClick={() => aoMudarTipoReparo(item.codigo)}
                      className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 sm:p-3 transition text-center ${
                        ativo
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Icone className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-semibold leading-tight whitespace-normal break-words px-1">
                        {item.nome}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Checklist de Perguntas do Aparelho Selecionado */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="border-b border-slate-100 pb-2.5 mb-3.5 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    Checklist de Triagem: {tipoAtivoObj.nome}
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    {tipoAtivoObj.perguntas.length} itens verificados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {tipoAtivoObj.perguntas.map((p, idx) => {
                    const ehCampoAmplo =
                      p.tipo === 'text' &&
                      (p.campo.toLowerCase().includes('acessório') ||
                        p.campo.toLowerCase().includes('condição') ||
                        p.campo.toLowerCase().includes('defeito'));

                    return (
                      <div
                        key={idx}
                        className={ehCampoAmplo ? 'md:col-span-2' : ''}
                      >
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          {p.campo}
                        </label>

                        {p.tipo === 'select' ? (
                          <select
                            value={respostasTriagem[p.campo] || (p.opcoes?.[0] || '')}
                            onChange={(e) => aoMudarResposta(p.campo, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs"
                          >
                            {(p.opcoes || []).map((op, i) => (
                              <option key={i} value={op}>
                                {op}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={p.placeholder || 'Preencha aqui...'}
                            value={respostasTriagem[p.campo] || ''}
                            onChange={(e) => aoMudarResposta(p.campo, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Seção 4: Relato do Cliente e Observações */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <FileText className="h-4 w-4 text-amber-600" />
                4. Relato do Cliente e Observações de Entrada
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Relato do Cliente / Sintoma Apresentado *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descreva detalhadamente as queixas e observações feitas pelo cliente no balcão..."
                    value={descricaoProblema}
                    onChange={(e) => setDescricaoProblema(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Observações Internas de Atendimento (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente aguardará orçamento até amanhã às 14h; autorizou abertura prévia..."
                    value={observacoesAtendimento}
                    onChange={(e) => setObservacoesAtendimento(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 focus:border-slate-500 focus:outline-none transition shadow-xs"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Rodapé Fixo de Ações do Modal */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6 bg-slate-50/75 flex-shrink-0">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-abertura-os"
            disabled={salvando || carregandoAuxiliares}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Abrir Ordem de Serviço
          </button>
        </div>
      </div>

      {/* Modal de Pesquisa Avançada de Equipamentos */}
      <EquipmentSearchModal
        aberto={modalPesquisaEquipamento}
        aoFechar={() => setModalPesquisaEquipamento(false)}
        aoSelecionar={handleSelecionarEquipamentoPesquisa}
        clienteIdFiltro={clienteId || null}
        clienteNomeFiltro={clienteSelecionado?.nome || ''}
      />
    </div>
  );
};

export default OrderCreateModal;
