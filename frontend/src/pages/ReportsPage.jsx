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
  Download,
  RotateCcw,
  Clock,
  Layers,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { maskCurrency } from '../utils/masks';

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

  const imprimirRelatorio = () => {
    window.print();
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:border-b print:border-slate-300 print:pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm print:hidden">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Relatório Operacional Master-Detail
            </h1>
            <p className="text-xs text-slate-500">
              Cruzamento consolidado de dados entre Clientes, Técnicos e Ordens de Serviço (RF12)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={imprimirRelatorio}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
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
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Parametrização do Relatório
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Selecione o agrupamento e os filtros desejados
          </span>
        </div>

        {/* 1. Escolha do Agrupamento Master-Detail */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-800">
            Estrutura de Agrupamento Master-Detail
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: 'cliente', label: 'Por Cliente', desc: 'Cliente (Master) > OSs (Detail)' },
              { id: 'tecnico', label: 'Por Técnico', desc: 'Técnico (Master) > OSs (Detail)' },
              { id: 'status', label: 'Por Status', desc: 'Status (Master) > OSs (Detail)' },
              { id: 'geral', label: 'Lista Completa', desc: 'OS individual detalhada' },
            ].map((modo) => (
              <button
                key={modo.id}
                type="button"
                onClick={() => setAgrupamento(modo.id)}
                className={`flex flex-col text-left rounded-xl border p-2.5 transition ${
                  agrupamento === modo.id
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold">{modo.label}</span>
                <span
                  className={`text-[10px] mt-0.5 ${
                    agrupamento === modo.id ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {modo.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Filtros Específicos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end pt-1">
          {/* Cliente */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <User className="h-3 w-3 text-slate-400" />
              Filtrar Cliente
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os clientes</option>
              {(auxiliares.clientes || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Técnico */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Wrench className="h-3 w-3 text-slate-400" />
              Filtrar Técnico
            </label>
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os técnicos</option>
              {(auxiliares.tecnicos || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <CheckCircle2 className="h-3 w-3 text-slate-400" />
              Status
            </label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os status</option>
              {(auxiliares.status || []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Período: Início */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Calendar className="h-3 w-3 text-slate-400" />
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Período: Fim */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Calendar className="h-3 w-3 text-slate-400" />
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Botões do Formulário */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLimpar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            Limpar Critérios
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Gerar Relatório
          </button>
        </div>
      </form>

      {/* RESUMO EXECUTIVO (KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400">Total de OS</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{resumo.totalOrdens || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400">
              {agrupamento === 'tecnico' ? 'Técnicos Listados' : 'Clientes Atendidos'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {agrupamento === 'tecnico' ? resumo.totalTecnicos || 0 : resumo.totalClientes || 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400">Total em Peças</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {maskCurrency(resumo.valorTotalProdutos || 0)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-slate-400">Tempo Médio</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {resumo.tempoMedioDias || 0} <span className="text-sm font-normal text-slate-500">dias</span>
          </p>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO MASTER-DETAIL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
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
          <div className="space-y-3">
            {grupos.map((grupo, idx) => {
              const master = grupo.master || {};
              const detalhes = grupo.detalhes || [];
              const estaExpandido = Boolean(itensExpandidos[idx]);

              return (
                <div
                  key={idx}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition"
                >
                  {/* Cabeçalho Master */}
                  <div
                    onClick={() => alternarExpansao(idx)}
                    className="flex flex-col sm:flex-row cursor-pointer sm:items-center justify-between gap-3 bg-slate-50/80 px-4 py-3.5 hover:bg-slate-100/70 transition border-b border-slate-200/80 select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
                          {master.nome || master.numeroOrdem || 'Registro Consolidado'}
                        </h4>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          {master.cpf && <span>CPF: {master.cpf}</span>}
                          {master.telefone && <span>• Tel: {master.telefone}</span>}
                          {master.email && master.email !== '-' && (
                            <span>• Email: {master.email}</span>
                          )}
                          {master.tipoReparo && <span>• Reparo: {master.tipoReparo}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-bold text-slate-900">
                          {master.totalOrdens} {master.totalOrdens === 1 ? 'OS' : 'OSs'}
                        </span>
                        <p className="text-[11px] font-semibold text-emerald-600">
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

                  {/* Tabela de Detalhes (Detail) */}
                  {estaExpandido && (
                    <div className="overflow-x-auto p-0">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Número OS</th>
                            <th className="py-3 px-4">Equipamento</th>
                            {agrupamento !== 'cliente' && <th className="py-3 px-4">Cliente</th>}
                            {agrupamento !== 'tecnico' && <th className="py-3 px-4">Técnico</th>}
                            <th className="py-3 px-4">Abertura</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Valor Peças</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detalhes.map((detalhe, dIdx) => (
                            <tr key={dIdx} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                {detalhe.numeroOrdem || detalhe.ordemId?.slice(0, 8)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-slate-800">
                                  {detalhe.equipamento?.descricao || '-'}
                                </span>
                                {detalhe.equipamento?.marca && (
                                  <span className="text-[10px] text-slate-400 block">
                                    {detalhe.equipamento.marca}{' '}
                                    {detalhe.equipamento.modelo ? `/ ${detalhe.equipamento.modelo}` : ''}
                                  </span>
                                )}
                              </td>
                              {agrupamento !== 'cliente' && (
                                <td className="py-3 px-4">
                                  {detalhe.cliente?.nome || '-'}
                                </td>
                              )}
                              {agrupamento !== 'tecnico' && (
                                <td className="py-3 px-4">
                                  {detalhe.tecnico?.nome || (
                                    <span className="italic text-slate-400">Não atribuído</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {formatarData(detalhe.abertoEm)}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: detalhe.status?.cor || '#64748B' }}
                                >
                                  {detalhe.status?.nome || 'Em Andamento'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
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
