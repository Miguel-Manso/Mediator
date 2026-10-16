import React, { useState, useEffect } from 'react';
import { X, Palette, ListOrdered, Check, AlertCircle, Loader2 } from 'lucide-react';

export const CORES_PALETA = [
  { cor: '#3B82F6', nome: 'Azul Real', bgBadge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { cor: '#06B6D4', nome: 'Ciano Oceano', bgBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { cor: '#10B981', nome: 'Esmeralda', bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { cor: '#84CC16', nome: 'Lima Fresco', bgBadge: 'bg-lime-50 text-lime-700 border-lime-200' },
  { cor: '#F59E0B', nome: 'Âmbar Dourado', bgBadge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { cor: '#F97316', nome: 'Laranja Quente', bgBadge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { cor: '#F43F5E', nome: 'Rosa Coral', bgBadge: 'bg-rose-50 text-rose-700 border-rose-200' },
  { cor: '#8B5CF6', nome: 'Violeta / Íris', bgBadge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { cor: '#6366F1', nome: 'Índigo Noturno', bgBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { cor: '#64748B', nome: 'Ardósia / Cinza', bgBadge: 'bg-slate-100 text-slate-700 border-slate-300' },
];

export const OrderColumnModal = ({
  aberto,
  aoFechar,
  aoSalvar,
  colunaEmEdicao = null,
  proximaOrdemSugerida = 1,
}) => {
  const estaEditando = Boolean(colunaEmEdicao);

  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);
  const [descricao, setDescricao] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (aberto) {
      setErro('');
      if (colunaEmEdicao) {
        setNome(colunaEmEdicao.title || colunaEmEdicao.nome || '');
        setCor(colunaEmEdicao.color || colunaEmEdicao.cor || '#3B82F6');
        setOrdem(colunaEmEdicao.order ?? colunaEmEdicao.ordem ?? 1);
        setAtivo(colunaEmEdicao.isActive ?? colunaEmEdicao.ativo ?? true);
        setDescricao(colunaEmEdicao.descricao || '');
      } else {
        setNome('');
        setCor('#3B82F6');
        setOrdem(proximaOrdemSugerida);
        setAtivo(true);
        setDescricao('');
      }
    }
  }, [aberto, colunaEmEdicao, proximaOrdemSugerida]);

  if (!aberto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const nomeFormatado = nome.trim();
    if (!nomeFormatado) {
      setErro('Informe o nome da etapa / status.');
      return;
    }

    setSalvando(true);
    try {
      await aoSalvar({
        id: colunaEmEdicao?.id,
        nome: nomeFormatado,
        title: nomeFormatado,
        cor,
        color: cor,
        ordem: Number(ordem) || 0,
        order: Number(ordem) || 0,
        ativo,
        isActive: ativo,
        descricao: descricao.trim() || null,
      });
      aoFechar();
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Erro ao salvar coluna de status.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {estaEditando ? 'Editar Coluna de Status' : 'Nova Coluna de Status'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure as propriedades desta etapa no fluxo Kanban de Ordens de Serviço
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Nome da Coluna */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome da Etapa / Status <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Em Análise, Aguardando Peças, Concluído"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Descrição Opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descrição ou Instrução Interna <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Breve explicação da etapa para a equipe técnica"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Seletor de Cores */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-slate-500" />
                Cor Temática / Badge
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-medium text-slate-500">{cor}</span>
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  title="Selecionar cor personalizada"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {CORES_PALETA.map((item) => {
                const selecionada = cor.toLowerCase() === item.cor.toLowerCase();
                return (
                  <button
                    key={item.cor}
                    type="button"
                    onClick={() => setCor(item.cor)}
                    className={`group relative flex items-center gap-1.5 rounded-xl border p-2 text-left transition hover:scale-[1.02] ${
                      selecionada
                        ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-xs"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="truncate text-[10px] font-medium text-slate-700">
                      {item.nome.split(' ')[0]}
                    </span>
                    {selecionada && (
                      <Check className="ml-auto h-3 w-3 text-slate-900 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ordem de Exibição e Status Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
                Ordem na Esteira
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Coluna Ativa</p>
                  <p className="text-[10px] text-slate-500">Exibida no fluxo de trabalho padrão</p>
                </div>
              </label>
            </div>
          </div>

          {/* Pré-visualização da Coluna */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Prévia do Cabeçalho da Coluna:
            </p>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: cor }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {nome || 'Nome da Etapa'}
                </span>
                {!ativo && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    [Inativa]
                  </span>
                )}
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                0
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={salvando}
              onClick={aoFechar}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Coluna'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
