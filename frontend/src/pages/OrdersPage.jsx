import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  Laptop,
  Clock,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Filter,
  Columns3,
  List,
  SlidersHorizontal,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { updateOSStatus } from '../services/orderService';
import { maskCurrency } from '../utils/masks';
import { useAuth } from '../contexts/AuthContext';
import { verificarPermissaoDrop } from '../utils/orderPermissions';
import { OrderCreateModal } from '../components/orders/OrderCreateModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { Pagination } from '../components/common/Pagination';
import { OrderKanban } from '../components/orders/OrderKanban';
import { OrderColumnModal } from '../components/orders/OrderColumnModal';
import { OrderInactivateColumnModal } from '../components/orders/OrderInactivateColumnModal';
import { useSocket } from '../contexts/SocketContext';

export const OrdersPage = () => {
  const { usuario, user, ehAdmin, ehAtendente, ehTecnico, apenasTecnico, cargo } = useAuth();
  const usuarioLogado = usuario || user;
  const cargoUsuario = cargo || usuarioLogado?.cargo || usuarioLogado?.role || '';
  const { socket, inscreverReconexao } = useSocket();
  const podeGerenciarColunas = ehAdmin || ehAtendente;

  // Modo de Visualização: 'tabela' ou 'kanban'
  const [modoVisualizacao, setModoVisualizacao] = useState('kanban');

  // Ordens de Serviço
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [tecnicoFiltro, setTecnicoFiltro] = useState('');
  const [exibirInativas, setExibirInativas] = useState(false);
  const [exibirColunasInativas, setExibirColunasInativas] = useState(false);

  // Paginação da Tabela
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalOrdens, setTotalOrdens] = useState(0);

  // Auxiliares (Status e Técnicos)
  const [statusLista, setStatusLista] = useState([]);
  const [tecnicosLista, setTecnicosLista] = useState([]);

  // Modais de Ordens de Serviço
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [ordemSelecionadaId, setOrdemSelecionadaId] = useState(null);
  const [statusCriacaoPredefinidoId, setStatusCriacaoPredefinidoId] = useState(null);

  // Modais do CRUD de Colunas do Kanban
  const [modalColunaAberto, setModalColunaAberto] = useState(false);
  const [colunaEmEdicao, setColunaEmEdicao] = useState(null);
  const [modalInativarColunaAberto, setModalInativarColunaAberto] = useState(false);
  const [colunaParaInativar, setColunaParaInativar] = useState(null);

  // Notificação Toast rápida
  const [toast, setToast] = useState(null);
  const exibirToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4500);
  };

  // Fila sequencial assíncrona para controle de concorrência e integridade em múltiplos arrastos
  const filaRequisicoesRef = useRef(Promise.resolve());

  // Carrega status (incluindo inativos para permitir alternar via filtro)
  const carregarStatus = async () => {
    try {
      const res = await api.get('/status-ordem?incluirInativos=true');
      const dados = Array.isArray(res.data) ? res.data : [];
      dados.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      setStatusLista(dados);
    } catch (err) {
      console.error('Erro ao carregar lista de status:', err);
    }
  };

  // Carrega filtros auxiliares (técnicos e status básico)
  useEffect(() => {
    const carregarAuxiliares = async () => {
      try {
        const res = await api.get('/ordens-servico/auxiliares');
        setTecnicosLista(res.data.tecnicos || []);
      } catch (err) {
        console.error('Erro ao carregar filtros de OS:', err);
      }
    };
    carregarAuxiliares();
    carregarStatus();
  }, []);

  // Sincronização em tempo real via WebSockets (Socket.io) para o Kanban e listagem
  useEffect(() => {
    // Re-fetch silencioso automático se a conexão cair e voltar
    const desinscreverReconexao = inscreverReconexao ? inscreverReconexao(() => {
      buscarOrdens();
    }) : () => {};

    if (!socket) return desinscreverReconexao;

    socket.emit('join_kanban');

    // Movimentação de status de card vindo de outro usuário
    const handleStatusAtualizado = (payload) => {
      const osId = payload?.osId || payload?.ordemId;
      const novoStatusId = payload?.novoStatusId;
      const ordemIndex = payload?.ordemIndex;
      const ordem = payload?.ordem;
      const usuarioIdEvento = payload?.usuarioId;

      if (!osId || !novoStatusId) return;

      // Prevenção de "pulos" de UI: ignora evento se foi disparado pelo próprio usuário logado
      if (
        usuarioIdEvento &&
        usuarioLogado?.id &&
        String(usuarioIdEvento) === String(usuarioLogado.id)
      ) {
        return;
      }

      setOrdens((prev) => {
        const index = prev.findIndex((o) => String(o.id) === String(osId));
        if (index === -1) {
          return ordem ? [ordem, ...prev] : prev;
        }
        const copia = [...prev];
        copia[index] = {
          ...copia[index],
          statusId: Number(novoStatusId),
          ordemKanban: ordemIndex !== undefined && ordemIndex !== null ? Number(ordemIndex) : copia[index].ordemKanban,
          ...(ordem ? ordem : {}),
        };
        return copia;
      });
    };

    // Nova OS criada por outro atendente/admin
    const handleNovaOS = (payload) => {
      if (payload?.ordem) {
        setOrdens((prev) => {
          if (prev.some((o) => String(o.id) === String(payload.ordem.id))) return prev;
          return [payload.ordem, ...prev];
        });
        exibirToast(`Nova OS #${payload.ordem.numeroOrdem} aberta no sistema!`, 'sucesso');
      }
    };

    // Atualização genérica de dados da OS
    const handleAtualizada = (payload) => {
      const osId = payload?.ordemId || payload?.osId;
      if (osId) {
        setOrdens((prev) =>
          prev.map((o) =>
            String(o.id) === String(osId)
              ? { ...o, ...(payload.ordem || payload.dados || {}) }
              : o
          )
        );
      }
    };

    socket.on('os_status_atualizado', handleStatusAtualizado);
    socket.on('os_criada', handleNovaOS);
    socket.on('os_atualizada', handleAtualizada);
    socket.on('os_estoque_baixado', handleAtualizada);

    return () => {
      desinscreverReconexao();
      socket.emit('leave_kanban');
      socket.off('os_status_atualizado', handleStatusAtualizado);
      socket.off('os_criada', handleNovaOS);
      socket.off('os_atualizada', handleAtualizada);
      socket.off('os_estoque_baixado', handleAtualizada);
    };
  }, [socket, usuarioLogado?.id, inscreverReconexao]);

  // Busca ordens com filtros
  const buscarOrdens = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (statusFiltro) params.append('statusId', statusFiltro);
      if (tecnicoFiltro) params.append('tecnicoId', tecnicoFiltro);

      // No modo Kanban carregamos um limite maior para popular todas as colunas
      if (modoVisualizacao === 'kanban') {
        params.append('limite', '200');
        params.append('pagina', '1');
      } else {
        params.append('limite', '15');
        params.append('pagina', String(pagina));
      }

      if (exibirInativas) params.append('apenasAtivos', 'false');

      const res = await api.get(`/ordens-servico?${params.toString()}`);
      setOrdens(res.data.dados || []);
      setTotalPaginas(res.data.totalPaginas || 1);
      setTotalOrdens(res.data.total || 0);
    } catch (err) {
      console.error('Erro ao buscar ordens de serviço:', err);
      exibirToast('Erro ao atualizar ordens de serviço.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarOrdens();
  }, [busca, statusFiltro, tecnicoFiltro, exibirInativas, pagina, modoVisualizacao]);

  // Estrutura dinâmica das colunas do Kanban conforme o requisito:
  // Se um status específico for selecionado no dropdown "Todos os status", oculte todas as outras colunas
  // e exiba APENAS a coluna correspondente àquele status na tela, expandindo-a para aproveitar o espaço.
  const colunasKanban = useMemo(() => {
    let colunasFiltradas = statusLista.filter((s) => {
      if (exibirColunasInativas) return true;
      return s.ativo !== false && s.ativo !== 0;
    });

    if (statusFiltro && String(statusFiltro).trim() !== '') {
      colunasFiltradas = colunasFiltradas.filter((s) => String(s.id) === String(statusFiltro));
    }

    const ehUnicaColuna = colunasFiltradas.length === 1 && Boolean(statusFiltro);

    return colunasFiltradas.map((st) => ({
      id: st.id,
      title: st.nome,
      color: st.cor || '#3B82F6',
      order: st.ordem ?? 0,
      isActive: st.ativo !== false && st.ativo !== 0,
      descricao: st.descricao,
      isExpandida: ehUnicaColuna,
      cards: ordens.filter((o) => Number(o.statusId) === Number(st.id)),
    }));
  }, [statusLista, ordens, exibirColunasInativas, statusFiltro]);

  // Alternar ativo/inativo da OS (Soft delete)
  const alternarAtivoOrdem = async (id, statusAtual) => {
    const acao = statusAtual ? 'inativar' : 'reativar';
    if (!window.confirm(`Deseja realmente ${acao} esta Ordem de Serviço?`)) return;

    try {
      await api.patch(`/ordens-servico/${id}/alternar-ativo`);
      exibirToast(`Ordem de Serviço ${acao === 'inativar' ? 'inativada' : 'reativada'} com sucesso!`);
      buscarOrdens();
    } catch (err) {
      exibirToast(err.response?.data?.error || 'Erro ao alterar status da OS.', 'erro');
    }
  };

  // Abrir modal de detalhes
  const abrirDetalhes = (id) => {
    setOrdemSelecionadaId(id);
    setModalDetalheAberto(true);
  };

  // Drag and Drop: Mover card de OS entre colunas e reordenação vertical na mesma coluna
  const handleMoverCardKanban = async (osId, origemStatusId, destinoColunaId, newIndex = null) => {
    // 0. Trava de Segurança RBAC no Front-end (Defesa em Profundidade)
    if (!verificarPermissaoDrop(cargoUsuario, destinoColunaId)) {
      exibirToast('Você não tem permissão para mover para esta etapa', 'erro');
      return;
    }

    const cardAtual = ordens.find((o) => String(o.id) === String(osId));
    if (!cardAtual) return;

    const numeroOrdem = cardAtual.numeroOrdem || `OS #${osId}`;
    // Snapshot para rollback instantâneo caso a API falhe
    const snapshotOrdens = [...ordens];

    // 1. Atualização Otimista no Estado Local (UI responde instantaneamente)
    const ordensSemCard = ordens.filter((o) => String(o.id) !== String(osId));
    const cardAtualizado = {
      ...cardAtual,
      statusId: Number(destinoColunaId),
      ordemKanban: newIndex !== null ? Number(newIndex) : cardAtual.ordemKanban,
    };

    // Calcula a nova lista com inserção na posição newIndex dentro da coluna de destino
    const cardsColunaDestino = ordensSemCard.filter(
      (o) => Number(o.statusId) === Number(destinoColunaId)
    );

    let novasOrdens = [];
    if (newIndex !== null && newIndex !== undefined && newIndex < cardsColunaDestino.length) {
      const cardReferencia = cardsColunaDestino[newIndex];
      const indexGlobal = ordensSemCard.findIndex((o) => o.id === cardReferencia.id);
      novasOrdens = [
        ...ordensSemCard.slice(0, indexGlobal),
        cardAtualizado,
        ...ordensSemCard.slice(indexGlobal),
      ];
    } else {
      // Inserção no final dos cards pertencentes a essa coluna
      const lastIndex = ordensSemCard
        .map((o) => Number(o.statusId))
        .lastIndexOf(Number(destinoColunaId));

      if (lastIndex !== -1) {
        novasOrdens = [
          ...ordensSemCard.slice(0, lastIndex + 1),
          cardAtualizado,
          ...ordensSemCard.slice(lastIndex + 1),
        ];
      } else {
        novasOrdens = [...ordensSemCard, cardAtualizado];
      }
    }

    // Aplica atualização otimista imediata: contadores de colunas e métricas do topo atualizam instantaneamente!
    setOrdens(novasOrdens);

    // 2. Chamada de API Assíncrona com Enfileiramento e Controle de Concorrência
    if (Number(origemStatusId) !== Number(destinoColunaId)) {
      filaRequisicoesRef.current = filaRequisicoesRef.current.then(async () => {
        try {
          await updateOSStatus(osId, {
            novaEtapaId: destinoColunaId,
            ordemIndex: newIndex !== null ? Number(newIndex) : 0,
            historico: {
              motivo: 'Movimentação via esteira Kanban',
              usuarioId: usuarioLogado?.id || undefined,
            },
          });
          exibirToast(`Status da ${numeroOrdem} atualizado com sucesso!`);
        } catch (err) {
          // 3. Mecanismo de Rollback e Tratamento de Erros
          setOrdens(snapshotOrdens);
          const mensagemErro =
            err.response?.data?.error ||
            err.message ||
            'Erro de conexão com o servidor.';
          exibirToast(
            `Não foi possível mover a ${numeroOrdem}. A alteração foi desfeita. (${mensagemErro})`,
            'erro'
          );
        }
      });
    } else {
      exibirToast(`Ordem de prioridade da ${numeroOrdem} atualizada na etapa!`);
    }
  };

  // CRUD de Coluna: Salvar (Criar ou Editar)
  const handleSalvarColuna = async (dadosColuna) => {
    try {
      if (dadosColuna.id) {
        await api.put(`/status-ordem/${dadosColuna.id}`, {
          nome: dadosColuna.nome,
          descricao: dadosColuna.descricao,
          cor: dadosColuna.cor,
          ordem: Number(dadosColuna.ordem) || 0,
          ativo: dadosColuna.ativo,
        });
        exibirToast(`Coluna "${dadosColuna.nome}" atualizada com sucesso!`);
      } else {
        await api.post('/status-ordem', {
          nome: dadosColuna.nome,
          descricao: dadosColuna.descricao,
          cor: dadosColuna.cor,
          ordem: Number(dadosColuna.ordem) || 0,
        });
        exibirToast(`Nova coluna "${dadosColuna.nome}" criada com sucesso!`);
      }
      await carregarStatus();
      await buscarOrdens();
    } catch (err) {
      throw err;
    }
  };

  // CRUD de Coluna: Inativar (com ou sem remanejamento de OSs)
  const handleConfirmarInativacao = async ({ colunaId, remanejarOS, destinoStatusId }) => {
    try {
      // Se solicitado, remaneja as OSs antes da inativação
      if (remanejarOS && destinoStatusId) {
        const colunaAlvo = colunasKanban.find((c) => String(c.id) === String(colunaId));
        if (colunaAlvo && colunaAlvo.cards?.length > 0) {
          for (const card of colunaAlvo.cards) {
            await api.patch(`/ordens-servico/${card.id}/status`, {
              statusId: Number(destinoStatusId),
            });
          }
        }
      }

      await api.patch(`/status-ordem/${colunaId}/status`);
      exibirToast('Coluna inativada com sucesso!');
      await carregarStatus();
      await buscarOrdens();
    } catch (err) {
      throw err;
    }
  };

  // CRUD de Coluna: Reativar
  const handleReativarColuna = async (coluna) => {
    try {
      await api.patch(`/status-ordem/${coluna.id}/status`);
      exibirToast(`Coluna "${coluna.title || coluna.nome}" reativada com sucesso!`);
      await carregarStatus();
      await buscarOrdens();
    } catch (err) {
      exibirToast(err.response?.data?.error || 'Erro ao reativar coluna.', 'erro');
    }
  };

  // Reordenação de Colunas (Esquerda / Direita)
  const handleMoverColuna = async (colunaId, direcao) => {
    const indexAtual = colunasKanban.findIndex((c) => String(c.id) === String(colunaId));
    if (indexAtual === -1) return;

    const novoIndex = direcao === 'esquerda' ? indexAtual - 1 : indexAtual + 1;
    if (novoIndex < 0 || novoIndex >= colunasKanban.length) return;

    const colAtual = colunasKanban[indexAtual];
    const colAdjacente = colunasKanban[novoIndex];

    try {
      // Inverte as ordens
      const ordemTemp = colAtual.order;
      const ordemNova = colAdjacente.order === ordemTemp ? (direcao === 'esquerda' ? ordemTemp - 1 : ordemTemp + 1) : colAdjacente.order;

      await api.put(`/status-ordem/${colAtual.id}`, { ordem: ordemNova });
      await api.put(`/status-ordem/${colAdjacente.id}`, { ordem: ordemTemp });

      await carregarStatus();
    } catch (err) {
      console.error('Erro ao reordenar coluna:', err);
      exibirToast('Erro ao alterar ordem da coluna.', 'erro');
    }
  };

  // Abertura rápida de OS dentro de uma etapa específica
  const handleAbrirCriacaoNaColuna = (colunaId) => {
    setStatusCriacaoPredefinidoId(colunaId);
    setModalCriacaoAberto(true);
  };

  // Contadores para métricas
  const emAberto = ordens.filter((o) => o.statusId >= 1 && o.statusId <= 4).length;
  const emReparo = ordens.filter((o) => o.statusId === 5 || o.statusId === 6).length;
  const finalizadas = ordens.filter((o) => o.statusId === 7 || o.statusId === 8).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Flutuante */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl animate-in slide-in-from-top duration-200 max-w-md">
          {toast.tipo === 'erro' ? (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-800">{toast.mensagem}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ordens de Serviço</h1>
          <p className="text-sm text-slate-500">
            Abertura de OS, triagem por tipo de reparo, esteira Kanban e controle de manutenção
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Alternador de Exibição (View Switcher: Tabela / Kanban) */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setModoVisualizacao('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                modoVisualizacao === 'kanban'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em quadro Kanban"
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('tabela')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                modoVisualizacao === 'tabela'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em lista tabular"
            >
              <List className="h-3.5 w-3.5" />
              <span>Tabela</span>
            </button>
          </div>

          {/* Botão "+ Nova Coluna / Status" */}
          {podeGerenciarColunas && (
            <button
              type="button"
              onClick={() => {
                setColunaEmEdicao(null);
                setModalColunaAberto(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
              title="Criar nova etapa de status para o fluxo de OS"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>+ Nova Coluna / Status</span>
            </button>
          )}

          {/* Botão de Criação de OS */}
          {podeGerenciarColunas && (
            <button
              type="button"
              onClick={() => {
                setStatusCriacaoPredefinidoId(null);
                setModalCriacaoAberto(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <Plus className="h-4 w-4" />
              Nova Ordem de Serviço
            </button>
          )}
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total de OS</p>
            <p className="text-2xl font-bold text-slate-800">{totalOrdens}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Abertas / Triagem</p>
            <p className="text-2xl font-bold text-slate-800">{emAberto}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Em Manutenção</p>
            <p className="text-2xl font-bold text-slate-800">{emReparo}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Concluídas / Entregues</p>
            <p className="text-2xl font-bold text-slate-800">{finalizadas}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Busca textual */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OS, cliente, equipamento..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filtro por Status */}
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os status</option>
              {statusLista.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.ordem}. {st.nome} {!st.ativo ? '(Inativa)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Técnico */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={tecnicoFiltro}
              onChange={(e) => {
                setTecnicoFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os técnicos</option>
              {tecnicosLista.map((tec) => (
                <option key={tec.id} value={tec.id}>
                  {tec.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes de Inativas (OS e Colunas) */}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-start lg:justify-end gap-2 flex-wrap">
            {/* Filtro de Colunas Inativas (destaque especial para o Kanban) */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 select-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition" title="Exibe etapas que foram desativadas/arquivadas">
              <input
                type="checkbox"
                checked={exibirColunasInativas}
                onChange={(e) => setExibirColunasInativas(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Colunas inativas</span>
            </label>

            {/* Filtro de Ordens de Serviço Inativas */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 select-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition" title="Exibe ordens de serviço arquivadas">
              <input
                type="checkbox"
                checked={exibirInativas}
                onChange={(e) => {
                  setExibirInativas(e.target.checked);
                  setPagina(1);
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>OS inativas</span>
            </label>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: KANBAN OU TABELA */}
      {modoVisualizacao === 'kanban' ? (
        <OrderKanban
          colunas={colunasKanban}
          carregando={carregando}
          cargo={cargoUsuario}
          aoMoverCard={handleMoverCardKanban}
          aoAdicionarColuna={() => {
            setColunaEmEdicao(null);
            setModalColunaAberto(true);
          }}
          aoEditarColuna={(col) => {
            setColunaEmEdicao(col);
            setModalColunaAberto(true);
          }}
          aoInativarColuna={(col) => {
            setColunaParaInativar(col);
            setModalInativarColunaAberto(true);
          }}
          aoReativarColuna={handleReativarColuna}
          aoMoverColuna={handleMoverColuna}
          aoAbrirCriacaoOS={handleAbrirCriacaoNaColuna}
          aoAbrirDetalhesOS={abrirDetalhes}
          aoAlternarAtivoOS={alternarAtivoOrdem}
          podeGerenciar={podeGerenciarColunas}
          filtroInativas={exibirColunasInativas}
        />
      ) : (
        /* VISUALIZAÇÃO EM TABELA (EXISTENTE) */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {carregando ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : ordens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
              <p className="text-xs text-slate-400 mt-1">
                Abra uma nova OS no botão acima ou altere os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Número da OS</th>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Equipamento</th>
                    <th className="px-5 py-3.5">Status Atual</th>
                    <th className="px-5 py-3.5">Técnico</th>
                    <th className="px-5 py-3.5 text-right">Peças (R$)</th>
                    <th className="px-5 py-3.5">Abertura</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordens.map((os) => (
                    <tr key={os.id} className="transition-colors hover:bg-slate-50/50">
                      {/* Número da OS */}
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        <span className="inline-block rounded bg-slate-100 px-2 py-1 text-slate-800">
                          {os.numeroOrdem}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{os.clienteNome}</p>
                        <p className="text-[11px] text-slate-400">{os.clienteTelefone}</p>
                      </td>

                      {/* Equipamento */}
                      <td className="px-5 py-3.5 max-w-xs truncate">
                        <p className="font-medium text-slate-800">{os.equipamentoDescricao}</p>
                        <p className="text-[11px] text-slate-400">
                          {os.marcaNome ? `${os.marcaNome} ${os.modeloNome || ''}` : os.categoriaNome || 'Equipamento'}
                        </p>
                      </td>

                      {/* Status da OS */}
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs"
                          style={{ backgroundColor: os.statusCor || '#3B82F6' }}
                        >
                          {os.statusNome}
                        </span>
                      </td>

                      {/* Técnico Responsável */}
                      <td className="px-5 py-3.5">
                        {os.tecnicoNome ? (
                          <span className="font-medium text-slate-700">{os.tecnicoNome}</span>
                        ) : (
                          <span className="italic text-slate-400 text-[11px]">Não atribuído</span>
                        )}
                      </td>

                      {/* Peças / Subtotal */}
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                        {maskCurrency(os.totalProdutos || 0)}
                      </td>

                      {/* Abertura */}
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {new Date(os.abertoEm).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => abrirDetalhes(os.id)}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
                            title="Visualizar detalhes, histórico e peças"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detalhes
                          </button>

                          {podeGerenciarColunas && (
                            <button
                              onClick={() => alternarAtivoOrdem(os.id, os.ativo)}
                              className={`rounded p-1 transition ${
                                os.ativo
                                  ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600'
                                  : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                              title={os.ativo ? 'Inativar OS' : 'Reativar OS'}
                            >
                              {os.ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação Clássica Numerada da Tabela */}
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={totalOrdens}
            limite={20}
            aoMudarPagina={(novaPagina) => setPagina(novaPagina)}
          />
        </div>
      )}

      {/* Modal de Criação / Edição de Coluna de Status */}
      <OrderColumnModal
        aberto={modalColunaAberto}
        aoFechar={() => {
          setModalColunaAberto(false);
          setColunaEmEdicao(null);
        }}
        aoSalvar={handleSalvarColuna}
        colunaEmEdicao={colunaEmEdicao}
        proximaOrdemSugerida={statusLista.length + 1}
      />

      {/* Modal de Confirmação de Inativação de Coluna */}
      <OrderInactivateColumnModal
        aberto={modalInativarColunaAberto}
        aoFechar={() => {
          setModalInativarColunaAberto(false);
          setColunaParaInativar(null);
        }}
        aoConfirmar={handleConfirmarInativacao}
        coluna={colunaParaInativar}
        outrasColunasAtivas={colunasKanban.filter((c) => c.isActive)}
      />

      {/* Modal de Abertura de Ordem de Serviço */}
      {podeGerenciarColunas && (
        <OrderCreateModal
          aberto={modalCriacaoAberto}
          aoFechar={() => {
            setModalCriacaoAberto(false);
            setStatusCriacaoPredefinidoId(null);
          }}
          aoSucesso={() => {
            buscarOrdens();
          }}
        />
      )}

      {/* Modal Master-Detail e Consumo de Peças */}
      <OrderDetailModal
        ordemId={ordemSelecionadaId}
        aberto={modalDetalheAberto}
        aoFechar={() => {
          setModalDetalheAberto(false);
          setOrdemSelecionadaId(null);
        }}
        aoAtualizar={() => {
          buscarOrdens();
        }}
      />
    </div>
  );
};

export default OrdersPage;
