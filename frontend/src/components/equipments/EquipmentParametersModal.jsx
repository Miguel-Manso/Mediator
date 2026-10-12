import React, { useState } from 'react';
import {
  X,
  Plus,
  Loader2,
  Tag,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';

export const EquipmentParametersModal = ({
  aberto,
  aoFechar,
  categorias = [],
  marcas = [],
  modelos = [],
  aoAtualizar,
}) => {
  const [abaAtiva, setAbaAtiva] = useState('categorias'); // 'categorias', 'marcas', 'modelos'

  // Form Categoria
  const [nomeCategoria, setNomeCategoria] = useState('');
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  // Form Marca
  const [nomeMarca, setNomeMarca] = useState('');
  const [salvandoMarca, setSalvandoMarca] = useState(false);

  // Form Modelo
  const [marcaSelecionadaId, setMarcaSelecionadaId] = useState(marcas.length > 0 ? marcas[0].id : '');
  const [nomeModelo, setNomeModelo] = useState('');
  const [salvandoModelo, setSalvandoModelo] = useState(false);

  // Feedback
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  if (!aberto) return null;

  const limparMensagens = () => {
    setErro('');
    setSucesso('');
  };

  // Cadastrar Categoria
  const aoCadastrarCategoria = async (e) => {
    e.preventDefault();
    limparMensagens();

    if (!nomeCategoria.trim()) {
      setErro('Informe o nome da categoria.');
      return;
    }

    try {
      setSalvandoCategoria(true);
      await api.post('/equipamentos/categorias', { nome: nomeCategoria.trim() });
      setSucesso(`Categoria "${nomeCategoria.trim()}" cadastrada com sucesso!`);
      setNomeCategoria('');
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao cadastrar categoria.');
    } finally {
      setSalvandoCategoria(false);
    }
  };

  // Cadastrar Marca
  const aoCadastrarMarca = async (e) => {
    e.preventDefault();
    limparMensagens();

    if (!nomeMarca.trim()) {
      setErro('Informe o nome da marca.');
      return;
    }

    try {
      setSalvandoMarca(true);
      const res = await api.post('/equipamentos/marcas', { nome: nomeMarca.trim() });
      setSucesso(`Marca "${nomeMarca.trim()}" cadastrada com sucesso!`);
      setNomeMarca('');
      if (!marcaSelecionadaId && res.data?.id) {
        setMarcaSelecionadaId(res.data.id);
      }
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao cadastrar marca.');
    } finally {
      setSalvandoMarca(false);
    }
  };

  // Cadastrar Modelo
  const aoCadastrarModelo = async (e) => {
    e.preventDefault();
    limparMensagens();

    if (!marcaSelecionadaId) {
      setErro('Selecione a marca do modelo.');
      return;
    }

    if (!nomeModelo.trim()) {
      setErro('Informe o nome do modelo.');
      return;
    }

    try {
      setSalvandoModelo(true);
      await api.post('/equipamentos/modelos', {
        nome: nomeModelo.trim(),
        marcaId: marcaSelecionadaId,
      });
      setSucesso(`Modelo "${nomeModelo.trim()}" cadastrado com sucesso!`);
      setNomeModelo('');
      if (aoAtualizar) aoAtualizar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao cadastrar modelo.');
    } finally {
      setSalvandoModelo(false);
    }
  };

  // Modelos filtrados pela marca selecionada
  const modelosDaMarca = marcaSelecionadaId
    ? modelos.filter((m) => String(m.marcaId || m.marca_id) === String(marcaSelecionadaId))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 shadow-2xl transition-all max-h-[92vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-700" />
              Parâmetros de Equipamento
            </h2>
            <p className="text-xs text-slate-500">
              Parametrização centralizada de Categorias, Marcas e Modelos para os equipamentos
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="mt-4 flex border-b border-slate-100 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('categorias');
              limparMensagens();
            }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
              abaAtiva === 'categorias'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Tag className="h-4 w-4" />
            Categorias ({categorias.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('marcas');
              limparMensagens();
            }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
              abaAtiva === 'marcas'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Marcas ({marcas.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('modelos');
              limparMensagens();
            }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition ${
              abaAtiva === 'modelos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Laptop className="h-4 w-4" />
            Modelos ({modelos.length})
          </button>
        </div>

        {/* Mensagens de feedback */}
        {erro && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-100">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* CONTEÚDO DA ABA 1: CATEGORIAS */}
        {abaAtiva === 'categorias' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={aoCadastrarCategoria} className="rounded-xl border border-slate-200 bg-slate-50/75 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Adicionar Nova Categoria
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Drone, Smartwatch, Caixa de Som..."
                  value={nomeCategoria}
                  onChange={(e) => setNomeCategoria(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={salvandoCategoria || !nomeCategoria.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 shrink-0"
                >
                  {salvandoCategoria ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Categorias Cadastradas ({categorias.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {categorias.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <Tag className="h-3 w-3 text-slate-400" />
                    {c.nome}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: MARCAS */}
        {abaAtiva === 'marcas' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={aoCadastrarMarca} className="rounded-xl border border-slate-200 bg-slate-50/75 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Adicionar Nova Marca
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Asus, Xiaomi, Motorola, Sony..."
                  value={nomeMarca}
                  onChange={(e) => setNomeMarca(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={salvandoMarca || !nomeMarca.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 shrink-0"
                >
                  {salvandoMarca ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Marcas Cadastradas ({marcas.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {marcas.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <Sparkles className="h-3 w-3 text-slate-400" />
                    {m.nome}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: MODELOS */}
        {abaAtiva === 'modelos' && (
          <div className="mt-4 space-y-4">
            <form onSubmit={aoCadastrarModelo} className="rounded-xl border border-slate-200 bg-slate-50/75 p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Adicionar Novo Modelo
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Marca Pai *</label>
                  <select
                    value={marcaSelecionadaId}
                    onChange={(e) => {
                      setMarcaSelecionadaId(e.target.value);
                      limparMensagens();
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="">Selecione a marca...</option>
                    {marcas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome do Modelo *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Inspiron 15, Galaxy S24, iPhone 15"
                      value={nomeModelo}
                      onChange={(e) => setNomeModelo(e.target.value)}
                      disabled={!marcaSelecionadaId}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={salvandoModelo || !nomeModelo.trim() || !marcaSelecionadaId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 shrink-0"
                    >
                      {salvandoModelo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Modelos da Marca{' '}
                  <span className="text-slate-800 font-extrabold">
                    {marcas.find((m) => String(m.id) === String(marcaSelecionadaId))?.nome || 'Selecionada'}
                  </span>{' '}
                  ({modelosDaMarca.length})
                </p>
              </div>

              {modelosDaMarca.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {marcaSelecionadaId
                    ? 'Nenhum modelo cadastrado para esta marca.'
                    : 'Selecione uma marca acima para visualizar os modelos.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {modelosDaMarca.map((mod) => (
                    <span
                      key={mod.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <Laptop className="h-3 w-3 text-slate-400" />
                      {mod.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Concluir e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentParametersModal;
