import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Search,
  Plus,
  Edit,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ListOrdered,
  Palette,
  Eye,
} from 'lucide-react';
import { api } from '../services/api';

const CORES_SUGERIDAS = [
  { cor: '#3B82F6', label: 'Azul (Recebido)' },
  { cor: '#8B5CF6', label: 'Roxo (Diagnóstico)' },
  { cor: '#F59E0B', label: 'Âmbar (Aprovação)' },
  { cor: '#10B981', label: 'Verde (Aprovado Cliente)' },
  { cor: '#06B6D4', label: 'Ciano (Reparo)' },
  { cor: '#EC4899', label: 'Rosa (Peças)' },
  { cor: '#84CC16', label: 'Lima (Testes)' },
  { cor: '#64748B', label: 'Cinza (Finalizado)' },
  { cor: '#EF4444', label: 'Vermelho (Cancelado)' },
];

export const OrderStatusPage = () => {
  const [statusList, setStatusList] = useState([]);
  const [busca, setBusca] = useState('');
  const [exibirInativos, setExibirInativos] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Estados do Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const buscarStatus = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (exibirInativos) params.append('incluirInativos', 'true');

      const resposta = await api.get(`/status-ordem?${params.toString()}`);
      setStatusList(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar status da ordem:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarStatus();
  }, [busca, exibirInativos]);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setNome('');
    setDescricao('');
    setCor('#3B82F6');
    setOrdem(statusList.length + 1);
    setAtivo(true);
    setMostrarModal(true);
  };

  const abrirModalEdicao = (item) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(item.id);
    setNome(item.nome || '');
    setDescricao(item.descricao || '');
    setCor(item.cor || '#3B82F6');
    setOrdem(item.ordem !== undefined ? item.ordem : 0);
    setAtivo(item.ativo !== false && item.ativo !== 0);
    setMostrarModal(true);
  };

  const aoSalvarStatus = async (e) => {
    e.preventDefault();
    setErroFormulario('');

    if (!nome.trim()) {
      setErroFormulario('O nome do status é obrigatório.');
      return;
    }

    setSalvando(true);

    try {
      if (estaEditando) {
        await api.put(`/status-ordem/${idEmEdicao}`, {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor,
          ordem: Number(ordem) || 0,
          ativo,
        });
      } else {
        await api.post('/status-ordem', {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor,
          ordem: Number(ordem) || 0,
        });
      }

      setMostrarModal(false);
      buscarStatus();
    } catch (erro) {
      const msg = erro.response?.data?.error || 'Erro ao processar requisição do status.';
      setErroFormulario(msg);
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivoStatus = async (id, statusAtual) => {
    const acao = statusAtual ? 'inativar' : 'ativar';
    if (!window.confirm(`Deseja realmente ${acao} este status?`)) return;

    try {
      await api.patch(`/status-ordem/${id}/status`);
      buscarStatus();
    } catch (erro) {
      alert(erro.response?.data?.error || 'Erro ao alterar visibilidade do status.');
    }
  };

  const totalAtivos = statusList.filter((s) => s.ativo).length;
  const totalInativos = statusList.filter((s) => !s.ativo).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Status das Ordens de Serviço</h1>
          <p className="text-sm text-slate-500">
            Parametrização do fluxo de atendimento, cores visuais e etapas do reparo
          </p>
        </div>

        <button
          onClick={abrirModalCriacao}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          <Plus className="h-4 w-4" />
          Novo Status
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total de Etapas</p>
            <p className="text-2xl font-bold text-slate-800">{statusList.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status Ativos</p>
            <p className="text-2xl font-bold text-slate-800">{totalAtivos}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status Inativos</p>
            <p className="text-2xl font-bold text-slate-800">{totalInativos}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do status ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 transition shrink-0">
          <input
            type="checkbox"
            checked={exibirInativos}
            onChange={(e) => setExibirInativos(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>Exibir inativos</span>
        </label>
      </div>

      {/* Tabela de Status */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {carregando ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : statusList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <Sliders className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhum status localizado</p>
            <p className="text-xs text-slate-400 mt-1">Cadastre um novo status ou altere seus filtros de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Ordem</th>
                  <th className="px-6 py-3.5">Identificação Visual</th>
                  <th className="px-6 py-3.5">Nome do Status</th>
                  <th className="px-6 py-3.5">Descrição</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statusList.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">
                        {item.ordem ?? item.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: item.cor || '#3B82F6' }}
                        />
                        <span
                          className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                          style={{ backgroundColor: item.cor || '#3B82F6' }}
                        >
                          {item.nome}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nome}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={item.descricao}>
                      {item.descricao || <span className="italic text-slate-400">Sem descrição</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalEdicao(item)}
                          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Editar status"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => alternarAtivoStatus(item.id, item.ativo)}
                          className={`rounded p-1 transition ${
                            item.ativo
                              ? 'text-rose-400 hover:bg-rose-50 hover:text-rose-600'
                              : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title={item.ativo ? 'Inativar status' : 'Reativar status'}
                        >
                          {item.ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Status */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-all">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {estaEditando ? 'Editar Status da OS' : 'Novo Status de Atendimento'}
              </h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {erroFormulario && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{erroFormulario}</span>
              </div>
            )}

            <form onSubmit={aoSalvarStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Status *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Em Análise / Orçamento"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição do Status
                </label>
                <textarea
                  rows={2}
                  placeholder="Explicação do que ocorre nesta etapa do fluxo..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cor Hexadecimal
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-mono text-slate-800 uppercase focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cores sugeridas rápidas */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Paleta de Cores Sugeridas:</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_SUGERIDAS.map((c) => (
                    <button
                      key={c.cor}
                      type="button"
                      onClick={() => setCor(c.cor)}
                      title={c.label}
                      className="h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110 focus:outline-none"
                      style={{ backgroundColor: c.cor }}
                    />
                  ))}
                </div>
              </div>

              {/* Pré-visualização do badge */}
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Pré-visualização do Badge:</span>
                <span
                  className="inline-flex items-center rounded-md px-3 py-1 text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: cor }}
                >
                  {nome || 'Nome do Status'}
                </span>
              </div>

              {estaEditando && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="statusAtivo"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="statusAtivo" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Status ativo no fluxo de trabalho
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {estaEditando ? 'Atualizar Status' : 'Cadastrar Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusPage;
