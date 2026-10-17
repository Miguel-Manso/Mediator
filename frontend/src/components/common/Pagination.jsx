import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente reutilizável de Paginação Clássica Numerada.
 * Suporta navegação por abas/números, reticências inteligentes e contador de registros.
 *
 * @param {Object} props
 * @param {number} props.paginaAtual - Página ativa (1-indexed)
 * @param {number} props.totalPaginas - Total de páginas disponíveis
 * @param {number} [props.totalRegistros] - Total de registros retornados pelo backend
 * @param {number} [props.limite] - Quantidade de registros por página
 * @param {function} props.aoMudarPagina - Callback invocado com a nova página selecionada
 */
export const Pagination = ({
  paginaAtual = 1,
  totalPaginas = 1,
  totalRegistros = null,
  limite = 10,
  aoMudarPagina,
}) => {
  if (totalPaginas <= 1 && (!totalRegistros || totalRegistros <= limite)) {
    return null;
  }

  // Gera a lista de números e reticências a serem exibidos
  const gerarBotoesPagina = () => {
    const paginas = [];
    const delta = 1; // páginas ao redor da página atual

    const rangeMin = Math.max(2, paginaAtual - delta);
    const rangeMax = Math.min(totalPaginas - 1, paginaAtual + delta);

    // Sempre inclui a primeira página
    paginas.push(1);

    // Reticência antes do meio
    if (rangeMin > 2) {
      paginas.push('...');
    }

    // Intervalo do meio
    for (let i = rangeMin; i <= rangeMax; i++) {
      paginas.push(i);
    }

    // Reticência depois do meio
    if (rangeMax < totalPaginas - 1) {
      paginas.push('...');
    }

    // Sempre inclui a última página
    if (totalPaginas > 1) {
      paginas.push(totalPaginas);
    }

    return paginas;
  };

  const registroInicial = totalRegistros ? Math.min((paginaAtual - 1) * limite + 1, totalRegistros) : null;
  const registroFinal = totalRegistros ? Math.min(paginaAtual * limite, totalRegistros) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white select-none">
      {/* Indicador de registros exibidos */}
      <div className="text-xs text-slate-500">
        {totalRegistros !== null ? (
          <span>
            Exibindo <span className="font-semibold text-slate-700">{registroInicial}</span> a{' '}
            <span className="font-semibold text-slate-700">{registroFinal}</span> de{' '}
            <span className="font-semibold text-slate-700">{totalRegistros}</span> registros
          </span>
        ) : (
          <span>
            Página <span className="font-semibold text-slate-700">{paginaAtual}</span> de{' '}
            <span className="font-semibold text-slate-700">{totalPaginas}</span>
          </span>
        )}
      </div>

      {/* Controles de Navegação por Números */}
      <nav aria-label="Paginação" className="inline-flex items-center gap-1">
        {/* Botão Anterior */}
        <button
          type="button"
          onClick={() => aoMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual <= 1}
          aria-label="Página anterior"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números das Páginas */}
        <div className="flex items-center gap-1">
          {gerarBotoesPagina().map((item, idx) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-slate-400 font-semibold"
                >
                  ...
                </span>
              );
            }

            const ehAtiva = item === paginaAtual;

            return (
              <button
                key={`page-${item}`}
                type="button"
                onClick={() => aoMudarPagina(item)}
                aria-current={ehAtiva ? 'page' : undefined}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition ${
                  ehAtiva
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 bg-white'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Botão Próxima */}
        <button
          type="button"
          onClick={() => aoMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual >= totalPaginas}
          aria-label="Próxima página"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
