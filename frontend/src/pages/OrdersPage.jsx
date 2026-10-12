import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  Laptop,
  Clock,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { maskCurrency } from '../utils/masks';
import { useAuth } from '../contexts/AuthContext';
import { OrderCreateModal } from '../components/orders/OrderCreateModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';

export const OrdersPage = () => {
  const { ehAdmin, ehAtendente, ehTecnico, apenasTecnico } = useAuth();
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [tecnicoFiltro, setTecnicoFiltro] = useState('');
  const [exibirInativas, setExibirInativas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalOrdens, setTotalOrdens] = useState(0);

  // Auxiliares para filtros
  const [statusLista, setStatusLista] = useState([]);
  const [tecnicosLista, setTecnicosLista] = useState([]);

  // Modais
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [ordemSelecionadaId, setOrdemSelecionadaId] = useState(null);

  // Carrega filtros auxiliares
  useEffect(() => {
    const carregarAuxiliares = async () => {
      try {
        const res = await api.get('/ordens-servico/auxiliares');
        setStatusLista(res.data.status || []);
        setTecnicosLista(res.data.tecnicos || []);
      } catch (err) {
        console.error('Erro ao carregar filtros de OS:', err);
      }
    };
    carregarAuxiliares();
  }, []);

  // Busca ordens com filtros
  const buscarOrdens = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (statusFiltro) params.append('statusId', statusFiltro);
      if (tecnicoFiltro) params.append('tecnicoId', tecnicoFiltro);
      params.append('pagina', String(pagina));
      params.append('limite', '15');
      if (exibirInativas) params.append('apenasAtivos', 'false');

      const res = await api.get(`/ordens-servico?${params.toString()}`);
      setOrdens(res.data.dados || []);
      setTotalPaginas(res.data.totalPaginas || 1);
      setTotalOrdens(res.data.total || 0);
    } catch (err) {
      console.error('Erro ao buscar ordens de serviço:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarOrdens();
  }, [busca, statusFiltro, tecnicoFiltro, exibirInativas, pagina]);

  // Alternar ativo/inativo (Soft delete)
  const alternarAtivoOrdem = async (id, statusAtual) => {
    const acao = statusAtual ? 'inativar' : 'reativar';
    if (!window.confirm(`Deseja realmente ${acao} esta Ordem de Serviço?`)) return;

    try {
      await api.patch(`/ordens-servico/${id}/alternar-ativo`);
      buscarOrdens();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status da OS.');
    }
  };

  // Abrir modal de detalhes
  const abrirDetalhes = (id) => {
    setOrdemSelecionadaId(id);
    setModalDetalheAberto(true);
  };

  // Contadores para métricas
  const emAberto = ordens.filter((o) => o.statusId >= 1 && o.statusId <= 4).length;
  const emReparo = ordens.filter((o) => o.statusId === 5 || o.statusId === 6).length;
  const finalizadas = ordens.filter((o) => o.statusId === 7 || o.statusId === 8).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ordens de Serviço</h1>
          <p className="text-sm text-slate-500">
            Abertura de OS, triagem por tipo de reparo, evolução técnica e baixa de peças
          </p>
        </div>

        {(ehAdmin || ehAtendente) && (
          <button
            onClick={() => setModalCriacaoAberto(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <Plus className="h-4 w-4" />
            Nova Ordem de Serviço
          </button>
        )}
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total de OS</p>
            <p className="text-2xl font-bold text-slate-800">{totalOrdens}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Abertas / Triagem</p>
            <p className="text-2xl font-bold text-slate-800">{emAberto}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Em Manutenção</p>
            <p className="text-2xl font-bold text-slate-800">{emReparo}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Concluídas / Entregues</p>
            <p className="text-2xl font-bold text-slate-800">{finalizadas}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Busca textual */}
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OS, cliente, equipamento ou sintoma..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filtro por Status */}
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os status</option>
              {statusLista.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.ordem}. {st.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Técnico */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={tecnicoFiltro}
              onChange={(e) => {
                setTecnicoFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Todos os técnicos</option>
              {tecnicosLista.map((tec) => (
                <option key={tec.id} value={tec.id}>
                  {tec.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox exibir inativas */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-center sm:justify-start lg:justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={exibirInativas}
                onChange={(e) => {
                  setExibirInativas(e.target.checked);
                  setPagina(1);
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Exibir inativas
            </label>
          </div>
        </div>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {carregando ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : ordens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              Abra uma nova OS no botão acima ou altere os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Número da OS</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Equipamento</th>
                  <th className="px-5 py-3.5">Status Atual</th>
                  <th className="px-5 py-3.5">Técnico</th>
                  <th className="px-5 py-3.5 text-right">Peças (R$)</th>
                  <th className="px-5 py-3.5">Abertura</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordens.map((os) => (
                  <tr key={os.id} className="transition-colors hover:bg-slate-50/50">
                    {/* Número da OS */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      <span className="inline-block rounded bg-slate-100 px-2 py-1 text-slate-800">
                        {os.numeroOrdem}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{os.clienteNome}</p>
                      <p className="text-[11px] text-slate-400">{os.clienteTelefone}</p>
                    </td>

                    {/* Equipamento */}
                    <td className="px-5 py-3.5 max-w-xs truncate">
                      <p className="font-medium text-slate-800">{os.equipamentoDescricao}</p>
                      <p className="text-[11px] text-slate-400">
                        {os.marcaNome ? `${os.marcaNome} ${os.modeloNome || ''}` : os.categoriaNome || 'Equipamento'}
                      </p>
                    </td>

                    {/* Status da OS */}
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs"
                        style={{ backgroundColor: os.statusCor || '#3B82F6' }}
                      >
                        {os.statusNome}
                      </span>
                    </td>

                    {/* Técnico Responsável */}
                    <td className="px-5 py-3.5">
                      {os.tecnicoNome ? (
                        <span className="font-medium text-slate-700">{os.tecnicoNome}</span>
                      ) : (
                        <span className="italic text-slate-400 text-[11px]">Não atribuído</span>
                      )}
                    </td>

                    {/* Peças / Subtotal */}
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {maskCurrency(os.totalProdutos || 0)}
                    </td>

                    {/* Abertura */}
                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {new Date(os.abertoEm).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirDetalhes(os.id)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
                          title="Visualizar detalhes, histórico e peças"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </button>

                        {(ehAdmin || ehAtendente) && (
                          <button
                            onClick={() => alternarAtivoOrdem(os.id, os.ativo)}
                            className={`rounded p-1 transition ${
                              os.ativo
                                ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600'
                                : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title={os.ativo ? 'Inativar OS' : 'Reativar OS'}
                          >
                            {os.ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50 text-xs text-slate-600">
            <span>
              Página <strong className="text-slate-800">{pagina}</strong> de{' '}
              <strong className="text-slate-800">{totalPaginas}</strong> ({totalOrdens} ordens)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>

              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Abertura de Ordem de Serviço (RF06 - restrito a ADMIN e ATENDENTE) */}
      {(ehAdmin || ehAtendente) && (
        <OrderCreateModal
          aberto={modalCriacaoAberto}
          aoFechar={() => setModalCriacaoAberto(false)}
          aoSucesso={() => {
            buscarOrdens();
          }}
        />
      )}

      {/* Modal Master-Detail e Consumo de Peças */}
      <OrderDetailModal
        ordemId={ordemSelecionadaId}
        aberto={modalDetalheAberto}
        aoFechar={() => {
          setModalDetalheAberto(false);
          setOrdemSelecionadaId(null);
        }}
        aoAtualizar={() => {
          buscarOrdens();
        }}
      />
    </div>
  );
};

export default OrdersPage;
