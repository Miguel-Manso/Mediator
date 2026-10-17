import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Laptop,
  Check,
  Loader2,
  Tag,
  Hash,
  User,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Modal de Pesquisa Avançada de Equipamentos.
 * Permite buscar rapidamente equipamentos por descrição, número de série, marca ou cliente,
 * exibindo uma tabela compacta para seleção ágil (ex: na abertura de OS).
 *
 * @param {Object} props
 * @param {boolean} props.aberto - Estado de visibilidade do modal
 * @param {function} props.aoFechar - Callback para fechar o modal
 * @param {function} props.aoSelecionar - Callback invocado com o equipamento escolhido
 * @param {string} [props.clienteIdFiltro] - Opcional: ID de cliente pré-selecionado para filtrar
 * @param {string} [props.clienteNomeFiltro] - Opcional: Nome do cliente para feedback visual
 */
export const EquipmentSearchModal = ({
  aberto,
  aoFechar,
  aoSelecionar,
  clienteIdFiltro = null,
  clienteNomeFiltro = '',
}) => {
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [filtrarApenasCliente, setFiltrarApenasCliente] = useState(Boolean(clienteIdFiltro));
  const inputBuscaRef = useRef(null);

  // Sincroniza filtro do cliente quando a prop mudar
  useEffect(() => {
    if (clienteIdFiltro) {
      setFiltrarApenasCliente(true);
    }
  }, [clienteIdFiltro]);

  // Foco automático no input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => {
        if (inputBuscaRef.current) {
          inputBuscaRef.current.focus();
        }
      }, 100);
      buscarEquipamentos(busca, filtrarApenasCliente);
    } else {
      setBusca('');
    }
  }, [aberto, filtrarApenasCliente]);

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && aberto) {
        aoFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, aoFechar]);

  const buscarEquipamentos = async (termo = '', apenasDoCliente = false) => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (termo && termo.trim() !== '') {
        params.append('busca', termo.trim());
      }
      if (apenasDoCliente && clienteIdFiltro) {
        params.append('clienteId', clienteIdFiltro);
      }
      params.append('apenasAtivos', 'true');
      params.append('limite', '50');

      const res = await api.get(`/equipamentos?${params.toString()}`);
      const dados = Array.isArray(res.data) ? res.data : res.data?.dados || [];
      setEquipamentos(dados);
    } catch (err) {
      console.error('Erro na pesquisa de equipamentos:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setBusca(val);
    buscarEquipamentos(val, filtrarApenasCliente);
  };

  const handleSelect = (eq) => {
    aoSelecionar(eq);
    aoFechar();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pesquisa-equipamentos"
        className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/75">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h3 id="titulo-pesquisa-equipamentos" className="text-sm font-bold text-slate-900">
                Pesquisa Avançada de Equipamentos
              </h3>
              <p className="text-xs text-slate-500">
                Selecione o equipamento desejado clicando sobre ele
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Filtros e Busca Textual */}
        <div className="p-4 border-b border-slate-100 space-y-2.5 bg-white">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={handleSearchChange}
              placeholder="Digite descrição, número de série, cliente, marca ou modelo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 transition focus:border-slate-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Opção de filtro restrito ao cliente ativo */}
          {clienteIdFiltro && (
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={filtrarApenasCliente}
                  onChange={(e) => setFiltrarApenasCliente(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5"
                />
                <span>
                  Filtrar apenas equipamentos de{' '}
                  <span className="font-semibold text-slate-900">
                    {clienteNomeFiltro || 'Cliente selecionado'}
                  </span>
                </span>
              </label>

              <span className="text-[11px] text-slate-400">
                {equipamentos.length} equipamento(s) encontrado(s)
              </span>
            </div>
          )}
        </div>

        {/* Lista / Tabela Compacta de Equipamentos */}
        <div className="flex-1 overflow-y-auto min-h-[260px]">
          {carregando ? (
            <div className="flex h-56 items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              <span className="text-xs">Buscando equipamentos...</span>
            </div>
          ) : equipamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <Laptop className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum equipamento localizado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {busca
                  ? 'Tente utilizar outros termos na busca.'
                  : clienteIdFiltro && filtrarApenasCliente
                  ? 'Este cliente ainda não possui equipamentos cadastrados. Desmarque o filtro acima para ver todos.'
                  : 'Nenhum equipamento ativo disponível.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Equipamento</th>
                  <th className="px-4 py-2.5">Série / ID</th>
                  <th className="px-4 py-2.5">Marca / Modelo</th>
                  <th className="px-4 py-2.5">Cliente Proprietário</th>
                  <th className="px-4 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipamentos.map((eq) => {
                  const serieFormatada = eq.numeroSerie
                    ? /^\d+$/.test(String(eq.numeroSerie).trim())
                      ? `ID: ${eq.numeroSerie}`
                      : `S/N: ${eq.numeroSerie}`
                    : 'S/N';
                  const marcaMod = [eq.marcaNome, eq.modeloNome].filter(Boolean).join(' ') || 'Geral';

                  return (
                    <tr
                      key={eq.id}
                      onClick={() => handleSelect(eq)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {eq.descricao}
                        </p>
                        {eq.categoriaNome && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <Tag className="h-2.5 w-2.5 text-slate-400" />
                            {eq.categoriaNome}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-medium">
                          {serieFormatada}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {marcaMod}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{eq.clienteNome || 'N/A'}</p>
                        {eq.clienteTelefone && (
                          <p className="text-[10px] text-slate-400">{eq.clienteTelefone}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(eq);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-[11px] font-semibold text-white shadow-2xs hover:bg-slate-800 transition"
                        >
                          <Check className="h-3 w-3" />
                          Selecionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <span className="text-[11px] text-slate-400">
            Dica: clique em qualquer linha para selecionar imediatamente
          </span>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentSearchModal;
