import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, Loader2 } from 'lucide-react';
import { OrderKanbanColumn } from './OrderKanbanColumn';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

export const OrderKanban = ({
  colunas = [],
  carregando = false,
  aoMoverCard,
  aoAdicionarColuna,
  aoEditarColuna,
  aoInativarColuna,
  aoReativarColuna,
  aoMoverColuna,
  aoAbrirCriacaoOS,
  aoAbrirDetalhesOS,
  aoAlternarAtivoOS,
  podeGerenciar = true,
  filtroInativas = false,
  cargo,
}) => {
  const { usuario, user, cargo: cargoContext } = useAuth();
  const usuarioLogado = usuario || user;
  const cargoEfetivo = cargo || cargoContext || usuarioLogado?.cargo || usuarioLogado?.role || '';
  const { socket } = useSocket();

  // Estado local das colunas para reflexão instantânea em tempo real via Socket.io
  const [colunasLocais, setColunasLocais] = useState(colunas);

  // Sincroniza sempre que as colunas pai sofrerem recarregamento
  useEffect(() => {
    setColunasLocais(colunas);
  }, [colunas]);

  // Escuta movimentações de cards emitidas pelo servidor Socket.io em tempo real
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_kanban');

    const handleStatusAtualizado = (payload) => {
      const osId = payload?.osId || payload?.ordemId;
      const novoStatusId = payload?.novoStatusId;
      const origemStatusId = payload?.origemStatusId || payload?.statusAnteriorId;
      const ordemIndex = payload?.ordemIndex;
      const ordem = payload?.ordem;
      const usuarioIdEvento = payload?.usuarioId;

      if (!osId || !novoStatusId) return;

      // Prevenção de "pulos" de UI: ignora evento caso o próprio usuário logado tenha feito a movimentação
      if (
        usuarioIdEvento &&
        usuarioLogado?.id &&
        String(usuarioIdEvento) === String(usuarioLogado.id)
      ) {
        return;
      }

      setColunasLocais((prevColunas) => {
        let cardAlvo = null;

        // 1. Remove o card da coluna de origem (ou de qualquer coluna onde esteja presente)
        const colunasSemCard = prevColunas.map((col) => {
          const cardsFiltrados = (col.cards || []).filter((c) => {
            if (String(c.id) === String(osId)) {
              cardAlvo = { ...c, statusId: Number(novoStatusId) };
              return false;
            }
            return true;
          });
          return { ...col, cards: cardsFiltrados };
        });

        // Mescla os dados mais recentes se o payload trouxer o objeto completo da ordem
        const cardFinal = ordem ? { ...cardAlvo, ...ordem, statusId: Number(novoStatusId) } : cardAlvo;
        if (!cardFinal) return prevColunas;

        // 2. Insere o card na nova coluna correspondente e atualiza contadores instantaneamente
        return colunasSemCard.map((col) => {
          if (Number(col.id) === Number(novoStatusId)) {
            const novosCards = [...(col.cards || [])];
            const indiceDestino =
              ordemIndex !== undefined && ordemIndex !== null && Number(ordemIndex) >= 0
                ? Math.min(Number(ordemIndex), novosCards.length)
                : 0;

            novosCards.splice(indiceDestino, 0, cardFinal);
            return { ...col, cards: novosCards };
          }
          return col;
        });
      });
    };

    const handleNovaOS = (payload) => {
      const novaOS = payload?.ordem;
      if (!novaOS) return;
      const statusIdDestino = Number(novaOS.statusId) || 1;

      setColunasLocais((prevColunas) => {
        return prevColunas.map((col) => {
          if (Number(col.id) === statusIdDestino) {
            if ((col.cards || []).some((c) => String(c.id) === String(novaOS.id))) {
              return col;
            }
            return {
              ...col,
              cards: [novaOS, ...(col.cards || [])],
            };
          }
          return col;
        });
      });
    };

    socket.on('os_status_atualizado', handleStatusAtualizado);
    socket.on('os_criada', handleNovaOS);

    return () => {
      socket.off('os_status_atualizado', handleStatusAtualizado);
      socket.off('os_criada', handleNovaOS);
    };
  }, [socket, usuarioLogado?.id]);

  // Estado compartilhado do card que está sendo ativamente arrastado
  const [cardSendoArrastado, setCardSendoArrastado] = useState(null);

  // Início do arrasto
  const handleDragStartCard = (payload) => {
    setCardSendoArrastado(payload);
  };

  // Término do arrasto (seja por drop ou cancelamento)
  const handleDragEndCard = () => {
    setCardSendoArrastado(null);
  };

  // Trava de segurança global no Window (Bulletproof Cleanup):
  // Garante que se o usuário soltar o card no vazio ou fora de zonas válidas, o estado é resetado imediatamente
  useEffect(() => {
    const limparEstadoArrasto = () => {
      setCardSendoArrastado(null);
    };

    window.addEventListener('dragend', limparEstadoArrasto);
    window.addEventListener('mouseup', limparEstadoArrasto);

    return () => {
      window.removeEventListener('dragend', limparEstadoArrasto);
      window.removeEventListener('mouseup', limparEstadoArrasto);
    };
  }, []);

  // Lida com a soltura (drop) do card na coluna alvo em um índice específico
  const handleDropCard = (e, destinoColunaId, destinoIndex) => {
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) {
        setCardSendoArrastado(null);
        return;
      }
      const data = JSON.parse(dataStr);
      if (data && data.osId) {
        setCardSendoArrastado(null);
        aoMoverCard(data.osId, data.origemStatusId, destinoColunaId, destinoIndex);
      }
    } catch (err) {
      console.error('Falha ao processar soltura do card:', err);
      setCardSendoArrastado(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-xs font-semibold text-slate-600">Carregando esteira Kanban...</p>
        </div>
      </div>
    );
  }

  if (colunasLocais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm">
        <LayoutGrid className="h-12 w-12 text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-800">Nenhuma etapa configurada</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Crie sua primeira etapa para organizar o fluxo de Ordens de Serviço no quadro Kanban.
        </p>
        {podeGerenciar && (
          <button
            type="button"
            onClick={aoAdicionarColuna}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Plus className="h-4 w-4" />
            Adicionar Primeira Coluna
          </button>
        )}
      </div>
    );
  }

  const ehUnicaColuna = colunasLocais.length === 1 && Boolean(colunasLocais[0]?.isExpandida);

  return (
    <div className="relative">
      {/* ESTEIRA DO KANBAN: EXPANDIDA EM COLUNA ÚNICA OU SCROLL HORIZONTAL MULTI-COLUNAS */}
      <div className={`flex items-start gap-4 pb-4 pt-1 px-1 ${ehUnicaColuna ? 'w-full' : 'overflow-x-auto scroll-smooth'}`}>
        {colunasLocais.map((coluna, index) => (
          <OrderKanbanColumn
            key={coluna.id}
            coluna={coluna}
            cargo={cargoEfetivo}
            aoAbrirCriacaoOS={aoAbrirCriacaoOS}
            aoEditarColuna={aoEditarColuna}
            aoInativarColuna={aoInativarColuna}
            aoReativarColuna={aoReativarColuna}
            aoMoverColuna={aoMoverColuna}
            posicaoColuna={{
              isFirst: index === 0,
              isLast: index === colunasLocais.length - 1,
            }}
            aoAbrirDetalhesOS={aoAbrirDetalhesOS}
            aoAlternarAtivoOS={aoAlternarAtivoOS}
            onDropCard={handleDropCard}
            podeGerenciar={podeGerenciar}
            filtroInativas={filtroInativas}
            cardSendoArrastado={cardSendoArrastado}
            onDragStartCard={handleDragStartCard}
            onDragEndCard={handleDragEndCard}
          />
        ))}

        {/* BOTÃO "+ ADICIONAR COLUNA" NO FINAL DA ESTEIRA (apenas no modo geral com todas as colunas) */}
        {podeGerenciar && !ehUnicaColuna && (
          <div className="shrink-0 w-72">
            <button
              type="button"
              onClick={aoAdicionarColuna}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-500 hover:border-slate-400 hover:bg-white hover:text-slate-800 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition">
                <Plus className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-semibold">Adicionar Nova Coluna</span>
              <span className="text-[10px] text-slate-400">Criar nova etapa de status</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
