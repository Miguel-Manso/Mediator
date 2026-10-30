import React, { useState, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  Edit2,
  EyeOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowDown,
  ShieldAlert,
} from 'lucide-react';
import { OrderKanbanCard } from './OrderKanbanCard';
import { verificarPermissaoDrop } from '../../utils/orderPermissions';

export const OrderKanbanColumn = ({
  coluna,
  cargo = '',
  verificarPermissao = null,
  aoAbrirCriacaoOS,
  aoEditarColuna,
  aoInativarColuna,
  aoReativarColuna,
  aoMoverColuna,
  posicaoColuna = { isFirst: false, isLast: false },
  aoAbrirDetalhesOS,
  aoAlternarAtivoOS,
  onDropCard,
  podeGerenciar = true,
  cardSendoArrastado = null,
  onDragStartCard,
  onDragEndCard,
}) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [estaSobre, setEstaSobre] = useState(false);
  const [estaSobreProibido, setEstaSobreProibido] = useState(false);
  const [indiceInsercao, setIndiceInsercao] = useState(null);

  // Limpeza de segurança (Ghost State): se o arrasto global foi encerrado (ex: solto no vazio),
  // reseta os estados visuais de hover e inserção da coluna para não congelar a UI.
  useEffect(() => {
    const resetLocal = () => {
      setEstaSobre(false);
      setEstaSobreProibido(false);
      setIndiceInsercao(null);
    };

    if (!cardSendoArrastado) {
      resetLocal();
    }

    window.addEventListener('dragend', resetLocal);
    window.addEventListener('mouseup', resetLocal);

    return () => {
      window.removeEventListener('dragend', resetLocal);
      window.removeEventListener('mouseup', resetLocal);
    };
  }, [cardSendoArrastado]);

  const cards = coluna.cards || [];
  const totalCards = cards.length;
  const isAtiva = coluna.isActive !== false;

  // Validação de RBAC para verificar se o usuário atual pode soltar na coluna
  const checarPermissao = () => {
    if (typeof verificarPermissao === 'function') {
      return verificarPermissao(cargo, coluna.id);
    }
    return verificarPermissaoDrop(cargo, coluna.id);
  };

  const handleDragOver = (e) => {
    const permitido = checarPermissao();
    if (!permitido) {
      e.dataTransfer.dropEffect = 'none';
      if (!estaSobreProibido) setEstaSobreProibido(true);
      if (estaSobre) setEstaSobre(false);
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (estaSobreProibido) setEstaSobreProibido(false);
    if (!estaSobre) setEstaSobre(true);
  };

  const handleCardDragOver = (e, index) => {
    const permitido = checarPermissao();
    if (!permitido) {
      e.dataTransfer.dropEffect = 'none';
      if (!estaSobreProibido) setEstaSobreProibido(true);
      if (estaSobre) setEstaSobre(false);
      setIndiceInsercao(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (estaSobreProibido) setEstaSobreProibido(false);
    if (!estaSobre) setEstaSobre(true);

    // Determina se a inserção é antes ou depois do card com base na posição vertical do mouse
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const meio = rect.height / 2;

    const novoIndice = offsetY < meio ? index : index + 1;
    setIndiceInsercao(novoIndice);
  };

  const handleDragLeave = (e) => {
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) {
      setEstaSobre(false);
      setEstaSobreProibido(false);
      setIndiceInsercao(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const permitido = checarPermissao();
    setEstaSobre(false);
    setEstaSobreProibido(false);
    const destinoIndex = indiceInsercao !== null ? indiceInsercao : cards.length;
    setIndiceInsercao(null);

    try {
      // Se não for permitido, bloqueia a execução do drop
      if (permitido) {
        onDropCard(e, coluna.id, destinoIndex);
      }
    } finally {
      // Garante limpeza visual imediata ao final da execução do drop
      setEstaSobre(false);
      setEstaSobreProibido(false);
      setIndiceInsercao(null);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col ${
        coluna.isExpandida
          ? 'w-full flex-1 min-w-[280px] sm:min-w-[320px]'
          : 'w-[82vw] max-w-[320px] sm:w-80 shrink-0'
      } rounded-2xl border transition-all duration-200 max-h-[calc(100vh-230px)] select-none ${
        estaSobreProibido
          ? 'border-rose-400 ring-2 ring-rose-300/60 bg-rose-50/50 shadow-md cursor-not-allowed scale-[1.008]'
          : estaSobre
          ? 'border-blue-400 ring-2 ring-blue-300/60 bg-blue-50/30 shadow-md scale-[1.008]'
          : isAtiva
          ? 'border-slate-200/90 bg-slate-50/70 shadow-xs'
          : 'border-dashed border-slate-300 bg-slate-100/60 opacity-65'
      }`}
    >
      {/* CABEÇALHO DA COLUNA */}
      <div className="flex items-center justify-between gap-2 p-3.5 border-b border-slate-200/70 bg-white/70 rounded-t-2xl backdrop-blur-xs">
        {/* Lado Esquerdo: Tag do Status e Contador */}
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white truncate shadow-xs max-w-[170px]"
            style={{ backgroundColor: coluna.color || '#3B82F6' }}
            title={coluna.title || coluna.nome}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" />
            <span className="truncate">{coluna.title || coluna.nome}</span>
          </span>

          {!isAtiva && (
            <span className="rounded bg-slate-200/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 shrink-0">
              Inativa
            </span>
          )}

          {/* Contador estilizado recalculado em tempo real */}
          <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700 shrink-0">
            {totalCards}
          </span>
        </div>

        {/* Lado Direito: Ação Rápida de Adicionar OS e Menu de Ações da Coluna */}
        <div className="flex items-center gap-1 shrink-0">
          {podeGerenciar && (
            <button
              type="button"
              onClick={() => aoAbrirCriacaoOS(coluna.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              title={`Criar nova OS diretamente na etapa "${coluna.title || coluna.nome}"`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {/* Menu Dropdown de Gerenciamento da Coluna */}
          {podeGerenciar && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAberto((prev) => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                title="Opções da Coluna"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuAberto && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuAberto(false)}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-1 border-b border-slate-100 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Gestão da Coluna
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        aoEditarColuna(coluna);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                      Editar Coluna
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        aoMoverColuna(coluna.id, 'esquerda');
                      }}
                      disabled={posicaoColuna.isFirst}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                      Mover para Esquerda
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        aoMoverColuna(coluna.id, 'direita');
                      }}
                      disabled={posicaoColuna.isLast}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      Mover para Direita
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    {isAtiva ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAberto(false);
                          aoInativarColuna(coluna);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                      >
                        <EyeOff className="h-3.5 w-3.5 text-rose-500" />
                        Inativar Coluna
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAberto(false);
                          aoReativarColuna(coluna);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Reativar Coluna
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO DA COLUNA COM SCROLL VERTICAL INDEPENDENTE E DROP ZONES */}
      <div
        className={`flex-1 overflow-y-auto p-3 min-h-[140px] ${
          coluna.isExpandida
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 content-start'
            : 'space-y-3'
        }`}
      >
        {totalCards === 0 ? (
          estaSobreProibido ? (
            /* Indicador de Drop Proibido em Coluna Vazia */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border-2 border-dashed border-rose-400 bg-rose-50/80 text-rose-700 animate-in fade-in zoom-in-95 duration-150">
              <ShieldAlert className="h-7 w-7 text-rose-600 mb-1.5 animate-pulse" />
              <p className="text-xs font-bold text-rose-900">Acesso restrito para o seu perfil</p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Você não pode mover OS para {coluna.title || coluna.nome}
              </p>
            </div>
          ) : estaSobre ? (
            /* Indicador de Drop em Coluna Vazia */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 text-blue-700 animate-pulse">
              <ArrowDown className="h-6 w-6 mb-1.5 text-blue-600 animate-bounce" />
              <p className="text-xs font-bold text-blue-900">Solte a OS aqui</p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                Mover para {coluna.title || coluna.nome}
              </p>
            </div>
          ) : (
            /* Empty state padrão */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200/80 bg-white/40">
              <Inbox className="h-7 w-7 text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">Nenhuma OS nesta etapa</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Arraste um card para cá ou clique em + para abrir uma OS
              </p>
            </div>
          )
        ) : (
          <>
            {/* Slot ou Banner de Drop Proibido no topo quando há cards */}
            {estaSobreProibido && (
              <div className="rounded-xl border-2 border-dashed border-rose-400 bg-rose-50/90 p-3 flex items-center justify-center gap-2 text-rose-700 shadow-xs animate-in fade-in duration-150">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 animate-pulse" />
                <span className="text-xs font-bold text-rose-800">
                  Acesso restrito para o seu perfil
                </span>
              </div>
            )}

            {cards.map((card, index) => {
              const isOriginalDragged = cardSendoArrastado && String(cardSendoArrastado.osId) === String(card.id);
              const showDropSlot = estaSobre && !estaSobreProibido && indiceInsercao === index;

              return (
                <React.Fragment key={card.id}>
                  {/* Linha/Slot Indicador de Inserção entre Cards */}
                  {showDropSlot && (
                    <div className="h-10 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 animate-pulse transition-all">
                      <ArrowDown className="h-3.5 w-3.5" />
                      <span>Inserir nesta posição</span>
                    </div>
                  )}

                  <div
                    onDragOver={(e) => handleCardDragOver(e, index)}
                    className="transition-all"
                  >
                    <OrderKanbanCard
                      os={card}
                      corColuna={coluna.color}
                      indice={index}
                      colunaId={coluna.id}
                      aoAbrirDetalhes={aoAbrirDetalhesOS}
                      aoAlternarAtivo={aoAlternarAtivoOS}
                      podeGerenciar={podeGerenciar}
                      onDragStartCard={onDragStartCard}
                      onDragEndCard={onDragEndCard}
                      estaArrastando={isOriginalDragged}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Slot de inserção caso o mouse esteja no final da lista com cards */}
        {totalCards > 0 && estaSobre && !estaSobreProibido && indiceInsercao >= totalCards && (
          <div className="h-10 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 animate-pulse transition-all">
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Inserir no final desta coluna</span>
          </div>
        )}
      </div>
    </div>
  );
};
