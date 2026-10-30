import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Search,
  Plus,
  Edit,
  UserX,
  CheckCircle2,
  Loader2,
  Tag,
  User,
  Hash,
  X,
  Sliders,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { EquipmentParametersModal } from '../components/equipments/EquipmentParametersModal';
import { Pagination } from '../components/common/Pagination';

export const EquipmentsPage = () => {
  const { ehAdmin, ehAtendente, apenasTecnico } = useAuth();
  const [equipamentos, setEquipamentos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Dados auxiliares para selects
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);

  // Estados dos modais
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalParametros, setMostrarModalParametros] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulário de equipamento
  const [descricao, setDescricao] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [modeloId, setModeloId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [exibirInativos, setExibirInativos] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Novos Filtros, Ordenação e Paginação
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [marcaFiltro, setMarcaFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalEquipamentos, setTotalEquipamentos] = useState(0);
  const [orderBy, setOrderBy] = useState('criadoEm');
  const [orderDirection, setOrderDirection] = useState('DESC');

  const alternarOrdenacao = (campo) => {
    if (orderBy === campo) {
      setOrderDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setOrderBy(campo);
      setOrderDirection('ASC');
    }
    setPagina(1);
  };

  const renderIconeOrdenacao = (campo) => {
    if (orderBy !== campo) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition" />;
    }
    return orderDirection === 'ASC' ? (
      <ArrowUp className="h-3 w-3 text-slate-900" />
    ) : (
      <ArrowDown className="h-3 w-3 text-slate-900" />
    );
  };

  // Carregar dados de equipamentos
  const buscarEquipamentos = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (exibirInativos) params.append('incluirInativos', 'true');
      if (categoriaFiltro) params.append('categoriaId', categoriaFiltro);
      if (marcaFiltro) params.append('marcaId', marcaFiltro);
      params.append('orderBy', orderBy);
      params.append('orderDirection', orderDirection);
      params.append('pagina', String(pagina));
      params.append('limite', String(limite));

      const resposta = await api.get(`/equipamentos?${params.toString()}`);
      if (resposta.data && typeof resposta.data === 'object' && 'dados' in resposta.data) {
        setEquipamentos(resposta.data.dados || []);
        setTotalPaginas(resposta.data.totalPaginas || 1);
        setTotalEquipamentos(resposta.data.total || 0);
      } else {
        setEquipamentos(Array.isArray(resposta.data) ? resposta.data : []);
        setTotalPaginas(1);
        setTotalEquipamentos(Array.isArray(resposta.data) ? resposta.data.length : 0);
      }
    } catch (erro) {
      console.error('Erro ao carregar equipamentos:', erro);
    } finally {
      setCarregando(false);
    }
  };

  // Carregar listas auxiliares
  const carregarAuxiliares = async () => {
    try {
      const resposta = await api.get('/equipamentos/auxiliares');
      const { clientes: c, categorias: cat, marcas: m, modelos: mod } = resposta.data;
      setClientes(c || []);
      setCategorias(cat || []);
      setMarcas(m || []);
      setModelos(mod || []);
    } catch (erro) {
      console.error('Erro ao carregar dados auxiliares:', erro);
    }
  };

  useEffect(() => {
    carregarAuxiliares();
  }, []);

  useEffect(() => {
    buscarEquipamentos();
  }, [busca, exibirInativos, categoriaFiltro, marcaFiltro, pagina, orderBy, orderDirection]);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setDescricao('');
    setNumeroSerie('');
    setClienteId(clientes.length > 0 ? clientes[0].id : '');
    setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
    setMarcaId('');
    setModeloId('');
    setAtivo(true);
    setMostrarModal(true);
  };

  const abrirModalEdicao = (eq) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(eq.id);
    setDescricao(eq.descricao || '');
    setNumeroSerie(eq.numeroSerie || eq.numero_serie || '');
    setClienteId(eq.clienteId || eq.cliente_id || '');
    setCategoriaId(eq.categoriaId || eq.categoria_id || '');
    setMarcaId(eq.marcaId || eq.marca_id || '');
    setModeloId(eq.modeloId || eq.modelo_id || '');
    setAtivo(eq.ativo !== false && eq.ativo !== 0);
    setMostrarModal(true);
  };

  // Filtragem dinâmica de modelos pela marca selecionada
  const modelosFiltrados = marcaId
    ? modelos.filter((m) => String(m.marcaId || m.marca_id) === String(marcaId))
    : modelos;

  const aoSalvarEquipamento = async (e) => {
    e.preventDefault();
    setErroFormulario('');

    if (!descricao.trim()) {
      setErroFormulario('A descrição do equipamento é obrigatória.');
      return;
    }

    if (!clienteId) {
      setErroFormulario('Selecione o cliente proprietário do equipamento.');
      return;
    }

    if (!categoriaId) {
      setErroFormulario('Selecione a categoria do equipamento.');
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        descricao: descricao.trim(),
        numeroSerie: numeroSerie.trim() || null,
        clienteId,
        categoriaId: Number(categoriaId),
        marcaId: marcaId || null,
        modeloId: modeloId || null,
        ativo: !!ativo,
      };

      if (estaEditando && idEmEdicao) {
        await api.put(`/equipamentos/${idEmEdicao}`, payload);
      } else {
        await api.post('/equipamentos', payload);
      }

      setMostrarModal(false);
      buscarEquipamentos();
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Erro ao salvar equipamento. Tente novamente.';
      setErroFormulario(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  // Alternar status (Ativar / Inativar)
  const aoAlternarStatus = async (eq) => {
    const novoStatus = !eq.ativo;
    const acaoTexto = novoStatus ? 'reativar' : 'inativar';

    if (!confirm(`Deseja realmente ${acaoTexto} o equipamento "${eq.descricao}"?`)) {
      return;
    }

    try {
      await api.patch(`/equipamentos/${eq.id}/status`, { ativo: novoStatus });
      buscarEquipamentos();
    } catch (err) {
      alert(err.response?.data?.error || `Não foi possível ${acaoTexto} o equipamento.`);
    }
  };

  return (
    <div className="page-shell">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Equipamentos</h1>
          <p className="page-subtitle">Controle de aparelhos e dispositivos vinculados aos clientes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarModalParametros(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:translate-y-px"
          >
            <Sliders className="w-4 h-4 text-slate-600" />
            <span>Parâmetro de Equipamento</span>
          </button>
          <button onClick={abrirModalCriacao} className="primary-action">
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros Avançados */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por descrição, número de série, cliente, marca ou modelo..."
            className="search-control"
            maxLength={150}
          />
        </div>

        {/* Filtro por Categoria */}
<<<<<<< HEAD
        <div className="w-full sm:w-auto lg:w-52">
=======
        <div className="w-full lg:w-48">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          <select
            value={categoriaFiltro}
            onChange={(e) => {
              setCategoriaFiltro(e.target.value);
              setPagina(1);
            }}
<<<<<<< HEAD
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-700 shadow-xs focus:border-slate-400 focus:outline-none transition"
=======
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs focus:border-slate-400 focus:outline-none transition"
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          >
            <option value="">Todas as Categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Marca */}
<<<<<<< HEAD
        <div className="w-full sm:w-auto lg:w-52">
=======
        <div className="w-full lg:w-48">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          <select
            value={marcaFiltro}
            onChange={(e) => {
              setMarcaFiltro(e.target.value);
              setPagina(1);
            }}
<<<<<<< HEAD
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-700 shadow-xs focus:border-slate-400 focus:outline-none transition"
=======
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs focus:border-slate-400 focus:outline-none transition"
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          >
            <option value="">Todas as Marcas</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

<<<<<<< HEAD
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-3 rounded-xl shadow-xs hover:bg-slate-50 transition shrink-0">
=======
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 transition shrink-0">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
          <input
            type="checkbox"
            checked={exibirInativos}
            onChange={(e) => {
              setExibirInativos(e.target.checked);
              setPagina(1);
            }}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-4 w-4"
          />
          <span>Exibir inativos</span>
        </label>
      </div>

      {/* Tabela de Equipamentos */}
      <div className="table-shell">
        {carregando ? (
          <div className="p-8 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span>Carregando equipamentos...</span>
          </div>
        ) : equipamentos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400 mt-1">
              {busca ? 'Nenhum equipamento localizado com os termos informados.' : 'Nenhum equipamento cadastrado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th
                    onClick={() => alternarOrdenacao('descricao')}
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/75 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Equipamento / Série</span>
                      {renderIconeOrdenacao('descricao')}
                    </div>
                  </th>
                  <th
                    onClick={() => alternarOrdenacao('clienteNome')}
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/75 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente Proprietário</span>
                      {renderIconeOrdenacao('clienteNome')}
                    </div>
                  </th>
                  <th
                    onClick={() => alternarOrdenacao('categoriaNome')}
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/75 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Categoria</span>
                      {renderIconeOrdenacao('categoriaNome')}
                    </div>
                  </th>
                  <th
                    onClick={() => alternarOrdenacao('marcaNome')}
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/75 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Marca / Modelo</span>
                      {renderIconeOrdenacao('marcaNome')}
                    </div>
                  </th>
                  <th
                    onClick={() => alternarOrdenacao('ativo')}
                    className="px-6 py-4 cursor-pointer select-none hover:bg-slate-100/75 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {renderIconeOrdenacao('ativo')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipamentos.map((eq) => {
                  const statusAtivo = eq.ativo !== false && eq.ativo !== 0;
                  const marcaExibicao = eq.marcaNome || 'Marca não informada';
                  const modeloExibicao = eq.modeloNome ? `(${eq.modeloNome})` : '';

                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{eq.descricao}</div>
                        {eq.numeroSerie && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-mono">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span>{/^\d+$/.test(String(eq.numeroSerie).trim()) ? `ID: ${eq.numeroSerie}` : `S/N: ${eq.numeroSerie}`}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{eq.clienteNome || 'Cliente não identificado'}</span>
                        </div>
                        {eq.clienteTelefone && (
                          <div className="text-xs text-slate-400 mt-0.5">{eq.clienteTelefone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {eq.categoriaNome || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 text-xs font-medium">
                          {marcaExibicao} {modeloExibicao}
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
                            onClick={() => abrirModalEdicao(eq)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                            title="Editar Equipamento"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => aoAlternarStatus(eq)}
                            className={`p-1.5 rounded-md transition-colors ${
                              statusAtivo
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={statusAtivo ? 'Inativar Equipamento' : 'Reativar Equipamento'}
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
            <Pagination
              paginaAtual={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={totalEquipamentos}
              limite={limite}
              aoMudarPagina={(novaPagina) => setPagina(novaPagina)}
            />
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarEquipamento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Proprietário *
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cpf ? `(${c.cpf})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria de Equipamento *
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca
                  </label>
                  <select
                    value={marcaId}
                    onChange={(e) => {
                      setMarcaId(e.target.value);
                      setModeloId('');
                    }}
                    className="form-control"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo
                  </label>
                  <select
                    value={modeloId}
                    onChange={(e) => setModeloId(e.target.value)}
                    disabled={!marcaId}
                    className="form-control disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {marcaId ? 'Selecione o modelo...' : 'Escolha a marca primeiro'}
                    </option>
                    {modelosFiltrados.map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Problema Inicial *
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Notebook liga mas não dá vídeo"
                  maxLength={255}
                  required
                  className="form-control"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Número de Série / Identificador (Opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Se vazio, gera ID automático (1, 2, 3...)
                  </span>
                </div>
                <input
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="Ex: SN-987456123 (ou deixe vazio para gerar ID 1, 2...)"
                  maxLength={100}
                  className="form-control"
                />
              </div>

              {estaEditando && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status do Equipamento
                  </label>
                  <select
                    value={ativo ? '1' : '0'}
                    onChange={(e) => setAtivo(e.target.value === '1')}
                    className="form-control"
                  >
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>
              )}

<<<<<<< HEAD
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
=======
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
>>>>>>> db487ae2b8afd00805ef06ab93dea14cdd63002a
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

      {/* Modal de Parâmetros de Equipamento (Categorias, Marcas e Modelos) */}
      <EquipmentParametersModal
        aberto={mostrarModalParametros}
        aoFechar={() => setMostrarModalParametros(false)}
        categorias={categorias}
        marcas={marcas}
        modelos={modelos}
        aoAtualizar={carregarAuxiliares}
      />
    </div>
  );
};

