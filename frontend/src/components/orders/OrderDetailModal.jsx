import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  AlertTriangle,
  Clock,
  User,
  Laptop,
  CheckCircle2,
  Package,
  Wrench,
  FileText,
  Phone,
  Send,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  History,
  Filter,
  Check,
  Download,
  Lock,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api';
import { maskCurrency } from '../../utils/masks';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { OrderTimeline } from './OrderTimeline';
import { ProductSearchModal } from '../common/ProductSearchModal';

export const OrderDetailModal = ({ ordemId, aberto, aoFechar, aoAtualizar }) => {
  const { usuario, ehAdmin, ehAtendente, ehTecnico, apenasTecnico, apenasAtendente } = useAuth();
  const { socket, conectado, inscreverReconexao } = useSocket();
  const [ordem, setOrdem] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('triagem'); // 'triagem', 'evolucao', 'pecas'

  // Bloqueio de Concorrência Pessimista (Socket.io)
  const [bloqueioConcorrencia, setBloqueioConcorrencia] = useState(null);

  // Modal de Pesquisa Avançada de Peças/Produtos
  const [modalPesquisaPecaAberto, setModalPesquisaPecaAberto] = useState(false);

  // Dados auxiliares para selects
  const [todosStatus, setTodosStatus] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState([]);

  // Estados de Atribuição de Técnico
  const [tecnicoSelecionadoId, setTecnicoSelecionadoId] = useState('');
  const [salvandoTecnico, setSalvandoTecnico] = useState(false);

  // Estados de Transição de Status
  const [novoStatusId, setNovoStatusId] = useState('');
  const [obsStatus, setObsStatus] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  // Estados de Laudo Técnico
  const [laudoEditavel, setLaudoEditavel] = useState('');
  const [salvandoLaudo, setSalvandoLaudo] = useState(false);

  // Estados de Adição de Peça e Baixa
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [qtdPeca, setQtdPeca] = useState(1);
  const [precoPeca, setPrecoPeca] = useState('');
  const [salvandoPeca, setSalvandoPeca] = useState(false);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [erroPeca, setErroPeca] = useState('');

  // Carrega detalhes da OS e dados auxiliares
  const carregarDetalhes = async () => {
    if (!ordemId) return;
    try {
      setCarregando(true);
      setErro('');

      const [resOrdem, resAux] = await Promise.all([
        api.get(`/ordens-servico/${ordemId}`),
        api.get('/ordens-servico/auxiliares'),
      ]);

      setOrdem(resOrdem.data);
      setNovoStatusId('');
      setObsStatus('');
      setLaudoEditavel(resOrdem.data.laudoTecnico || '');
      setTecnicoSelecionadoId(resOrdem.data.tecnicoId || '');
      setTodosStatus(resAux.data.status || []);
      setProdutosDisponiveis(resAux.data.produtos || []);
      setTecnicosDisponiveis(resAux.data.tecnicos || []);
    } catch (err) {
      console.error('Erro ao carregar detalhes da OS:', err);
      setErro(err.response?.data?.error || 'Falha ao buscar detalhes da ordem de serviço.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!aberto || !ordemId) {
      setBloqueioConcorrencia(null);
      return;
    }

    setBloqueioConcorrencia(null);
    carregarDetalhes();

    // Re-fetch silencioso se houver queda e retorno da conexão WebSocket
    const desinscreverReconexao = inscreverReconexao ? inscreverReconexao(() => {
      carregarDetalhes();
    }) : () => {};

    if (!socket) return desinscreverReconexao;

    // Entra na sala específica da OS para receber eventos e adquirir lock
    socket.emit('join_os', ordemId, (resposta) => {
      if (resposta?.bloqueado) {
        setBloqueioConcorrencia({
          bloqueadoPor: resposta.bloqueadoPor || 'Outro usuário',
          bloqueadoEm: resposta.bloqueadoEm || new Date().toISOString(),
        });
      }
    });

    // Eventos de Lock Pessimista de Concorrência
    const handleLockBlocked = (payload) => {
      if (String(payload?.ordemId) === String(ordemId)) {
        setBloqueioConcorrencia({
          bloqueadoPor: payload.bloqueadoPor || 'Outro usuário',
          bloqueadoEm: payload.bloqueadoEm || new Date().toISOString(),
        });
      }
    };

    const handleLockAcquired = (payload) => {
      if (String(payload?.ordemId) === String(ordemId)) {
        setBloqueioConcorrencia(null);
      }
    };

    const handleLockReleased = (payload) => {
      if (String(payload?.ordemId) === String(ordemId)) {
        setBloqueioConcorrencia(null);
        if (aberto && socket) {
          socket.emit('join_os', ordemId);
        }
      }
    };

    // Chat / Timeline em tempo real: insere o novo apontamento técnico no histórico local
    const handleNovoApontamento = (payload) => {
      if (String(payload?.ordemId) === String(ordemId) && payload?.apontamento) {
        setOrdem((prev) => {
          if (!prev) return prev;
          const historicoExistente = prev.historico || [];
          const novoId = payload.apontamento.id || payload.apontamento._id;

          // Garantia contra duplicação (Idempotência estrita)
          if (novoId && historicoExistente.some((h) => String(h.id || h._id) === String(novoId))) {
            return prev;
          }

          return {
            ...prev,
            historico: [payload.apontamento, ...historicoExistente],
          };
        });
      }
    };

    // Atualização de status e recarregamento caso dados mudem em outra aba/computador
    const handleStatusAtualizado = (payload) => {
      if (String(payload?.ordemId || payload?.osId) === String(ordemId)) {
        carregarDetalhes();
      }
    };

    const handleAtualizada = (payload) => {
      if (String(payload?.ordemId || payload?.osId) === String(ordemId)) {
        carregarDetalhes();
      }
    };

    socket.on('os_locked', handleLockBlocked);
    socket.on('os_lock_acquired', handleLockAcquired);
    socket.on('os_lock_released', handleLockReleased);
    socket.on('os_novo_apontamento', handleNovoApontamento);
    socket.on('os_status_atualizado', handleStatusAtualizado);
    socket.on('os_atualizada', handleAtualizada);
    socket.on('os_estoque_baixado', handleAtualizada);

    return () => {
      desinscreverReconexao();
      socket.emit('leave_os', ordemId);
      socket.off('os_locked', handleLockBlocked);
      socket.off('os_lock_acquired', handleLockAcquired);
      socket.off('os_lock_released', handleLockReleased);
      socket.off('os_novo_apontamento', handleNovoApontamento);
      socket.off('os_status_atualizado', handleStatusAtualizado);
      socket.off('os_atualizada', handleAtualizada);
      socket.off('os_estoque_baixado', handleAtualizada);
    };
  }, [aberto, ordemId, socket, inscreverReconexao]);

  // Atribuir ou Alterar Técnico Responsável
  const aoAtribuirTecnico = async (novoId) => {
    try {
      setSalvandoTecnico(true);
      setErro('');
      setSucessoMsg('');
      await api.patch(`/ordens-servico/${ordemId}/tecnico`, {
        tecnicoId: novoId || null,
      });
      setSucessoMsg('Técnico responsável atualizado com sucesso!');
      setTimeout(() => setSucessoMsg(''), 4000);
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao alterar técnico responsável.');
    } finally {
      setSalvandoTecnico(false);
    }
  };

  // Técnico Assume a OS diretamente
  const aoAssumirOS = async () => {
    try {
      setSalvandoTecnico(true);
      setErro('');
      setSucessoMsg('');
      await api.post(`/ordens-servico/${ordemId}/assumir`);
      setSucessoMsg('Você assumiu esta Ordem de Serviço com sucesso!');
      setTimeout(() => setSucessoMsg(''), 4000);
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao assumir Ordem de Serviço.');
    } finally {
      setSalvandoTecnico(false);
    }
  };

  // Dar Baixa no Estoque das Peças da OS (RF06)
  const aoBaixarEstoque = async () => {
    if (!ordem) return;
    if (Number(ordem.statusId) !== 4 && Number(ordem.statusId) !== 5) {
      setErro('A baixa no estoque só pode ser realizada quando a OS estiver no status "Aprovado pelo Cliente" ou "Em Reparo / Em Andamento".');
      return;
    }

    const pecasPendentes = (ordem.itens || []).filter((it) => !it.baixado && !it.baixadoEstoque);
    if (pecasPendentes.length === 0) {
      setErro('Todas as peças desta OS já foram baixadas no estoque.');
      return;
    }

    const confirmacao = window.confirm(
      `Deseja dar baixa em ${pecasPendentes.length} peça(s) no estoque agora?\n\nAs quantidades orçadas serão subtraídas permanentemente do estoque e liberarão o fluxo para Testes Finais e Entrega.`
    );
    if (!confirmacao) return;

    try {
      setSalvandoBaixa(true);
      setErro('');
      setSucessoMsg('');
      const res = await api.post(`/ordens-servico/${ordemId}/baixar-estoque`);
      setSucessoMsg(res.data.message || 'Baixa no estoque realizada com sucesso!');
      setTimeout(() => setSucessoMsg(''), 5000);
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao realizar baixa no estoque.');
    } finally {
      setSalvandoBaixa(false);
    }
  };

  // Transição de Status (RF05 & RF06)
  const aoAtualizarStatus = async (e) => {
    e.preventDefault();
    if (!novoStatusId) {
      setErro('Por favor, selecione um novo status para a ordem de serviço.');
      return;
    }

    if (Number(novoStatusId) === Number(ordem?.statusId)) {
      setErro('A ordem de serviço já se encontra no status selecionado. Escolha um novo status para atualizar.');
      return;
    }

    // Trava de integridade de estoque: impede Testes Finais (7) ou Concluído/Entregue (8) se houver peças pendentes de baixa
    const pecasPendentes = (ordem?.itens || []).filter((it) => !it.baixado && !it.baixadoEstoque);
    if ((Number(novoStatusId) === 7 || Number(novoStatusId) === 8) && pecasPendentes.length > 0) {
      setErro(
        'Não é possível avançar a Ordem de Serviço para Testes Finais ou Conclusão/Entrega pois existem peças/produtos orçados pendentes de baixa no estoque. Realize a baixa dos materiais na aba "Peças" antes de prosseguir.'
      );
      return;
    }

    try {
      setSalvandoStatus(true);
      setErro('');
      await api.patch(`/ordens-servico/${ordemId}/status`, {
        statusId: Number(novoStatusId),
        observacao: obsStatus.trim(),
      });
      setObsStatus('');
      setNovoStatusId('');
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao alterar status da OS.');
    } finally {
      setSalvandoStatus(false);
    }
  };


  // Salvar / Atualizar Laudo Técnico
  const aoSalvarLaudo = async () => {
    try {
      setSalvandoLaudo(true);
      setErro('');
      await api.put(`/ordens-servico/${ordemId}`, {
        laudoTecnico: laudoEditavel.trim() || null,
      });
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar laudo técnico.');
    } finally {
      setSalvandoLaudo(false);
    }
  };

  // Adicionar Peça com baixa atômica de estoque (RF06)
  const aoAdicionarPeca = async (e) => {
    e.preventDefault();
    setErroPeca('');

    if (!produtoSelecionadoId) {
      setErroPeca('Selecione uma peça ou produto.');
      return;
    }

    const qtd = Number(qtdPeca);
    if (isNaN(qtd) || qtd <= 0) {
      setErroPeca('A quantidade deve ser estritamente maior que zero (> 0).');
      return;
    }

    const precoNum = precoPeca ? parseFloat(String(precoPeca).replace(',', '.')) : 0;
    if (isNaN(precoNum) || precoNum <= 0) {
      setErroPeca('O valor/preço da peça deve ser estritamente maior que zero (R$ > 0).');
      return;
    }

    try {
      setSalvandoPeca(true);
      await api.post(`/ordens-servico/${ordemId}/produtos`, {
        produtoId: produtoSelecionadoId,
        quantidade: qtd,
        precoUnitario: precoNum,
      });

      setProdutoSelecionadoId('');
      setQtdPeca(1);
      setPrecoPeca('');
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErroPeca(err.response?.data?.error || 'Erro ao vincular peça à ordem.');
    } finally {
      setSalvandoPeca(false);
    }
  };

  // Remover Peça com estorno de estoque (RF06)
  const aoRemoverPeca = async (itemOrdemId, nomePeca) => {
    if (!window.confirm(`Deseja remover "${nomePeca}" da OS? A quantidade consumida retornará para o estoque.`)) {
      return;
    }

    try {
      await api.delete(`/ordens-servico/${ordemId}/produtos/${itemOrdemId}`);
      await carregarDetalhes();
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao estornar peça.');
    }
  };

  // Atualiza preço sugerido ao selecionar produto
  const aoMudarProduto = (prodId) => {
    setProdutoSelecionadoId(prodId);
    setErroPeca('');
    const p = produtosDisponiveis.find((item) => item.id === prodId);
    if (p) {
      setPrecoPeca(String(p.preco || '0.00'));
    } else {
      setPrecoPeca('');
    }
  };

  // Função para determinar permissão e rótulo de cada status no dropdown (RBAC)
  const obterInfoStatus = (s) => {
    const sid = Number(s?.id);
    const ehAtual = sid === Number(ordem?.statusId);

    if (ehAtual) {
      return {
        desabilitado: true,
        sufixo: '(Status Atual)',
      };
    }

    // Trava de integridade de estoque: bloqueia Testes Finais (7) e Entregue (8) se houver peças pendentes de baixa
    const pecasPendentes = (ordem?.itens || []).filter((it) => !it.baixado && !it.baixadoEstoque);
    if ((sid === 7 || sid === 8) && pecasPendentes.length > 0) {
      return {
        desabilitado: true,
        sufixo: '(Pendente baixa de peças)',
      };
    }

    if (ehAdmin) {
      return {
        desabilitado: false,
        sufixo: '',
      };
    }

    if (apenasTecnico) {
      // Técnico pode selecionar status técnicos:
      // 2: 'Em Análise / Diagnóstico'
      // 3: 'Aguardando Aprovação'
      // 5: 'Em Reparo / Em Andamento'
      // 6: 'Aguardando Peças'
      // 7: 'Testes Finais / Concluído'
      const permitidosTecnico = [2, 3, 5, 6, 7];
      if (permitidosTecnico.includes(sid)) {
        return {
          desabilitado: false,
          sufixo: '',
        };
      }
      return {
        desabilitado: true,
        sufixo: '(Restrito ao Atendente)',
      };
    }

    if (apenasAtendente) {
      // Atendente pode selecionar:
      // 4: 'Aprovado pelo Cliente' (após negociar com cliente)
      // 8: 'Entregue / Finalizado' (no balcão)
      // 9: 'Cancelado' (caso cliente desista)
      // Desabilitados para Atendente: 2, 3, 5, 6, 7 (técnicos)
      const desabilitadosAtendente = [2, 3, 5, 6, 7];
      if (desabilitadosAtendente.includes(sid)) {
        return {
          desabilitado: true,
          sufixo: '(Restrito ao Técnico)',
        };
      }
      return {
        desabilitado: false,
        sufixo: '',
      };
    }

    return {
      desabilitado: false,
      sufixo: '',
    };
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[94vh] rounded-2xl bg-white shadow-2xl transition-all overflow-hidden border border-slate-100">
        {/* Topo do Master-Detail (Fixo) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 py-4 sm:px-6 flex-shrink-0 bg-white">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-lg sm:text-xl font-extrabold text-slate-900">
              {ordem?.numeroOrdem || 'Carregando...'}
            </span>
            {ordem && (
              <span
                className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: ordem.statusCor || '#3B82F6' }}
              >
                {ordem.statusNome}
              </span>
            )}
            {ordem?.fechadoEm && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Finalizada
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={aoFechar}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {erro && (
          <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-100 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucessoMsg && (
          <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {bloqueioConcorrencia ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center my-auto space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm animate-pulse">
              <Lock className="h-10 w-10" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Acesso Simultâneo Bloqueado
              </h3>
              <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
                Esta Ordem de Serviço já está sendo visualizada/editada por{' '}
                <span className="font-extrabold text-amber-950 underline">
                  {bloqueioConcorrencia.bloqueadoPor}
                </span>
                . Aguarde ele fechar a sessão.
              </p>
              <p className="text-xs text-slate-500">
                Para prevenir conflitos de versão e perda acidental de dados, apenas um operador pode manter a OS aberta para visualização ou edição por vez. O bloqueio será liberado automaticamente assim que o usuário fechar o modal ou se desconectar.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={aoFechar}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              >
                Voltar para a Lista
              </button>
              <button
                type="button"
                onClick={() => {
                  if (socket && ordemId) {
                    socket.emit('join_os', ordemId);
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : carregando ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !ordem ? (
          <div className="py-12 text-center text-slate-500">Ordem de serviço não localizada.</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
            {/* Bloco Master: Resumo do Atendimento */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/75 p-4 sm:grid-cols-3">
              {/* Cliente */}
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Cliente
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ordem.clienteNome}</p>
                <p className="text-xs text-slate-500">{ordem.clienteCpf ? `CPF: ${ordem.clienteCpf}` : 'CPF não inf.'}</p>
                <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Phone className="h-3 w-3" />
                  <span>{ordem.clienteTelefone}</span>
                </div>
              </div>

              {/* Equipamento */}
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Laptop className="h-3.5 w-3.5 text-slate-500" />
                  Equipamento
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ordem.equipamentoDescricao}</p>
                <p className="text-xs text-slate-500">
                  {ordem.marcaNome ? `${ordem.marcaNome} ${ordem.modeloNome || ''}` : 'Sem marca inf.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  N/S: {ordem.equipamentoNumeroSerie || 'Sem número de série'}
                </p>
              </div>

              {/* Responsáveis e Prazos */}
              <div className="flex flex-col justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    Atendimento
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    <span className="font-semibold">Atendente:</span> {ordem.atendenteNome}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                    <span className="font-semibold">Técnico:</span>
                    {ordem.tecnicoNome ? (
                      <span className="font-medium text-slate-900">{ordem.tecnicoNome}</span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Não atribuído
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aberto em: {new Date(ordem.abertoEm).toLocaleString('pt-BR')}
                  </p>
                </div>

                {/* Ações de Atribuição Flexível de Técnico (RF05/RF06) */}
                {(ehAdmin || ehTecnico) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                    {!ordem.tecnicoId && ehTecnico && (
                      <button
                        type="button"
                        onClick={aoAssumirOS}
                        disabled={salvandoTecnico}
                        className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {salvandoTecnico ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
                        Assumir esta OS
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={tecnicoSelecionadoId}
                        onChange={(e) => setTecnicoSelecionadoId(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-slate-400 flex-1 min-w-[140px] sm:max-w-[200px]"
                      >
                        <option value="">(Não atribuído)</option>
                        {tecnicosDisponiveis.map((tec) => (
                          <option key={tec.id} value={tec.id}>
                            {tec.nome} {tec.id === usuario?.id ? '(Você)' : ''}
                          </option>
                        ))}
                      </select>
                      {tecnicoSelecionadoId !== (ordem.tecnicoId || '') && (
                        <button
                          type="button"
                          onClick={() => aoAtribuirTecnico(tecnicoSelecionadoId)}
                          disabled={salvandoTecnico}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700 disabled:opacity-50 shrink-0"
                          title="Salvar alteração de técnico"
                        >
                          {salvandoTecnico ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Abas de Navegação Responsivas */}
            <div className="flex overflow-x-auto border-b border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setAbaAtiva('triagem')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                  abaAtiva === 'triagem'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                Geral e Laudo
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('evolucao')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                  abaAtiva === 'evolucao'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <History className="h-4 w-4 shrink-0" />
                Evolução Técnica ({ordem.historico?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('pecas')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                  abaAtiva === 'pecas'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Package className="h-4 w-4 shrink-0" />
                Peças ({ordem.itens?.length || 0})
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: GERAL E LAUDO */}
            {abaAtiva === 'triagem' && (
              <div className="space-y-4">
                {/* Relato do problema */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Relato do Cliente no Balcão
                  </h4>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {ordem.descricaoProblema}
                  </p>
                </div>

                {/* Respostas do Questionário de Triagem (RF06) */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Questionário Específico de Triagem (Tipo: {ordem.tipoReparo || 'OUTRO'})
                    </h4>
                  </div>

                  {ordem.perguntasTriagem && typeof ordem.perguntasTriagem === 'object' && Object.keys(ordem.perguntasTriagem).length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {Object.entries(ordem.perguntasTriagem).map(([pergunta, resposta]) => {
                        const ehNaoInformado = !resposta || String(resposta).trim() === '' || String(resposta).trim().toUpperCase() === 'N/E';
                        return (
                          <div key={pergunta} className="rounded-lg border border-slate-100 bg-slate-50/75 p-3">
                            <p className="text-[11px] font-semibold text-slate-500">{pergunta}</p>
                            {ehNaoInformado ? (
                              <span className="mt-1 inline-flex items-center rounded bg-slate-200/90 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                N/E (Não Informado)
                              </span>
                            ) : (
                              <p className="text-xs font-bold text-slate-800 mt-1">{String(resposta)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum questionário dinâmico registrado.</p>
                  )}
                </div>

                {/* Observações de atendimento */}
                {ordem.observacoesAtendimento && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Observações de Entrada / Atendimento
                    </h4>
                    <p className="text-xs text-slate-600">{ordem.observacoesAtendimento}</p>
                  </div>
                )}

                {/* Laudo Técnico */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Laudo Técnico Oficial do Reparo
                      </h4>
                      {apenasAtendente && (
                        <span className="text-[11px] text-amber-600 font-medium">
                          (Somente leitura: restrito a Técnicos e Administradores)
                        </span>
                      )}
                    </div>
                    {!apenasAtendente && (
                      <button
                        type="button"
                        onClick={aoSalvarLaudo}
                        disabled={salvandoLaudo}
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {salvandoLaudo ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Salvar Laudo
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    readOnly={apenasAtendente}
                    disabled={apenasAtendente}
                    placeholder={
                      apenasAtendente
                        ? 'Nenhum laudo técnico registrado pela bancada até o momento.'
                        : 'Parecer técnico final, causas identificadas do defeito, testes realizados...'
                    }
                    value={laudoEditavel}
                    onChange={(e) => setLaudoEditavel(e.target.value)}
                    className={`w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none ${
                      apenasAtendente
                        ? 'bg-slate-50 text-slate-600 cursor-not-allowed border-dashed'
                        : 'focus:border-slate-500'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 2: EVOLUÇÃO TÉCNICA E HISTÓRICO (RF05 & RF06) */}
            {abaAtiva === 'evolucao' && (
              <div className="space-y-5">
                {/* 1. Transição de Status da OS */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      Avançar / Atualizar Status da OS
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {apenasTecnico
                        ? 'Status de bancada e diagnóstico permitidos (balcão restrito ao Atendente)'
                        : apenasAtendente
                        ? 'Status de balcão e atendimento permitidos (bancada restrita ao Técnico)'
                        : 'Controle total de status (ADMIN)'}
                    </span>
                  </div>

                  {ordem?.itens && ordem.itens.some((it) => !it.baixado && !it.baixadoEstoque) && (
                    <div className="mb-3.5 flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Aviso de Integridade: Há <strong>{ordem.itens.filter((it) => !it.baixado && !it.baixadoEstoque).length} peça(s)</strong> pendente(s) de baixa no estoque. O avanço para <strong>Testes Finais</strong> ou <strong>Entregue</strong> só será liberado após a baixa dos materiais na aba Peças.
                      </span>
                    </div>
                  )}

                  <form onSubmit={aoAtualizarStatus} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Novo Status *</label>
                      <select
                        value={novoStatusId}
                        onChange={(e) => {
                          setNovoStatusId(e.target.value);
                          if (erro) setErro('');
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-500 focus:outline-none"
                        required
                      >
                        <option value="">Selecione o novo status...</option>
                        {todosStatus.map((s) => {
                          const info = obterInfoStatus(s);
                          return (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={info.desabilitado}
                              className={info.desabilitado ? 'text-slate-400 bg-slate-50 italic' : 'text-slate-900 font-semibold'}
                            >
                              {s.ordem}. {s.nome} {info.sufixo ? `${info.sufixo}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observação da Transição (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Peças conferidas na bancada, aprovado para montagem..."
                        value={obsStatus}
                        onChange={(e) => setObsStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={
                          salvandoStatus ||
                          !novoStatusId ||
                          Number(novoStatusId) === Number(ordem?.statusId) ||
                          obterInfoStatus({ id: novoStatusId }).desabilitado
                        }
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {salvandoStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Atualizar'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Linha do Tempo e Evolução Técnica (RBAC, Filtros e Timeline Vertical) */}
                <OrderTimeline
                  ordemId={ordemId}
                  historico={ordem.historico || []}
                  ehTecnico={ehTecnico}
                  ehAdmin={ehAdmin}
                  ehAtendente={ehAtendente}
                  aoRecarregar={async () => {
                    await carregarDetalhes();
                    if (aoAtualizar) aoAtualizar();
                  }}
                />
              </div>
            )}

            {/* CONTEÚDO DA ABA 3: PEÇAS E INSUMOS UTILIZADOS (RF06) */}
            {abaAtiva === 'pecas' && (
              <div className="space-y-4">
                {/* Formulário de Consumo de Peça com baixa de estoque (Apenas TECNICO e ADMIN) */}
                {ehTecnico ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      Produtos utilizados para reparo
                    </h4>

                    {erroPeca && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-100">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{erroPeca}</span>
                      </div>
                    )}

                    <form onSubmit={aoAdicionarPeca} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
                      <div className="sm:col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">Produto / Peça *</label>
                          <button
                            type="button"
                            onClick={() => setModalPesquisaPecaAberto(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                          >
                            <Search className="h-3 w-3" />
                            Pesquisa Avançada
                          </button>
                        </div>
                        <select
                          value={produtoSelecionadoId}
                          onChange={(e) => aoMudarProduto(e.target.value)}
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                        >
                          <option value="">Selecione o produto...</option>
                          {produtosDisponiveis.map((p) => (
                            <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                              {p.nome} — R$ {Number(p.preco || 0).toFixed(2)} (Estoque: {p.estoque}){' '}
                              {p.estoque <= 0 ? '[ESGOTADO]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Qtd *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={qtdPeca}
                          onChange={(e) => setQtdPeca(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Preço Unit. (R$)</label>
                        <input
                          type="text"
                          placeholder="0.00"
                          value={precoPeca}
                          onChange={(e) => setPrecoPeca(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={salvandoPeca}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {salvandoPeca ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Adicionar
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                      <Package className="h-4 w-4 text-slate-400" />
                      Consulta de Peças e Insumos
                    </p>
                    O lançamento e baixa de peças do estoque são restritos a Técnicos e Administradores. A listagem abaixo é disponibilizada para visualização e composição do orçamento ao cliente.
                  </div>
                )}

                {/* Lista de Peças Consumidas */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 bg-slate-50/75 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Peças Lançadas nesta OS
                    </h4>
                    <span className="text-xs font-bold text-slate-800">
                      Subtotal Peças: {maskCurrency(ordem.totalProdutos || 0)}
                    </span>
                  </div>

                  {/* Seção Condicional de Baixa de Estoque (RF06) */}
                  {ordem.itens && ordem.itens.length > 0 && (() => {
                    const pecasPendentes = ordem.itens.filter((it) => !it.baixado && !it.baixadoEstoque);
                    const podeBaixar = (Number(ordem.statusId) === 4 || Number(ordem.statusId) === 5) && pecasPendentes.length > 0 && (ehAdmin || ehTecnico);

                    if (pecasPendentes.length > 0 && podeBaixar) {
                      return (
                        <div className="p-3 bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-900">
                              Há <strong>{pecasPendentes.length} peça(s)</strong> orçada(s) aguardando baixa. A baixa dos materiais é <strong>obrigatória</strong> para liberar o avanço da OS para Testes Finais e Entrega.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={aoBaixarEstoque}
                            disabled={salvandoBaixa}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                          >
                            {salvandoBaixa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            Dar Baixa no Estoque
                          </button>
                        </div>
                      );
                    }

                    if (pecasPendentes.length > 0 && !podeBaixar) {
                      return (
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>
                            Orçamento com <strong>{pecasPendentes.length} peça(s)</strong> pendente(s) de baixa. O botão <strong>[ Dar Baixa no Estoque ]</strong> ficará disponível assim que a OS for aprovada pelo cliente ou estiver em reparo na bancada.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="p-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Todas as peças desta Ordem de Serviço já foram devidamente baixadas no estoque.</span>
                      </div>
                    );
                  })()}

                  {!ordem.itens || ordem.itens.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma peça foi vinculada a esta Ordem de Serviço até o momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-2.5">Item / Peça</th>
                            <th className="px-4 py-2.5 text-center">Quantidade</th>
                            <th className="px-4 py-2.5 text-right">Valor Unitário</th>
                            <th className="px-4 py-2.5 text-right">Subtotal</th>
                            <th className="px-4 py-2.5 text-center">Status do Estoque</th>
                            {ehTecnico && <th className="px-4 py-2.5 text-right">Ação</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ordem.itens.map((it) => (
                            <tr key={it.id} className="transition-colors hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {it.produtoNome}
                                {it.usuarioNome && (
                                  <span className="block text-[10px] text-slate-400">
                                    Lançado por: {it.usuarioNome}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">
                                {it.quantidade} un.
                              </td>
                              <td className="px-4 py-3 text-right">
                                {maskCurrency(it.precoUnitario)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {maskCurrency(it.subtotal)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {it.baixado || it.baixadoEstoque ? (
                                  <div>
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200"
                                      title={it.baixadoEm ? `Baixado em: ${new Date(it.baixadoEm).toLocaleString('pt-BR')}` : ''}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Baixado no Estoque
                                    </span>
                                    {it.baixadoPorNome && (
                                      <span className="block text-[10px] text-emerald-700 mt-0.5">
                                        Por: {it.baixadoPorNome}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                                    <Clock className="h-3 w-3" />
                                    Orçado / Pendente
                                  </span>
                                )}
                              </td>
                              {ehTecnico && (
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => aoRemoverPeca(it.id, it.produtoNome)}
                                    className="rounded p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                                    title="Remover peça da OS"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            </div>
        )}

        {/* Rodapé Fixo do Modal */}
        <div className="flex items-center justify-end border-t border-slate-100 px-5 py-3.5 sm:px-6 bg-slate-50/75 flex-shrink-0">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>

      {/* Modal de Pesquisa Avançada de Produtos / Peças */}
      <ProductSearchModal
        aberto={modalPesquisaPecaAberto}
        aoFechar={() => setModalPesquisaPecaAberto(false)}
        aoSelecionar={(p) => {
          aoMudarProduto(p.id);
          setModalPesquisaPecaAberto(false);
        }}
      />
    </div>
  );
};

export default OrderDetailModal;
