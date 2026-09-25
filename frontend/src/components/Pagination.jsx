import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

/**
 * Componente reutilizável de paginação com seletor de limite e controles acessíveis.
 * 
 * @param {Object} props
 * @param {number} props.pagina - Página atual (1-indexada)
 * @param {number} props.totalPaginas - Total de páginas calculadas
 * @param {number} props.limite - Quantidade de itens por página
 * @param {number} props.total - Quantidade total de registros
 * @param {function(number): void} props.onMudarPagina - Callback disparado ao trocar de página
 * @param {function(number): void} [props.onMudarLimite] - Callback disparado ao alterar o limite de itens
 * @param {number[]} [props.opcoesLimite] - Lista de opções de limite (padrão: [5, 10, 20, 50])
 */
export const Pagination = ({
  pagina = 1,
  totalPaginas = 1,
  limite = 10,
  total = 0,
  onMudarPagina,
  onMudarLimite,
  opcoesLimite = [5, 10, 20, 50],
}) => {
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-600">
      {/* Seletor de quantidade e indicador de total de registros */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-slate-700">
          <strong className="text-slate-900 font-semibold">{total}</strong> {total === 1 ? 'item no total' : 'itens no total'}
        </span>

        {onMudarLimite && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-slate-500">Exibir:</span>
            <select
              value={limite}
              onChange={(e) => onMudarLimite(Number(e.target.value))}
              aria-label="Itens por página"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
            >
              {opcoesLimite.map((op) => (
                <option key={op} value={op}>
                  {op} por página
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="flex items-center gap-2 self-center sm:self-auto">
        {/* Primeira Página (atalho opcional caso muitas páginas) */}
        {totalPaginas > 3 && (
          <button
            type="button"
            onClick={() => onMudarPagina(1)}
            disabled={pagina <= 1}
            title="Primeira página"
            aria-label="Primeira página"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}

        {/* Página Anterior */}
        <button
          type="button"
          onClick={() => onMudarPagina(pagina - 1)}
          disabled={pagina <= 1}
          title="Página anterior"
          aria-label="Página anterior"
          className="inline-flex h-8 items-center gap-1 px-2.5 rounded border border-slate-200 bg-white text-slate-700 font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Texto central: Página X de Y */}
        <span className="text-xs font-semibold text-slate-700 px-1 whitespace-nowrap">
          Página <strong className="text-slate-900">{pagina}</strong> de <strong className="text-slate-900">{totalPaginas}</strong>
        </span>

        {/* Próxima Página */}
        <button
          type="button"
          onClick={() => onMudarPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          title="Próxima página"
          aria-label="Próxima página"
          className="inline-flex h-8 items-center gap-1 px-2.5 rounded border border-slate-200 bg-white text-slate-700 font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Última Página (atalho opcional caso muitas páginas) */}
        {totalPaginas > 3 && (
          <button
            type="button"
            onClick={() => onMudarPagina(totalPaginas)}
            disabled={pagina >= totalPaginas}
            title="Última página"
            aria-label="Última página"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
