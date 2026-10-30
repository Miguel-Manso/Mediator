import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

/**
 * Componente SearchableCombobox
 * 
 * Substitui comboboxes padrão (<select>) por uma experiência otimizada
 * com busca dinâmica em tempo real, navegação fluida para grandes volumes de dados (100+ registros),
 * indicador visual de seleção e botão rápido para limpar filtro.
 */
export const SearchableCombobox = ({
  value = '',
  onChange,
  options = [],
  valueKey = 'id',
  labelKey = 'nome',
  sublabelKey = null,
  corKey = null,
  formatLabel = null,
  placeholder = 'Selecione uma opção',
  searchPlaceholder = 'Digitar para buscar...',
  icon: Icon = null,
  disabled = false,
  className = '',
  buttonClassName = '',
}) => {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef(null);
  const inputBuscaRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };

    if (aberto) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [aberto]);

  // Foca no input de busca ao abrir
  useEffect(() => {
    if (aberto && inputBuscaRef.current) {
      inputBuscaRef.current.focus();
    } else {
      setTermoBusca('');
    }
  }, [aberto]);

  // Fecha com a tecla Escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const getRotulo = (opt) => {
    if (!opt) return '';
    if (typeof formatLabel === 'function') {
      return formatLabel(opt);
    }
    return String(opt[labelKey] || '');
  };

  // Encontra o item selecionado
  const itemSelecionado = useMemo(() => {
    if (!value && value !== 0 && value !== '0') return null;
    return (options || []).find((opt) => String(opt[valueKey]) === String(value)) || null;
  }, [options, value, valueKey]);

  // Filtra as opções em tempo real de acordo com o termo digitado
  const opcoesFiltradas = useMemo(() => {
    const termo = (termoBusca || '').trim().toLowerCase();
    if (!termo) return options || [];

    return (options || []).filter((opt) => {
      const rotulo = getRotulo(opt).toLowerCase();
      const subRotulo = sublabelKey ? String(opt[sublabelKey] || '').toLowerCase() : '';
      return rotulo.includes(termo) || subRotulo.includes(termo);
    });
  }, [options, termoBusca, labelKey, sublabelKey, formatLabel]);

  const handleSelecionar = (opt) => {
    const novoValor = opt ? String(opt[valueKey]) : '';
    if (onChange) {
      onChange(novoValor);
    }
    setAberto(false);
  };

  const handleLimpar = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setAberto(false);
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative ${className}`}
    >
      {/* Botão Gatilho / Visualizador da Seleção Atual */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 rounded-lg border bg-white py-2 px-2.5 text-xs text-left transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${
          aberto
            ? 'border-slate-500 bg-white ring-1 ring-slate-400'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}

          {itemSelecionado ? (
            <div className="flex items-center gap-1.5 truncate">
              {corKey && itemSelecionado[corKey] && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: itemSelecionado[corKey] }}
                />
              )}
              <span className="font-medium text-slate-800 truncate">
                {getRotulo(itemSelecionado)}
              </span>
              {sublabelKey && itemSelecionado[sublabelKey] && (
                <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                  ({itemSelecionado[sublabelKey]})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {itemSelecionado && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleLimpar}
              title="Limpar seleção"
              className="p-0.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${
              aberto ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown com Campo de Busca e Lista Filtrada */}
      {aberto && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[260px] max-w-[360px] rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          {/* Input de Busca Rápida */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputBuscaRef}
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:outline-none"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Contador de Itens */}
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>{opcoesFiltradas.length} opções</span>
              {termoBusca && <span>Filtrando por "{termoBusca}"</span>}
            </div>
          </div>

          {/* Lista de Opções Rolável */}
          <div className="max-h-56 overflow-y-auto py-1 scroll-smooth">
            {/* Opção Padrão: (Todos) */}
            <button
              type="button"
              onClick={() => handleSelecionar(null)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition hover:bg-slate-100 ${
                !itemSelecionado ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-600'
              }`}
            >
              <span>{placeholder}</span>
              {!itemSelecionado && <Check className="h-3.5 w-3.5 text-slate-900" />}
            </button>

            {opcoesFiltradas.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400">
                Nenhum resultado encontrado
              </div>
            ) : (
              opcoesFiltradas.map((opt) => {
                const isSelected = itemSelecionado && String(itemSelecionado[valueKey]) === String(opt[valueKey]);
                const rotuloExibicao = getRotulo(opt);

                return (
                  <button
                    key={String(opt[valueKey])}
                    type="button"
                    onClick={() => handleSelecionar(opt)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition hover:bg-slate-100 ${
                      isSelected ? 'bg-slate-100/80 font-bold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {corKey && opt[corKey] && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: opt[corKey] }}
                        />
                      )}
                      <div className="truncate">
                        <p className="truncate leading-tight">{rotuloExibicao}</p>
                        {sublabelKey && opt[sublabelKey] && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {opt[sublabelKey]}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-slate-900 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
