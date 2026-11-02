import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Filter,
  Calendar,
  User,
  Wrench,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { maskCurrency } from '../utils/masks';
import { SearchableCombobox } from '../components/common/SearchableCombobox';

export const ReportsPage = () => {
  // Parâmetros de Filtro
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [tipoReparo, setTipoReparo] = useState('');
  const [agrupamento, setAgrupamento] = useState('cliente'); // 'cliente' | 'tecnico' | 'status' | 'geral'

  // Dados Auxiliares para Combos
  const [auxiliares, setAuxiliares] = useState({
    clientes: [],
    tecnicos: [],
    status: [],
  });

  // Estado do Relatório
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [itensExpandidos, setItensExpandidos] = useState({});

  // Toast
  const [toast, setToast] = useState(null);
  const exibirToast = (mensagem, tipo = 'erro') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4500);
  };

  // Carrega opções auxiliares
  useEffect(() => {
    const carregarAuxiliares = async () => {
      try {
        const res = await api.get('/ordens-servico/auxiliares');
        setAuxiliares(res.data || {});
      } catch (err) {
        console.error('Erro ao carregar opções para o relatório:', err);
      }
    };
    carregarAuxiliares();
  }, []);

  // Executa geração de relatório
  const gerarRelatorio = async (e) => {
    if (e) e.preventDefault();
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      params.append('agrupamento', agrupamento);

      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      if (clienteId) params.append('clienteId', clienteId);
      if (tecnicoId) params.append('tecnicoId', tecnicoId);
      if (statusId) params.append('statusId', statusId);
      if (tipoReparo) params.append('tipoReparo', tipoReparo);

      const res = await api.get(`/relatorios/operacional?${params.toString()}`);
      setRelatorio(res.data);

      // Inicia com todos os grupos expandidos
      const expandidosIniciais = {};
      (res.data.grupos || []).forEach((_, idx) => {
        expandidosIniciais[idx] = true;
      });
      setItensExpandidos(expandidosIniciais);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      exibirToast('Não foi possível gerar o relatório com os critérios selecionados.');
    } finally {
      setCarregando(false);
    }
  };

  // Carrega relatório inicial com o agrupamento padrão
  useEffect(() => {
    gerarRelatorio();
  }, []);

  const alternarExpansao = (index) => {
    setItensExpandidos((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandirTodos = () => {
    const novos = {};
    (relatorio?.grupos || []).forEach((_, idx) => {
      novos[idx] = true;
    });
    setItensExpandidos(novos);
  };

  const recolherTodos = () => {
    setItensExpandidos({});
  };

  const handleLimpar = () => {
    setDataInicio('');
    setDataFim('');
    setClienteId('');
    setTecnicoId('');
    setStatusId('');
    setTipoReparo('');
    setAgrupamento('cliente');
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    try {
      return new Date(dataStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return dataStr;
    }
  };

  const tituloOriginalRef = React.useRef(document.title);

  // Expande todos os registros automaticamente antes de imprimir e limpa título do browser
  const prepararImpressao = () => {
    tituloOriginalRef.current = document.title;
    document.title = '';
    const novos = {};
    (relatorio?.grupos || []).forEach((_, idx) => {
      novos[idx] = true;
    });
    setItensExpandidos(novos);
  };

  const imprimirRelatorio = () => {
    prepararImpressao();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      tituloOriginalRef.current = document.title;
      document.title = '';
      prepararImpressao();
    };
    const handleAfterPrint = () => {
      document.title = tituloOriginalRef.current || 'Mediator';
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [relatorio]);

  const resumo = relatorio?.resumo || {};
  const grupos = relatorio?.grupos || [];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl max-w-md print:hidden">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800">{toast.mensagem}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:border-b-2 print:border-[#0D223A] print:pb-3 print:mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0D223A] text-white shadow-sm print:hidden">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 print:text-xl print:font-extrabold print:text-[#0D223A]">
              Relatório Operacional
            </h1>
            <p className="text-xs text-slate-500 print:hidden mt-0.5">
              Acompanhamento analítico e consolidado de ordens de serviço, clientes e técnicos.
            </p>
            <div className="text-[10.5px] text-slate-600 hidden print:flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="font-semibold text-slate-800">
                Agrupamento: {
                  agrupamento === 'cliente' ? 'Por Cliente' :
                  agrupamento === 'tecnico' ? 'Por Técnico' :
                  agrupamento === 'status' ? 'Por Status' : 'Lista Completa'
                }
              </span>
              <span>•</span>
              <span>
                Período: {dataInicio ? formatarData(dataInicio) : 'Início'} até {dataFim ? formatarData(dataFim) : 'Hoje'}
              </span>
              <span>•</span>
              <span>Total de grupos: {grupos.length}</span>
            </div>
          </div>
        </div>

        <div className="hidden print:block text-right text-[10.5px] text-slate-600">
          <p className="font-semibold text-slate-800">
            Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={imprimirRelatorio}
            className="secondary-highlight-action"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE PARAMETRIZAÇÃO (Oculto na impressão) */}
      <form
        onSubmit={gerarRelatorio}
        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4 print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-700 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Painel de Filtros do Relatório
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Selecione o agrupamento e os filtros desejados
          </span>
        </div>

        {/* 1. Escolha do Agrupamento */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Estrutura de Agrupamento do Relatório
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: 'cliente', label: 'Por Cliente', desc: 'Cliente > OS' },
              { id: 'tecnico', label: 'Por Técnico', desc: 'Técnico > OS' },
              { id: 'status', label: 'Por Status', desc: 'Status > OS' },
              { id: 'geral', label: 'Lista Completa', desc: 'OS individual detalhada' },
            ].map((modo) => (
              <button
                key={modo.id}
                type="button"
                onClick={() => setAgrupamento(modo.id)}
                className={`flex flex-col text-left rounded-xl border p-3 transition select-none ${
                  agrupamento === modo.id
                    ? 'border-[#0D223A] bg-[#0D223A] text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold leading-tight">{modo.label}</span>
                <span
                  className={`text-xs font-medium mt-1 ${
                    agrupamento === modo.id ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {modo.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Filtros Específicos (Sem ícones nas labels e com ícones dos controles mais nítidos) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end pt-1">
          {/* Cliente com Busca Otimizada */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Filtrar Cliente
            </label>
            <SearchableCombobox
              value={clienteId}
              onChange={setClienteId}
              options={auxiliares.clientes || []}
              valueKey="id"
              labelKey="nome"
              sublabelKey="cpf"
              placeholder="Todos os clientes"
              searchPlaceholder="Buscar por nome ou CPF..."
              icon={User}
            />
          </div>

          {/* Técnico com Busca Otimizada */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Filtrar Técnico
            </label>
            <SearchableCombobox
              value={tecnicoId}
              onChange={setTecnicoId}
              options={auxiliares.tecnicos || []}
              valueKey="id"
              labelKey="nome"
              sublabelKey="email"
              placeholder="Todos os técnicos"
              searchPlaceholder="Buscar técnico..."
              icon={Wrench}
            />
          </div>

          {/* Status com Busca Otimizada */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Status
            </label>
            <SearchableCombobox
              value={statusId}
              onChange={setStatusId}
              options={auxiliares.status || []}
              valueKey="id"
              labelKey="nome"
              corKey="cor"
              placeholder="Todos os status"
              searchPlaceholder="Buscar status..."
              icon={CheckCircle2}
            />
          </div>

          {/* Período: Início */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs text-slate-800 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Período: Fim */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-800">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2.5 text-xs text-slate-800 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Botões do Formulário com ícones escuros */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLimpar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
            Limpar Critérios
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#0D223A] bg-white px-3 py-1.5 text-xs font-semibold text-[#0D223A] hover:bg-slate-50 transition shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#0D223A]" />
            Gerar Relatório
          </button>
        </div>
      </form>

      {/* RESUMO EXECUTIVO (KPIS) - Compacto em modo de impressão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2 print:mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-md print:border-slate-300 print:bg-slate-50/80 print:p-2 print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400 print:text-[9px] print:font-bold print:text-slate-600">Total de OS</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 print:hidden">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 print:mt-0.5 print:text-base print:font-extrabold print:text-[#0D223A]">
            {resumo.totalOrdens || 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-md print:border-slate-300 print:bg-slate-50/80 print:p-2 print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400 print:text-[9px] print:font-bold print:text-slate-600">
              {agrupamento === 'tecnico' ? 'Técnicos Listados' : 'Clientes Atendidos'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 print:hidden">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 print:mt-0.5 print:text-base print:font-extrabold print:text-[#0D223A]">
            {agrupamento === 'tecnico' ? resumo.totalTecnicos || 0 : resumo.totalClientes || 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-md print:border-slate-300 print:bg-slate-50/80 print:p-2 print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400 print:text-[9px] print:font-bold print:text-slate-600">Total em Peças</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 print:hidden">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 print:mt-0.5 print:text-base print:font-extrabold print:text-emerald-700">
            {maskCurrency(resumo.valorTotalProdutos || 0)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:rounded-md print:border-slate-300 print:bg-slate-50/80 print:p-2 print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400 print:text-[9px] print:font-bold print:text-slate-600">Tempo Médio</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 print:hidden">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 print:mt-0.5 print:text-base print:font-extrabold print:text-slate-800">
            {resumo.tempoMedioDias || 0} <span className="text-sm font-normal text-slate-500 print:text-[10px] print:font-medium">dias</span>
          </p>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO MASTER-DETAIL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between print:mb-2">
          <h3 className="text-sm font-bold text-slate-900 print:text-xs print:font-extrabold print:text-slate-800">
            Detalhamento Operacional ({grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'})
          </h3>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={expandirTodos}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              Expandir Todos
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={recolherTodos}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              Recolher Todos
            </button>
          </div>
        </div>

        {carregando ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"></div>
              <span className="text-xs">Consolidando dados do relatório...</span>
            </div>
          </div>
        ) : grupos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Nenhum dado encontrado</p>
            <p className="text-xs text-slate-400">
              Nenhuma ordem de serviço corresponde aos parâmetros configurados.
            </p>
          </div>
        ) : (
          <div className="space-y-3 print:space-y-3 print:overflow-visible">
            {grupos.map((grupo, idx) => {
              const master = grupo.master || {};
              const detalhes = grupo.detalhes || [];
              const estaExpandido = Boolean(itensExpandidos[idx]);

              return (
                <div
                  key={idx}
                  className="report-group-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition print:overflow-visible print:shadow-none print:break-inside-avoid print:border-slate-300 print:mb-3.5 print:rounded-lg"
                >
                  {/* Cabeçalho Master */}
                  <div
                    onClick={() => alternarExpansao(idx)}
                    className="flex flex-col sm:flex-row cursor-pointer sm:items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 hover:bg-slate-100/70 transition border-b border-slate-200/80 select-none print:py-1.5 print:px-3 print:bg-slate-100 print:border-slate-300"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 print:gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0D223A] text-white font-bold text-xs shadow-xs print:h-5 print:w-5 print:text-[10px] print:rounded">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight truncate print:truncate-none print:whitespace-normal print:text-xs">
                          {master.nome || master.numeroOrdem || 'Registro Consolidado'}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 print:text-[9.5px] print:text-slate-600">
                          {master.cpf && <span>CPF: {master.cpf}</span>}
                          {master.telefone && <span>• Tel: {master.telefone}</span>}
                          {master.email && master.email !== '-' && (
                            <span>• Email: {master.email}</span>
                          )}
                          {master.tipoReparo && <span>• Reparo: {master.tipoReparo}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0 shrink-0 print:pl-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-bold text-slate-900 print:text-[10.5px]">
                          {master.totalOrdens} {master.totalOrdens === 1 ? 'OS' : 'OSs'}
                        </span>
                        <p className="text-[11px] font-semibold text-emerald-600 print:text-[10.5px] print:font-bold">
                          {maskCurrency(master.valorTotal || 0)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 print:hidden"
                        title={estaExpandido ? 'Recolher' : 'Expandir'}
                      >
                        {estaExpandido ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Detalhes (Detail) com alinhamento uniforme rigoroso e colunas balanceadas para impressão */}
                  {estaExpandido && (
                    <div className="overflow-x-auto p-0 print:overflow-visible">
                      <table className="w-full table-fixed text-left text-xs text-slate-600 print:text-[10px]">
                        {agrupamento === 'cliente' ? (
                          <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[27%]" />
                            <col className="w-[17%]" />
                            <col className="w-[11%]" />
                            <col className="w-[17%]" />
                            <col className="w-[13%]" />
                          </colgroup>
                        ) : agrupamento === 'tecnico' ? (
                          <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[27%]" />
                            <col className="w-[17%]" />
                            <col className="w-[11%]" />
                            <col className="w-[17%]" />
                            <col className="w-[13%]" />
                          </colgroup>
                        ) : agrupamento === 'status' ? (
                          <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[27%]" />
                            <col className="w-[18%]" />
                            <col className="w-[17%]" />
                            <col className="w-[11%]" />
                            <col className="w-[12%]" />
                          </colgroup>
                        ) : (
                          <colgroup>
                            <col className="w-[13%]" />
                            <col className="w-[22%]" />
                            <col className="w-[16%]" />
                            <col className="w-[14%]" />
                            <col className="w-[10%]" />
                            <col className="w-[14%]" />
                            <col className="w-[11%]" />
                          </colgroup>
                        )}
                        <thead className="bg-slate-100/60 print:bg-slate-200/80 text-[10px] print:text-[9.5px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700 border-b border-slate-200 print:border-slate-300">
                          <tr>
                            <th className="py-3 px-4 print:py-1.5 print:px-2">Número OS</th>
                            <th className="py-3 px-4 print:py-1.5 print:px-2">Equipamento</th>
                            {agrupamento !== 'cliente' && <th className="py-3 px-4 print:py-1.5 print:px-2">Cliente</th>}
                            {agrupamento !== 'tecnico' && <th className="py-3 px-4 print:py-1.5 print:px-2">Técnico</th>}
                            <th className="py-3 px-4 print:py-1.5 print:px-2">Abertura</th>
                            {agrupamento !== 'status' && <th className="py-3 px-4 print:py-1.5 print:px-2">Status</th>}
                            <th className="py-3 px-4 print:py-1.5 print:px-2 text-right">Valor Peças</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                          {detalhes.map((detalhe, dIdx) => (
                            <tr key={dIdx} className="hover:bg-slate-50/50 print:hover:bg-transparent transition">
                              <td className="py-3 px-4 print:py-1.5 print:px-2 font-semibold text-slate-900 truncate print:truncate-none print:whitespace-normal print:text-[10px]">
                                {detalhe.numeroOrdem || detalhe.ordemId?.slice(0, 8)}
                              </td>
                              <td className="py-3 px-4 print:py-1.5 print:px-2">
                                <span className="font-medium text-slate-800 block truncate print:truncate-none print:whitespace-normal print:text-[10px]" title={detalhe.equipamento?.descricao}>
                                  {detalhe.equipamento?.descricao || '-'}
                                </span>
                                {detalhe.equipamento?.marca && (
                                  <span className="text-[10px] text-slate-400 block truncate print:truncate-none print:whitespace-normal print:text-[9px] print:text-slate-500">
                                    {detalhe.equipamento.marca}{' '}
                                    {detalhe.equipamento.modelo ? `/ ${detalhe.equipamento.modelo}` : ''}
                                  </span>
                                )}
                              </td>
                              {agrupamento !== 'cliente' && (
                                <td className="py-3 px-4 print:py-1.5 print:px-2 truncate print:truncate-none print:whitespace-normal print:text-[10px]" title={detalhe.cliente?.nome}>
                                  {detalhe.cliente?.nome || '-'}
                                </td>
                              )}
                              {agrupamento !== 'tecnico' && (
                                <td className="py-3 px-4 print:py-1.5 print:px-2 truncate print:truncate-none print:whitespace-normal print:text-[10px]" title={detalhe.tecnico?.nome}>
                                  {detalhe.tecnico?.nome || (
                                    <span className="italic text-slate-400">Não atribuído</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3 px-4 print:py-1.5 print:px-2 whitespace-nowrap print:text-[10px] text-slate-600">
                                {formatarData(detalhe.abertoEm)}
                              </td>
                              {agrupamento !== 'status' && (
                                <td className="py-3 px-4 print:py-1.5 print:px-2 whitespace-nowrap print:whitespace-normal">
                                  <span
                                    className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs print:text-[9px] print:leading-tight print:px-2 print:py-0.5 print:rounded print:shadow-none print:border print:border-black/10 print:whitespace-normal text-center"
                                    style={{ backgroundColor: detalhe.status?.cor || '#64748B' }}
                                  >
                                    {detalhe.status?.nome || 'Em Andamento'}
                                  </span>
                                </td>
                              )}
                              <td className="py-3 px-4 print:py-1.5 print:px-2 text-right font-medium text-slate-900 whitespace-nowrap print:text-[10px] print:font-bold">
                                {maskCurrency(detalhe.totalProdutos || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
