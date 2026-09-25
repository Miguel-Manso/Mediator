import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit,
  UserX,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Coins,
  Boxes,
} from 'lucide-react';
import { api } from '../services/api';
import { maskCurrency, blockInvalidNumberKeys, onlyDigits } from '../utils/masks';
import { Pagination } from '../components/Pagination';

export const ProductsPage = () => {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Estados de paginação
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Estados do modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [ativo, setAtivo] = useState(true);

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const buscarProdutos = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca && busca.trim()) params.append('busca', busca.trim());
      params.append('pagina', String(pagina));
      params.append('limite', String(limite));

      const resposta = await api.get(`/produtos?${params.toString()}`);
      const lista = Array.isArray(resposta.data)
        ? resposta.data
        : resposta.data.dados || resposta.data.produtos || [];
      const meta = resposta.data.paginacao || {
        pagina: 1,
        limite,
        total: lista.length,
        totalPaginas: 1,
      };

      setProdutos(lista);
      setTotalRegistros(meta.total);
      setTotalPaginas(meta.totalPaginas);
    } catch (erro) {
      console.error('Erro ao carregar produtos:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    setPagina(1);
  }, [busca]);

  useEffect(() => {
    buscarProdutos();
  }, [busca, pagina, limite]);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setNome('');
    setDescricao('');
    setPreco('');
    setEstoque('0');
    setAtivo(true);
    setMostrarModal(true);
  };

  const abrirModalEdicao = (prod) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(prod.id);
    setNome(prod.nome || '');
    setDescricao(prod.descricao || '');
    setPreco(prod.preco !== undefined ? String(prod.preco) : '');
    setEstoque(prod.estoque !== undefined ? String(prod.estoque) : '0');
    setAtivo(prod.ativo !== false && prod.ativo !== 0);
    setMostrarModal(true);
  };

  const aoSalvarProduto = async (e) => {
    e.preventDefault();
    setErroFormulario('');

    if (!nome.trim()) {
      setErroFormulario('O nome do produto ou peça é obrigatório.');
      return;
    }

    const precoNum = parseFloat(String(preco).replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0.10) {
      setErroFormulario('O preço do produto deve ser de no mínimo R$ 0,10.');
      return;
    }

    const estoqueNum = parseInt(estoque, 10);
    if (isNaN(estoqueNum) || estoqueNum < 0) {
      setErroFormulario('Informe uma quantidade de estoque válida (número inteiro maior ou igual a zero).');
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        preco: precoNum,
        estoque: estoqueNum,
        ativo: !!ativo,
      };

      if (estaEditando && idEmEdicao) {
        await api.put(`/produtos/${idEmEdicao}`, payload);
      } else {
        await api.post('/produtos', payload);
      }

      setMostrarModal(false);
      buscarProdutos();
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Erro ao salvar produto. Tente novamente.';
      setErroFormulario(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const aoAlternarStatus = async (prod) => {
    const novoStatus = !prod.ativo;
    const acaoTexto = novoStatus ? 'reativar' : 'inativar';

    if (!confirm(`Deseja realmente ${acaoTexto} o item "${prod.nome}"?`)) {
      return;
    }

    try {
      await api.patch(`/produtos/${prod.id}/status`, { ativo: novoStatus });
      buscarProdutos();
    } catch (err) {
      alert(err.response?.data?.error || `Não foi possível ${acaoTexto} o produto.`);
    }
  };

  // Formatação em Real (BRL)
  const formatarMoeda = (valor) => {
    return maskCurrency(valor) || 'R$ 0,00';
  };

  return (
    <div className="page-shell">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Produtos e Peças</h1>
          <p className="page-subtitle">Controle de estoque de componentes, peças de reposição e periféricos</p>
        </div>
        <button onClick={abrirModalCriacao} className="primary-action">
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto por nome ou descrição..."
          className="search-control"
          maxLength={100}
        />
      </div>

      {/* Tabela de Produtos */}
      <div className="table-shell">
        {carregando ? (
          <div className="p-8 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span>Carregando produtos...</span>
          </div>
        ) : produtos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400 mt-1">
              {busca ? 'Nenhum produto localizado com o termo informado.' : 'Nenhum produto cadastrado no catálogo.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Peça / Produto</th>
                  <th className="px-6 py-4">Preço Unitário</th>
                  <th className="px-6 py-4">Estoque Atual</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.map((prod) => {
                  const statusAtivo = prod.ativo !== false && prod.ativo !== 0;
                  const estoqueBaixo = Number(prod.estoque) <= 5;
                  const semEstoque = Number(prod.estoque) === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{prod.nome}</div>
                        {prod.descricao && (
                          <div className="text-xs text-slate-400 mt-0.5 max-w-sm truncate" title={prod.descricao}>
                            {prod.descricao}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatarMoeda(prod.preco)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                              semEstoque
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : estoqueBaixo
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Boxes className="w-3 h-3 text-slate-400" />
                            <span>{prod.estoque} un</span>
                          </span>

                          {estoqueBaixo && (
                            <span
                              className="text-[11px] text-amber-600 flex items-center gap-0.5"
                              title={semEstoque ? 'Item esgotado!' : 'Estoque em nível crítico'}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{semEstoque ? 'Esgotado' : 'Estoque baixo'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${statusAtivo ? 'badge-active' : 'badge-inactive'}`}>
                          {statusAtivo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModalEdicao(prod)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                            title="Editar Produto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => aoAlternarStatus(prod)}
                            className={`p-1.5 rounded-md transition-colors ${
                              statusAtivo
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={statusAtivo ? 'Inativar Produto' : 'Reativar Produto'}
                          >
                            {statusAtivo ? <UserX className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Paginação Reutilizável */}
        {!carregando && produtos.length > 0 && (
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            limite={limite}
            total={totalRegistros}
            onMudarPagina={(novaPagina) => setPagina(novaPagina)}
            onMudarLimite={(novoLimite) => {
              setLimite(novoLimite);
              setPagina(1);
            }}
            opcoesLimite={[5, 10, 20, 50]}
          />
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Produto / Peça' : 'Novo Produto / Peça'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarProduto} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* Nome do Produto / Peça (NVARCHAR(100) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Produto / Peça *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: SSD 480GB Kingston SATA"
                    maxLength={100}
                    required
                    className="form-control"
                  />
                </div>

                {/* Preço Unitário (DECIMAL(10,2) -> col-span-4 quando editando, col-span-6 quando criando) */}
                <div className={`col-span-1 ${estaEditando ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço Unitário (R$) * (Mín: R$ 0,10)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    value={preco}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) < 0) return;
                      setPreco(val);
                    }}
                    onKeyDown={blockInvalidNumberKeys}
                    placeholder="0.10"
                    required
                    className="form-control font-mono"
                  />
                </div>

                {/* Quantidade em Estoque (INT -> col-span-4 quando editando, col-span-6 quando criando) */}
                <div className={`col-span-1 ${estaEditando ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantidade em Estoque *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={estoque}
                    onKeyDown={blockInvalidNumberKeys}
                    onChange={(e) => setEstoque(onlyDigits(e.target.value, 10))}
                    placeholder="0"
                    maxLength={10}
                    required
                    className="form-control font-mono"
                  />
                </div>

                {/* Status do Item (BIT / NVARCHAR(20) -> col-span-4 ao editar) */}
                {estaEditando && (
                  <div className="col-span-1 sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status do Item
                    </label>
                    <select
                      value={ativo ? '1' : '0'}
                      onChange={(e) => setAtivo(e.target.value === '1')}
                      className="form-control"
                    >
                      <option value="1">Ativo no Catálogo</option>
                      <option value="0">Inativo</option>
                    </select>
                  </div>
                )}

                {/* Descrição / Especificações Técnicas (NVARCHAR(MAX) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição / Especificações Técnicas
                  </label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Detalhes, compatibilidade, número de peça (PN)..."
                    rows={3}
                    className="form-control resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="secondary-action"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-action"
                  disabled={salvando}
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : estaEditando ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
