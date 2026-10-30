import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Calendar,
  User,
  Filter,
  RotateCcw,
  Eye,
  X,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Pagination } from '../components/common/Pagination';

export const AuditLogsPage = () => {
  const { ehAdmin, cargo } = useAuth();

  // Estados de dados
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const limite = 15;

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');
  const [busca, setBusca] = useState('');

  // Modal de Detalhes / Payload
  const [logSelecionado, setLogSelecionado] = useState(null);
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);

  // Lista de usuários para o dropdown de filtro
  const [usuariosLista, setUsuariosLista] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);
  const exibirToast = (mensagem, tipo = 'erro') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4500);
  };

  // Carregar usuários para o dropdown
  useEffect(() => {
    const carregarUsuarios = async () => {
      try {
        const res = await api.get('/usuarios');
        setUsuariosLista(Array.isArray(res.data) ? res.data : res.data.dados || []);
      } catch (err) {
        console.error('Erro ao carregar lista de usuários:', err);
      }
    };
    if (ehAdmin) {
      carregarUsuarios();
    }
  }, [ehAdmin]);

  // Buscar logs de auditoria
  const buscarLogs = async (paginaAlvo = pagina) => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      params.append('pagina', String(paginaAlvo));
      params.append('limite', String(limite));

      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      if (usuarioFiltro) params.append('usuario', usuarioFiltro);
      if (acaoFiltro) params.append('acao', acaoFiltro);
      if (metodoFiltro) params.append('metodo', metodoFiltro);
      if (busca) params.append('busca', busca);

      const res = await api.get(`/auditoria?${params.toString()}`);
      setLogs(res.data.dados || []);
      setTotalLogs(res.data.total || 0);
      setTotalPaginas(res.data.totalPaginas || 1);
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
      exibirToast('Não foi possível carregar os logs de auditoria.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarLogs(pagina);
  }, [pagina]);

  const handleFiltrar = (e) => {
    if (e) e.preventDefault();
    setPagina(1);
    buscarLogs(1);
  };

  const handleLimparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setUsuarioFiltro('');
    setAcaoFiltro('');
    setMetodoFiltro('');
    setBusca('');
    setPagina(1);
    setTimeout(() => {
      api.get(`/auditoria?pagina=1&limite=${limite}`).then((res) => {
        setLogs(res.data.dados || []);
        setTotalLogs(res.data.total || 0);
        setTotalPaginas(res.data.totalPaginas || 1);
      });
    }, 50);
  };

  const formatarDataHora = (dataStr) => {
    if (!dataStr) return '-';
    try {
      const data = new Date(dataStr);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return dataStr;
    }
  };

  const badgeMetodo = (metodo) => {
    const m = String(metodo || '').toUpperCase();
    switch (m) {
      case 'POST':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PUT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PATCH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Se não for admin, exibe tela de aviso e bloqueio
  if (!ehAdmin && cargo !== 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acesso Restrito ao Administrador</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Você não possui privilégios suficientes para acessar os registros de auditoria do sistema Mediator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl animate-in slide-in-from-top duration-200 max-w-md">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800">{toast.mensagem}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Monitoramento de Auditoria
            </h1>
            <p className="text-xs text-slate-500">
              Rastreamento em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            <span>Auditoria Ativa</span>
          </span>
        </div>
      </div>

      {/* Barra de Filtros por Período e Usuário */}
      <form
        onSubmit={handleFiltrar}
        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Critérios de Consulta de Logs
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {totalLogs} {totalLogs === 1 ? 'registro encontrado' : 'registros encontrados'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* 1. Busca textual */}
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Busca Textual
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ação, rota, IP, termo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Usuário */}
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Usuário Responsável
            </label>
            <select
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os usuários</option>
              {usuariosLista.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.cargo || 'USUÁRIO'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Período: Início */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* 4. Período: Fim */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* 5. Método HTTP */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-700">
              Método
            </label>
            <select
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-2.5 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="POST">POST (Criação)</option>
              <option value="PUT">PUT (Atualização)</option>
              <option value="PATCH">PATCH (Status/Atribuição)</option>
              <option value="DELETE">DELETE (Exclusão)</option>
            </select>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLimparFiltros}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            Limpar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <Search className="h-3.5 w-3.5" />
            Filtrar Auditoria
          </button>
        </div>
      </form>

      {/* Tabela de Logs de Auditoria */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação / Operação</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Recurso / Rota</th>
                <th className="py-3 px-4">ID Entidade</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"></div>
                      <span className="text-xs">Carregando registros de auditoria...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhum log encontrado</p>
                      <p className="text-xs text-slate-400">
                        Nenhum registro de auditoria corresponde aos filtros aplicados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-medium">
                      {formatarDataHora(log.criadoEm)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                          {(log.usuarioNome || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 leading-tight">
                            {log.usuarioNome || 'Sistema'}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {log.usuarioCargo || log.usuarioEmail || 'ID: ' + (log.usuarioId ? log.usuarioId.slice(0, 8) + '...' : '-')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] font-semibold text-slate-700">
                      {log.acao}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeMetodo(
                          log.metodo
                        )}`}
                      >
                        {log.metodo}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap max-w-xs truncate font-mono text-[11px] text-slate-500" title={log.rota}>
                      {log.rota}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {log.entidadeId ? log.entidadeId.slice(0, 13) + '...' : '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                      {log.enderecoIp || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setLogSelecionado(log);
                          setModalDetalheAberto(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                        title="Inspecionar dados alterados"
                      >
                        <FileCode className="h-3.5 w-3.5 text-slate-500" />
                        <span>Ver JSON</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-3 border-t border-slate-100">
          <Pagination
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={totalLogs}
            limite={limite}
            aoMudarPagina={(p) => setPagina(p)}
          />
        </div>
      </div>

      {/* Modal de Detalhes dos Dados Alterados (JSON Viewer) */}
      {modalDetalheAberto && logSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detalhes da Auditoria - {logSelecionado.acao}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {formatarDataHora(logSelecionado.criadoEm)} • Por: {logSelecionado.usuarioNome}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalDetalheAberto(false);
                  setLogSelecionado(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Método</span>
                  <p className="font-semibold text-slate-800">{logSelecionado.metodo}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rota</span>
                  <p className="font-mono text-slate-800 truncate" title={logSelecionado.rota}>
                    {logSelecionado.rota}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ID Entidade</span>
                  <p className="font-mono text-slate-800 truncate">{logSelecionado.entidadeId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">IP</span>
                  <p className="text-slate-800">{logSelecionado.enderecoIp || 'Desconhecido'}</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                  Dados Alterados / Payload da Requisição
                </label>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner">
                  <pre>
                    {JSON.stringify(
                      logSelecionado.dadosAlteradosParsed || logSelecionado.dadosAlterados,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setModalDetalheAberto(false);
                  setLogSelecionado(null);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
