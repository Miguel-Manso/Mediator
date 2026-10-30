import React, { useState } from 'react';
import {
  History,
  Wrench,
  Send,
  ShieldCheck,
  Loader2,
  Clock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Componente de Linha do Tempo / Evolução Técnica da Ordem de Serviço.
 *
 * @param {Object} props
 * @param {string|number} props.ordemId - ID da ordem de serviço atual
 * @param {Array} props.historico - Array de eventos da OS ({ id, tipoRegistro, etapa, descricao, usuarioNome, usuarioCargo, statusNome, statusCor, criadoEm })
 * @param {boolean} props.ehTecnico - Flag indicando se o usuário é Técnico (ou possui perfil técnico)
 * @param {boolean} props.ehAdmin - Flag indicando se o usuário é Administrador
 * @param {boolean} props.ehAtendente - Flag indicando se o usuário é Atendente
 * @param {Function} props.aoRecarregar - Callback para recarregar os dados da OS no modal
 * @param {Function} [props.onAdicionarApontamento] - Callback assíncrono opcional customizado para inserção
 */
export const OrderTimeline = ({
  ordemId,
  historico = [],
  ehTecnico = false,
  ehAdmin = false,
  ehAtendente = false,
  aoRecarregar,
  onAdicionarApontamento,
}) => {
  // Controle de Filtros Rápidos: 'TODOS', 'PARECER' ou 'STATUS'
  const [filtro, setFiltro] = useState('TODOS');

  // Estados locais do formulário de novo apontamento de bancada
  const [etapa, setEtapa] = useState('Testes de Bancada');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sucessoForm, setSucessoForm] = useState('');

  // Regra RBAC: O formulário é restrito aos perfis TECNICO e ADMIN
  const podeRegistrar = Boolean(ehTecnico || ehAdmin);

  // Submissão do novo parecer técnico
  const handleSubmitApontamento = async (e) => {
    e.preventDefault();
    const textoLimpo = descricao.trim();
    if (!textoLimpo) {
      setErroForm('Por favor, informe a descrição detalhada do parecer técnico.');
      return;
    }

    try {
      setSalvando(true);
      setErroForm('');
      setSucessoForm('');

      if (onAdicionarApontamento) {
        await onAdicionarApontamento({
          etapa: etapa.trim() || 'Testes de Bancada',
          descricao: textoLimpo,
        });
      } else {
        await api.post(`/ordens-servico/${ordemId}/observacoes-tecnicas`, {
          etapa: etapa.trim() || 'Testes de Bancada',
          descricao: textoLimpo,
        });
      }

      setDescricao('');
      setSucessoForm('Apontamento de bancada registrado com sucesso!');
      setTimeout(() => setSucessoForm(''), 4000);

      // Re-fetch em tempo real
      if (aoRecarregar) {
        await aoRecarregar();
      }
    } catch (err) {
      console.error('Erro ao adicionar apontamento técnico:', err);
      setErroForm(
        err.response?.data?.error ||
        err.message ||
        'Não foi possível registrar o apontamento técnico. Verifique os dados e tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  };

  // Contagens para os botões de filtro
  const totalCount = historico.length;
  const pareceresCount = historico.filter((h) => h.tipoRegistro === 'PARECER').length;
  const statusCount = historico.filter((h) => h.tipoRegistro === 'STATUS').length;

  // Lista filtrada
  const historicoFiltrado = historico.filter((h) => {
    if (filtro === 'PARECER') return h.tipoRegistro === 'PARECER';
    if (filtro === 'STATUS') return h.tipoRegistro === 'STATUS';
    return true;
  });

  // Formatador seguro de data e hora para pt-BR
  const formatarDataHora = (dataIso) => {
    if (!dataIso) return '-';
    try {
      const d = new Date(dataIso);
      if (isNaN(d.getTime())) return String(dataIso);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dataIso);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. FORMULÁRIO DE APONTAMENTO TÉCNICO COM RBAC */}
      {podeRegistrar ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Nova Evolução de Bancada
            </h4>
            <span className="text-[11px] font-medium text-slate-400">
              Registro técnico oficial para o histórico da OS
            </span>
          </div>

          {erroForm && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{erroForm}</span>
            </div>
          )}

          {sucessoForm && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{sucessoForm}</span>
            </div>
          )}

          <form onSubmit={handleSubmitApontamento} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Etapa Atual
              </label>
              <input
                type="text"
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
                placeholder="Ex: Testes de Bancada, Desmontagem, Troca de Componente..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-400 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Parecer Técnico / Observações da Etapa <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {descricao.length} caracteres
                </span>
              </div>
              <textarea
                required
                rows={3}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (erroForm) setErroForm('');
                }}
                placeholder="Descreva minuciosamente testes realizados, tensões medidas, componentes analisados ou procedimentos executados na bancada..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 leading-relaxed focus:border-slate-500 focus:ring-1 focus:ring-slate-400 focus:outline-none transition-all placeholder:text-slate-400 resize-y"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={salvando || !descricao.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Registrar Apontamento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Banner RBAC para Atendente */
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-200/60 text-slate-500 shrink-0 mt-0.5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs mb-0.5">
              Acesso Restrito à Bancada Técnica
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              O registro de apontamentos técnicos é restrito à bancada. Utilize o histórico abaixo para atualizar o cliente.
            </p>
          </div>
        </div>
      )}

      {/* 2. LINHA DO TEMPO CRONOLÓGICA COM FILTROS RÁPIDOS */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Cabeçalho da Linha do Tempo e Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-700" />
              Linha do Tempo / Evolução Técnica
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rastreabilidade completa de todas as alterações de status e laudos técnicos registrados.
            </p>
          </div>

          {/* Grupo de Filtros Estilo Pills / Toggle */}
<<<<<<< HEAD
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-lg self-start sm:self-auto border border-slate-200/60 w-full sm:w-auto">
=======
          <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg self-start sm:self-auto border border-slate-200/60">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
            <button
              type="button"
              onClick={() => setFiltro('TODOS')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                filtro === 'TODOS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Todos</span>
              <span
<<<<<<< HEAD
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
=======
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
                  filtro === 'TODOS' ? 'bg-slate-200/80 text-slate-800' : 'bg-slate-200/50 text-slate-500'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltro('PARECER')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                filtro === 'PARECER'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
<<<<<<< HEAD
              <Wrench className="h-3 w-3 shrink-0" />
              <span>Pareceres Técnicos</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
=======
              <Wrench className="h-3 w-3" />
              <span>Pareceres Técnicos</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
                  filtro === 'PARECER' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/50 text-slate-500'
                }`}
              >
                {pareceresCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltro('STATUS')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                filtro === 'STATUS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-indigo-700'
              }`}
            >
<<<<<<< HEAD
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span>Mudanças de Status</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
=======
              <ArrowRight className="h-3 w-3" />
              <span>Mudanças de Status</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
                  filtro === 'STATUS' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/50 text-slate-500'
                }`}
              >
                {statusCount}
              </span>
            </button>
          </div>
        </div>

        {/* 3. ESTRUTURA VERTICAL DA LINHA DO TEMPO */}
        {historicoFiltrado.length === 0 ? (
          /* Empty State Elegante */
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-400 italic font-medium max-w-sm">
              {filtro === 'TODOS'
                ? 'Nenhum evento registrado ainda nesta Ordem de Serviço.'
                : `Nenhum registro encontrado para o filtro "${
                    filtro === 'PARECER' ? 'Pareceres Técnicos' : 'Mudanças de Status'
                  }".`}
            </p>
            {filtro !== 'TODOS' && (
              <button
                type="button"
                onClick={() => setFiltro('TODOS')}
                className="mt-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Limpar filtros e exibir todos os registros
              </button>
            )}
          </div>
        ) : (
          /* Lista de Eventos com Linha Contínua */
          <div className="relative pl-6 sm:pl-7 space-y-4 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {historicoFiltrado.map((item, idx) => {
              const ehStatus = item.tipoRegistro === 'STATUS';
              // Cor do marcador: prioridade para item.statusCor, senão Indigo para STATUS e Esmeralda para PARECER
              const corMarcador =
                item.statusCor || (ehStatus ? '#6366F1' : '#10B981');

              return (
                <div key={item.id || idx} className="relative group">
                  {/* Marcador na Linha da Timeline */}
                  <div
                    className="absolute -left-6 sm:-left-7 top-1.5 h-3.5 w-3.5 -translate-x-[0.5px] rounded-full border-2 border-white shadow-xs ring-2 ring-slate-100 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: corMarcador }}
                    title={ehStatus ? `Mudança de Status: ${item.statusNome || ''}` : 'Parecer Técnico'}
                  />

                  {/* Card do Evento */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all duration-150 hover:bg-white hover:border-slate-300 hover:shadow-xs">
                    {/* Cabeçalho do Evento */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Tag/Badge de Tipo de Registro */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                            ehStatus
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          }`}
                        >
                          {ehStatus ? (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              Mudança de Status
                            </>
                          ) : (
                            <>
                              <Wrench className="h-3 w-3" />
                              Parecer Técnico
                            </>
                          )}
                        </span>

                        {/* Etapa */}
                        <span className="text-xs font-bold text-slate-800">
                          {item.etapa || 'Apontamento'}
                        </span>

                        {/* Badge de Status Vinculado (se presente) */}
                        {item.statusNome && (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs"
                            style={{ backgroundColor: item.statusCor || '#64748B' }}
                          >
                            {item.statusNome}
                          </span>
                        )}
                      </div>

                      {/* Data / Hora Formatada */}
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatarDataHora(item.criadoEm)}</span>
                      </div>
                    </div>

                    {/* Corpo: Descrição Detalhada */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                      {item.descricao}
                    </p>

                    {/* Rodapé do Evento: Usuário e Cargo */}
                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          Apontado por:{' '}
                          <span className="font-semibold text-slate-600">
                            {item.usuarioNome || 'Usuário do Sistema'}
                          </span>
                          {item.usuarioCargo ? (
                            <span className="text-slate-400 font-normal">
                              {' '}
                              ({item.usuarioCargo})
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTimeline;
