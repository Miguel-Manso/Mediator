import React from 'react';
import {
  Filter,
  RotateCcw,
  Search,
  Calendar,
  User,
  Wrench,
  UserCheck,
  Tag,
  CheckCircle2,
  X,
} from 'lucide-react';
import { SearchableCombobox } from '../common/SearchableCombobox';

export const AdvancedFilterPanel = ({
  aberto,
  aoFechar,
  filtros,
  onChange,
  onAplicar,
  onLimpar,
  auxiliares = {},
  totalAtivos = 0,
}) => {
  if (!aberto) return null;

  const {
    clientes = [],
    tecnicos = [],
    atendentes = [],
    status = [],
    servicos = [],
  } = auxiliares;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAplicar();
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Painel de Filtros Avançados
            </h3>
            <p className="text-[11px] text-slate-500">
              Combine múltiplos parâmetros simultaneamente para refinar as ordens de serviço.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {totalAtivos > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
              {totalAtivos} {totalAtivos === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
          )}
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            title="Fechar painel de filtros"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 items-end">
        {/* 1. Cliente com Busca Otimizada */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <User className="h-3 w-3 text-slate-400 shrink-0" />
            Cliente
          </label>
          <SearchableCombobox
            value={filtros.clienteId || ''}
            onChange={(val) => onChange('clienteId', val)}
            options={clientes}
            valueKey="id"
            labelKey="nome"
            sublabelKey="cpf"
            placeholder="Todos os clientes"
            searchPlaceholder="Buscar por nome ou CPF..."
            icon={User}
          />
        </div>

        {/* 2. Técnico com Busca Otimizada */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Wrench className="h-3 w-3 text-slate-400 shrink-0" />
            Técnico
          </label>
          <SearchableCombobox
            value={filtros.tecnicoId || ''}
            onChange={(val) => onChange('tecnicoId', val)}
            options={tecnicos}
            valueKey="id"
            labelKey="nome"
            placeholder="Todos os técnicos"
            searchPlaceholder="Buscar técnico..."
            icon={Wrench}
          />
        </div>

        {/* 3. Atendente com Busca Otimizada */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
            Atendente
          </label>
          <SearchableCombobox
            value={filtros.atendenteId || ''}
            onChange={(val) => onChange('atendenteId', val)}
            options={atendentes}
            valueKey="id"
            labelKey="nome"
            placeholder="Todos os atendentes"
            searchPlaceholder="Buscar atendente..."
            icon={UserCheck}
          />
        </div>

        {/* 4. Tipo de Serviço / Reparo */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Tag className="h-3 w-3 text-slate-400 shrink-0" />
            Tipo de Serviço
          </label>
          <input
            type="text"
            list="servicos-datalist"
            placeholder="Ex: Manutenção, Formatação..."
            value={filtros.tipoServico || ''}
            onChange={(e) => onChange('tipoServico', e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-slate-400 focus:outline-none"
          />
          <datalist id="servicos-datalist">
            {servicos.map((s) => (
              <option key={s.id} value={s.nome} />
            ))}
            <option value="Manutenção Preventiva / Limpeza" />
            <option value="Manutenção Corretiva" />
            <option value="Troca de Componente / Peça" />
            <option value="Formatação e Instalação de SO" />
            <option value="Remoção de Vírus e Otimização" />
            <option value="Reparo em Placa / Eletrônica" />
            <option value="Upgrade de Hardware" />
          </datalist>
        </div>

        {/* 5. Status da OS com Busca Otimizada e Cor */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
            Status da OS
          </label>
          <SearchableCombobox
            value={filtros.statusId || ''}
            onChange={(val) => onChange('statusId', val)}
            options={status}
            valueKey="id"
            labelKey="nome"
            corKey="cor"
            formatLabel={(st) => `${st.ordem ? `${st.ordem}. ` : ''}${st.nome}`}
            placeholder="Todos os status"
            searchPlaceholder="Buscar status..."
            icon={CheckCircle2}
          />
        </div>

        {/* 6. Período de Entrada (Início / Fim) */}
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
            Data de Entrada
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              title="Data Início"
              value={filtros.dataInicio || ''}
              onChange={(e) => onChange('dataInicio', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] text-slate-700 transition focus:border-slate-400 focus:outline-none"
            />
            <input
              type="date"
              title="Data Fim"
              value={filtros.dataFim || ''}
              onChange={(e) => onChange('dataFim', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 px-2 text-[11px] text-slate-700 transition focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Barra de Ações do Painel */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3.5">
        <button
          type="button"
          onClick={onLimpar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          Limpar Filtros
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAplicar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <Search className="h-3.5 w-3.5" />
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};
