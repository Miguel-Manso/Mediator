import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Check,
  Loader2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { api } from '../../services/api';
import { maskPhone } from '../../utils/masks';

/**
 * Modal de Pesquisa Avançada de Clientes.
 * Permite buscar rapidamente clientes por nome, CPF, e-mail ou telefone,
 * exibindo uma tabela detalhada para seleção ágil (ex: na abertura de OS).
 *
 * @param {Object} props
 * @param {boolean} props.aberto - Estado de visibilidade do modal
 * @param {function} props.aoFechar - Callback para fechar o modal
 * @param {function} props.aoSelecionar - Callback invocado com o cliente escolhido
 */
export const ClientSearchModal = ({
  aberto,
  aoFechar,
  aoSelecionar,
}) => {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const inputBuscaRef = useRef(null);

  // Foco automático no campo de pesquisa ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => {
        if (inputBuscaRef.current) {
          inputBuscaRef.current.focus();
        }
      }, 100);
      buscarClientes(busca);
    } else {
      setBusca('');
    }
  }, [aberto]);

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

  const buscarClientes = async (termo = '') => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (termo && termo.trim() !== '') {
        params.append('busca', termo.trim());
      }
      params.append('apenasAtivos', 'true');
      params.append('limite', '50');

      const res = await api.get(`/clientes?${params.toString()}`);
      const dados = Array.isArray(res.data) ? res.data : res.data?.dados || [];
      setClientes(dados);
    } catch (err) {
      console.error('Erro na pesquisa de clientes:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setBusca(val);
    buscarClientes(val);
  };

  const handleSelect = (cliente) => {
    aoSelecionar(cliente);
    aoFechar();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pesquisa-clientes"
        className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/75">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 id="titulo-pesquisa-clientes" className="text-sm font-bold text-slate-900">
                Pesquisa Avançada de Clientes
              </h3>
              <p className="text-xs text-slate-500">
                Localize e selecione o cliente pelo nome, CPF, e-mail ou telefone
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
        <div className="p-4 border-b border-slate-100 space-y-2 bg-white">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={handleSearchChange}
              placeholder="Digite o nome, CPF, e-mail ou telefone do cliente..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-9 text-xs text-slate-900 placeholder-slate-400 transition focus:border-slate-500 focus:bg-white focus:outline-none"
            />
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  buscarClientes('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>
              {carregando ? 'Pesquisando...' : `${clientes.length} cliente(s) encontrado(s)`}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Dica: Clique sobre a linha para selecionar o cliente
            </span>
          </div>
        </div>

        {/* Tabela de Clientes Rolável */}
        <div className="flex-1 overflow-y-auto min-h-[280px]">
          {carregando ? (
            <div className="flex h-60 items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              <span className="text-xs font-medium">Buscando clientes...</span>
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <User className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum cliente localizado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {busca ? 'Tente utilizar outros termos na busca.' : 'Nenhum cliente ativo encontrado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">CPF / Documento</th>
                  <th className="py-2.5 px-4">Contato</th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Endereço / Cidade</th>
                  <th className="py-2.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((c) => {
                  const telefone = c.telefone ? maskPhone(c.telefone) : '-';
                  const enderecoResumo = [c.cidade || c.city, c.uf].filter(Boolean).join('/');

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="hover:bg-blue-50/60 cursor-pointer transition group"
                    >
                      {/* Nome do Cliente com Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition">
                            {(c.nome || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition block truncate">
                              {c.nome}
                            </span>
                            {c.email && (
                              <span className="text-[11px] text-slate-400 truncate block">
                                {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CPF / Documento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.cpf ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            <CreditCard className="h-3 w-3 text-slate-400" />
                            {c.cpf}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>

                      {/* Contato (Telefone) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{telefone}</span>
                        </div>
                      </td>

                      {/* Localização */}
                      <td className="py-3 px-4 hidden md:table-cell text-slate-500 truncate max-w-[200px]">
                        {enderecoResumo ? (
                          <div className="flex items-center gap-1 truncate" title={c.logradouro ? `${c.logradouro}, ${c.numero || 'S/N'} - ${enderecoResumo}` : enderecoResumo}>
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{enderecoResumo}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Botão Selecionar */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(c);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-slate-800 group-hover:bg-blue-600 transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Selecionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé com Fechar */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
          <span className="text-xs text-slate-400">
            Pressione <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 shadow-2xs font-mono">ESC</kbd> para fechar
          </span>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

