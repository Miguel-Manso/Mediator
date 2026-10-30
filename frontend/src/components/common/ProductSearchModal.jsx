import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Package,
  Check,
  Loader2,
  AlertCircle,
  Coins,
  Boxes,
} from 'lucide-react';
import { api } from '../../services/api';
import { maskCurrency } from '../../utils/masks';

/**
 * Modal de Pesquisa Avançada de Produtos e Peças.
 * Permite buscar rapidamente peças por nome ou descrição,
 * com exibição de estoque e preço para seleção rápida (ex: no orçamento de OS).
 *
 * @param {Object} props
 * @param {boolean} props.aberto - Estado de exibição do modal
 * @param {function} props.aoFechar - Callback para fechar o modal
 * @param {function} props.aoSelecionar - Callback invocado com o produto selecionado
 */
export const ProductSearchModal = ({
  aberto,
  aoFechar,
  aoSelecionar,
}) => {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const inputBuscaRef = useRef(null);

  useEffect(() => {
    if (aberto) {
      setTimeout(() => {
        if (inputBuscaRef.current) {
          inputBuscaRef.current.focus();
        }
      }, 100);
      buscarProdutos(busca);
    } else {
      setBusca('');
    }
  }, [aberto]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && aberto) {
        aoFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, aoFechar]);

  const buscarProdutos = async (termo = '') => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (termo && termo.trim() !== '') {
        params.append('busca', termo.trim());
      }
      params.append('apenasAtivos', 'true');
      params.append('limite', '50');

      const res = await api.get(`/produtos?${params.toString()}`);
      const dados = Array.isArray(res.data) ? res.data : res.data?.dados || [];
      setProdutos(dados);
    } catch (err) {
      console.error('Erro na pesquisa de produtos/peças:', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setBusca(val);
    buscarProdutos(val);
  };

  const handleSelect = (prod) => {
    aoSelecionar(prod);
    aoFechar();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pesquisa-produtos"
        className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/75">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 id="titulo-pesquisa-produtos" className="text-sm font-bold text-slate-900">
                Pesquisa Avançada de Peças e Produtos
              </h3>
              <p className="text-xs text-slate-500">
                Localize peças em estoque e selecione para adicionar ao orçamento
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

        {/* Campo de Busca Textual */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={handleSearchChange}
              placeholder="Digite o nome ou descrição da peça / produto..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 transition focus:border-slate-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Lista / Tabela Compacta de Produtos */}
        <div className="flex-1 overflow-y-auto min-h-[260px]">
          {carregando ? (
            <div className="flex h-56 items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
              <span className="text-xs">Buscando peças e produtos...</span>
            </div>
          ) : produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <Package className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum item localizado</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {busca ? 'Tente utilizar outros termos na busca.' : 'Nenhum produto cadastrado no momento.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Produto / Peça</th>
                  <th className="px-4 py-2.5">Descrição</th>
                  <th className="px-4 py-2.5">Preço Unitário</th>
                  <th className="px-4 py-2.5">Estoque</th>
                  <th className="px-4 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.map((p) => {
                  const precoFormatado = maskCurrency(p.preco || 0);
                  const semEstoque = Number(p.estoque || 0) <= 0;
                  const estoqueBaixo = Number(p.estoque || 0) > 0 && Number(p.estoque || 0) <= 2;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {p.nome}
                      </td>

                      <td className="px-4 py-3 text-slate-500 max-w-[220px] truncate" title={p.descricao || ''}>
                        {p.descricao || '—'}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                        {precoFormatado}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            semEstoque
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : estoqueBaixo
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Boxes className="h-3 w-3" />
                          {p.estoque} un.
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(p);
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
            Dica: clique em qualquer linha para preencher o formulário
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

export default ProductSearchModal;
