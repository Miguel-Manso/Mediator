import React, { useState } from 'react';
import {
  Calendar,
  Phone,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Printer,
  Cpu,
  Wrench,
  User,
  Eye,
  MoreVertical,
  Copy,
  Check,
  XCircle,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { maskCurrency } from '../../utils/masks';

// Função para inferir o ícone adequado para o equipamento
const getEquipamentoIcone = (descricao = '', categoria = '') => {
  const texto = `${descricao} ${categoria}`.toLowerCase();
  if (texto.includes('notebook') || texto.includes('laptop') || texto.includes('macbook')) {
    return Laptop;
  }
  if (texto.includes('tablet') || texto.includes('ipad')) {
    return Tablet;
  }
  if (texto.includes('celular') || texto.includes('smartphone') || texto.includes('iphone') || texto.includes('galaxy')) {
    return Smartphone;
  }
  if (texto.includes('monitor') || texto.includes('tela') || texto.includes('tv')) {
    return Monitor;
  }
  if (texto.includes('impressora') || texto.includes('scanner')) {
    return Printer;
  }
  if (texto.includes('desktop') || texto.includes('pc') || texto.includes('computador') || texto.includes('gabinete')) {
    return Cpu;
  }
  return Wrench;
};

export const OrderKanbanCard = ({
  os,
  corColuna,
  indice,
  colunaId,
  aoAbrirDetalhes,
  aoAlternarAtivo,
  podeGerenciar = true,
  onDragStartCard,
  onDragEndCard,
  estaArrastando = false,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const IconeEquipamento = getEquipamentoIcone(os.equipamentoDescricao, os.categoriaNome);

  // Formatação da data
  const dataAbertura = os.abertoEm
    ? new Date(os.abertoEm).toLocaleDateString('pt-BR')
    : '--/--/----';

  const copiarNumero = (e) => {
    e.stopPropagation();
    if (os.numeroOrdem) {
      navigator.clipboard.writeText(os.numeroOrdem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      setMenuAberto(false);
    }
  };

  const handleDragStart = (e) => {
    // Define os dados de transferência
    const payload = {
      osId: os.id,
      origemStatusId: colunaId,
      indiceOrigem: indice,
      numeroOrdem: os.numeroOrdem,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';

    if (onDragStartCard) {
      onDragStartCard(payload);
    }
  };

  const handleDragEnd = (e) => {
    if (e?.dataTransfer) {
      try {
        e.dataTransfer.clearData();
      } catch (err) {
        // Ignora restrições do navegador ao manipular dataTransfer no evento dragend
      }
    }
    if (onDragEndCard) {
      onDragEndCard();
    }
  };

  const valorPecas = os.totalProdutos ? Number(os.totalProdutos) : 0;

  // Se este card está sendo arrastado atualmente, exibe o placeholder sutil preservando o draggable e onDragEnd
  if (estaArrastando) {
    return (
      <div
        draggable={true}
        onDragEnd={handleDragEnd}
        className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-100/70 p-4 transition-all duration-150 min-h-[140px] flex flex-col items-center justify-center text-center select-none"
      >
        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-200/80 px-2.5 py-1 rounded-md">
          {os.numeroOrdem}
        </span>
        <span className="text-[11px] font-medium text-slate-400 mt-2">
          Movendo Ordem de Serviço...
        </span>
      </div>
    );
  }

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => aoAbrirDetalhes(os.id)}
      className={`group relative rounded-xl border bg-white p-3.5 shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 active:shadow-xl active:rotate-1 ${
        !os.ativo ? 'opacity-70 bg-slate-50/80' : ''
      } border-slate-200/90 select-none`}
    >
      {/* Indicador de cor da coluna na borda esquerda */}
      <span
        className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full transition-all group-hover:w-2"
        style={{ backgroundColor: corColuna || '#3B82F6' }}
      />

      {/* TOPO: Grip Handle, Número da OS e Data de Abertura */}
<<<<<<< HEAD
      <div className="flex items-center justify-between gap-2 pl-3 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Grip visual indicador de arrasto */}
          <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />

          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
            {os.numeroOrdem}
          </span>
          {!os.ativo && (
            <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 shrink-0">
=======
      <div className="flex items-center justify-between gap-2 pl-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          {/* Grip visual indicador de arrasto */}
          <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />

          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/60">
            {os.numeroOrdem}
          </span>
          {!os.ativo && (
            <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-rose-600">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
              Inativa
            </span>
          )}
        </div>

<<<<<<< HEAD
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 shrink-0">
          <Calendar className="h-3 w-3 shrink-0" />
=======
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Calendar className="h-3 w-3" />
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          <span>{dataAbertura}</span>
        </div>
      </div>

      {/* MEIO: Informações do Cliente e Equipamento */}
<<<<<<< HEAD
      <div className="space-y-2 pl-3 my-2.5">
=======
      <div className="space-y-1.5 pl-1.5 my-2.5">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
        {/* Cliente */}
        <div>
          <p className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {os.clienteNome || 'Cliente não identificado'}
          </p>
          {os.clienteTelefone && (
<<<<<<< HEAD
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Phone className="h-2.5 w-2.5 shrink-0" />
=======
            <p className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Phone className="h-2.5 w-2.5" />
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
              <span>{os.clienteTelefone}</span>
            </p>
          )}
        </div>

        {/* Equipamento */}
<<<<<<< HEAD
        <div className="flex items-center gap-2 rounded-lg bg-slate-50/80 border border-slate-100 px-2.5 py-1.5 text-slate-700">
=======
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50/80 border border-slate-100 px-2 py-1.5 text-slate-700">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          <IconeEquipamento className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="text-[11px] font-medium truncate">
            {os.equipamentoDescricao || 'Equipamento'}
          </span>
          {os.marcaNome && (
<<<<<<< HEAD
            <span className="ml-auto text-[10px] font-medium text-slate-400 shrink-0 pl-1">
=======
            <span className="ml-auto text-[10px] font-medium text-slate-400 shrink-0">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
              {os.marcaNome}
            </span>
          )}
        </div>
      </div>

      {/* RODAPÉ: Técnico, Valor de Peças, Ações */}
<<<<<<< HEAD
      <div className="flex items-center justify-between gap-2 border-t border-slate-100/80 pt-2.5 mt-2.5 pl-3">
=======
      <div className="flex items-center justify-between border-t border-slate-100/80 pt-2.5 mt-2.5 pl-1.5">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
        {/* Técnico */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
            {os.tecnicoNome ? (
              os.tecnicoNome.charAt(0).toUpperCase()
            ) : (
              <User className="h-3 w-3 text-slate-400" />
            )}
          </div>
          <span className="truncate text-[11px] font-medium text-slate-600">
            {os.tecnicoNome ? os.tecnicoNome.split(' ')[0] : <span className="italic text-slate-400 text-[10px]">Não atribuído</span>}
          </span>
        </div>

        {/* Total e Ações */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">
            {maskCurrency(valorPecas)}
          </span>

          {/* Atalho rápido Detalhes: onMouseDown previne drag acidental */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              aoAbrirDetalhes(os.id);
            }}
            className="flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 transition"
            title="Ver detalhes da OS"
          >
            <Eye className="h-3 w-3" />
            <span>Detalhes</span>
          </button>

          {/* Menu contextual: onMouseDown previne drag acidental */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAberto((prev) => !prev);
              }}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Mais opções"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {menuAberto && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuAberto(false);
                  }}
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-full mb-1 z-30 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      aoAbrirDetalhes(os.id);
                      setMenuAberto(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                    Abrir Detalhes
                  </button>

                  <button
                    type="button"
                    onClick={copiarNumero}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-medium">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        Copiar Número
                      </>
                    )}
                  </button>

                  {podeGerenciar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        setMenuAberto(false);
                        aoAlternarAtivo(os.id, os.ativo);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition border-t border-slate-100 ${
                        os.ativo
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {os.ativo ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Inativar OS
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reativar OS
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
