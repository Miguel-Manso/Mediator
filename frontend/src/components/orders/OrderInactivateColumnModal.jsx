import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

export const OrderInactivateColumnModal = ({
  aberto,
  aoFechar,
  aoConfirmar,
  coluna,
  outrasColunasAtivas = [],
}) => {
  const [remanejar, setRemanejar] = useState(false);
  const [destinoId, setDestinoId] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  if (!aberto || !coluna) return null;

  const totalCards = coluna.cards?.length || 0;
  const colunasDestinoPossiveis = outrasColunasAtivas.filter((c) => String(c.id) !== String(coluna.id));

  const handleConfirmar = async () => {
    setErro('');

    if (totalCards > 0 && remanejar && !destinoId) {
      setErro('Selecione uma etapa de destino para remanejar as Ordens de Serviço.');
      return;
    }

    setProcessando(true);
    try {
      await aoConfirmar({
        colunaId: coluna.id,
        remanejarOS: remanejar && totalCards > 0,
        destinoStatusId: remanejar && totalCards > 0 ? Number(destinoId) : null,
      });
      aoFechar();
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Erro ao inativar coluna.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
        {/* Topo */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Inativar Etapa</h2>
              <p className="text-xs text-slate-500">
                Coluna: <strong className="text-slate-700">{coluna.title || coluna.nome}</strong>
              </p>
            </div>
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
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
            {erro}
          </div>
        )}

        {/* Conteúdo Contextual */}
        <div className="mt-4 space-y-3.5">
          {totalCards > 0 ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold">
                    Esta etapa possui {totalCards} {totalCards === 1 ? 'Ordem' : 'Ordens'} de Serviço ativa{totalCards > 1 ? 's' : ''}.
                  </p>
                  <p className="mt-1 text-amber-700 text-[11px] leading-relaxed">
                    Você pode remanejar automaticamente essas OSs para outra etapa ativa ou manter o vínculo histórico.
                  </p>
                </div>
              </div>

              {/* Opções de Remanejamento */}
              <div className="mt-3.5 space-y-2.5 border-t border-amber-200/60 pt-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="radio"
                    name="acaoOS"
                    checked={remanejar}
                    onChange={() => {
                      setRemanejar(true);
                      if (!destinoId && colunasDestinoPossiveis.length > 0) {
                        setDestinoId(String(colunasDestinoPossiveis[0].id));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Remanejar OSs para outra coluna</span>
                    <p className="text-[11px] text-slate-500">Transfere as {totalCards} OSs para o status selecionado</p>
                  </div>
                </label>

                {remanejar && (
                  <div className="pl-6 pt-1">
                    <select
                      value={destinoId}
                      onChange={(e) => setDestinoId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
                    >
                      <option value="">Selecione o status de destino...</option>
                      {colunasDestinoPossiveis.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title || c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="radio"
                    name="acaoOS"
                    checked={!remanejar}
                    onChange={() => setRemanejar(false)}
                    className="mt-0.5 h-4 w-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">Manter OSs nesta etapa</span>
                    <p className="text-[11px] text-slate-500">
                      Elas continuarão visíveis apenas quando a opção &quot;Exibir colunas inativas&quot; estiver ligada.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja inativar a coluna{' '}
              <strong className="text-slate-900">&quot;{coluna.title || coluna.nome}&quot;</strong>?
              Ela será ocultada do fluxo ativo padrão, mas poderá ser reativada a qualquer momento através do filtro{' '}
              <span className="font-medium text-slate-800">&quot;Exibir colunas inativas&quot;</span>.
            </p>
          )}
        </div>

        {/* Rodapé e Botões */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={processando}
            onClick={aoFechar}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={processando}
            onClick={handleConfirmar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-sm"
          >
            {processando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Inativando...
              </>
            ) : (
              'Confirmar Inativação'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
