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
  Settings2,
  Layers,
  Trash2,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { sanitizeAlphanumeric } from '../utils/masks';
import { Pagination } from '../components/Pagination';

export const EquipmentsPage = () => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Estados de paginação
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Dados auxiliares para selects
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);

  // Estados do modal de equipamento
  const [mostrarModal, setMostrarModal] = useState(false);
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

  // Estados para o Gerenciador de Parâmetros Auxiliares (Categorias, Marcas, Modelos)
  const [mostrarModalGerenciador, setMostrarModalGerenciador] = useState(false);
  const [abaGerenciador, setAbaGerenciador] = useState('categorias'); // 'categorias' | 'marcas' | 'modelos'

  // Categorias no gerenciador
  const [catEditId, setCatEditId] = useState(null);
  const [catNome, setCatNome] = useState('');
  const [salvandoCat, setSalvandoCat] = useState(false);
  const [erroCat, setErroCat] = useState('');
  const [sucessoCat, setSucessoCat] = useState('');

  // Marcas no gerenciador
  const [marcaEditId, setMarcaEditId] = useState(null);
  const [marcaNome, setMarcaNome] = useState('');
  const [salvandoMarca, setSalvandoMarca] = useState(false);
  const [erroMarca, setErroMarca] = useState('');
  const [sucessoMarca, setSucessoMarca] = useState('');

  // Modelos no gerenciador
  const [modeloEditId, setModeloEditId] = useState(null);
  const [modeloNome, setModeloNome] = useState('');
  const [modeloMarcaId, setModeloMarcaId] = useState('');
  const [filtroMarcaModelos, setFiltroMarcaModelos] = useState('');
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [erroModelo, setErroModelo] = useState('');
  const [sucessoModelo, setSucessoModelo] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar dados de equipamentos com paginação e busca
  const buscarEquipamentos = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca && busca.trim()) params.append('busca', busca.trim());
      params.append('pagina', String(pagina));
      params.append('limite', String(limite));

      const resposta = await api.get(`/equipamentos?${params.toString()}`);
      const lista = Array.isArray(resposta.data)
        ? resposta.data
        : resposta.data.dados || resposta.data.equipamentos || [];
      const meta = resposta.data.paginacao || {
        pagina: 1,
        limite,
        total: lista.length,
        totalPaginas: 1,
      };

      setEquipamentos(lista);
      setTotalRegistros(meta.total);
      setTotalPaginas(meta.totalPaginas);
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
    setPagina(1);
  }, [busca]);

  useEffect(() => {
    buscarEquipamentos();
  }, [busca, pagina, limite]);

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

  // --- Handlers do Gerenciador de Parâmetros Auxiliares ---
  const abrirModalGerenciador = (aba = 'categorias') => {
    setAbaGerenciador(aba);
    setCatEditId(null);
    setCatNome('');
    setErroCat('');
    setSucessoCat('');

    setMarcaEditId(null);
    setMarcaNome('');
    setErroMarca('');
    setSucessoMarca('');

    setModeloEditId(null);
    setModeloNome('');
    setModeloMarcaId(marcas.length > 0 ? marcas[0].id : '');
    setFiltroMarcaModelos('');
    setErroModelo('');
    setSucessoModelo('');

    setMostrarModalGerenciador(true);
  };

  // 1. Categorias
  const aoSalvarCategoriaGerenciador = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const nomeLimpo = catNome.trim();
    if (!nomeLimpo) return;

    try {
      setSalvandoCat(true);
      setErroCat('');
      setSucessoCat('');

      if (catEditId) {
        await api.put(`/equipamentos/categorias/${catEditId}`, { nome: nomeLimpo });
        setSucessoCat('Categoria atualizada com sucesso!');
      } else {
        await api.post('/equipamentos/categorias', { nome: nomeLimpo });
        setSucessoCat('Categoria criada com sucesso!');
      }

      setCatEditId(null);
      setCatNome('');
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroCat(err.response?.data?.error || 'Erro ao salvar categoria.');
    } finally {
      setSalvandoCat(false);
    }
  };

  const aoIniciarEdicaoCategoria = (cat) => {
    setCatEditId(cat.id);
    setCatNome(cat.nome);
    setErroCat('');
    setSucessoCat('');
  };

  const aoCancelarEdicaoCategoria = () => {
    setCatEditId(null);
    setCatNome('');
    setErroCat('');
  };

  const aoInativarCategoriaGerenciador = async (cat) => {
    if (!confirm(`Deseja realmente inativar a categoria "${cat.nome}"?`)) return;

    try {
      setErroCat('');
      setSucessoCat('');
      await api.delete(`/equipamentos/categorias/${cat.id}`);
      setSucessoCat(`Categoria "${cat.nome}" inativada com sucesso.`);
      if (catEditId === cat.id) {
        aoCancelarEdicaoCategoria();
      }
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroCat(err.response?.data?.error || 'Não foi possível inativar a categoria.');
    }
  };

  // 2. Marcas
  const aoSalvarMarcaGerenciador = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const nomeLimpo = marcaNome.trim();
    if (!nomeLimpo) return;

    try {
      setSalvandoMarca(true);
      setErroMarca('');
      setSucessoMarca('');

      if (marcaEditId) {
        await api.put(`/equipamentos/marcas/${marcaEditId}`, { nome: nomeLimpo });
        setSucessoMarca('Marca atualizada com sucesso!');
      } else {
        await api.post('/equipamentos/marcas', { nome: nomeLimpo });
        setSucessoMarca('Marca cadastrada com sucesso!');
      }

      setMarcaEditId(null);
      setMarcaNome('');
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroMarca(err.response?.data?.error || 'Erro ao salvar marca.');
    } finally {
      setSalvandoMarca(false);
    }
  };

  const aoIniciarEdicaoMarca = (m) => {
    setMarcaEditId(m.id);
    setMarcaNome(m.nome);
    setErroMarca('');
    setSucessoMarca('');
  };

  const aoCancelarEdicaoMarca = () => {
    setMarcaEditId(null);
    setMarcaNome('');
    setErroMarca('');
  };

  const aoInativarMarcaGerenciador = async (m) => {
    if (!confirm(`Deseja realmente inativar a marca "${m.nome}"?\n\nATENÇÃO: Todos os modelos associados a esta marca também serão inativados.`)) {
      return;
    }

    try {
      setErroMarca('');
      setSucessoMarca('');
      await api.delete(`/equipamentos/marcas/${m.id}`);
      setSucessoMarca(`Marca "${m.nome}" e seus modelos foram inativados.`);
      if (marcaEditId === m.id) {
        aoCancelarEdicaoMarca();
      }
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroMarca(err.response?.data?.error || 'Não foi possível inativar a marca.');
    }
  };

  // 3. Modelos
  const aoSalvarModeloGerenciador = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const nomeLimpo = modeloNome.trim();
    if (!nomeLimpo) {
      setErroModelo('O nome do modelo é obrigatório.');
      return;
    }
    if (!modeloMarcaId) {
      setErroModelo('Selecione a marca do modelo.');
      return;
    }

    try {
      setSalvandoModelo(true);
      setErroModelo('');
      setSucessoModelo('');

      if (modeloEditId) {
        await api.put(`/equipamentos/modelos/${modeloEditId}`, {
          nome: nomeLimpo,
          marcaId: modeloMarcaId,
        });
        setSucessoModelo('Modelo atualizado com sucesso!');
      } else {
        await api.post('/equipamentos/modelos', {
          nome: nomeLimpo,
          marcaId: modeloMarcaId,
        });
        setSucessoModelo('Modelo cadastrado com sucesso!');
      }

      setModeloEditId(null);
      setModeloNome('');
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroModelo(err.response?.data?.error || 'Erro ao salvar modelo.');
    } finally {
      setSalvandoModelo(false);
    }
  };

  const aoIniciarEdicaoModelo = (mod) => {
    setModeloEditId(mod.id);
    setModeloNome(mod.nome);
    setModeloMarcaId(mod.marcaId || mod.marca_id || '');
    setErroModelo('');
    setSucessoModelo('');
  };

  const aoCancelarEdicaoModelo = () => {
    setModeloEditId(null);
    setModeloNome('');
    setErroModelo('');
  };

  const aoInativarModeloGerenciador = async (mod) => {
    if (!confirm(`Deseja realmente inativar o modelo "${mod.nome}"?`)) return;

    try {
      setErroModelo('');
      setSucessoModelo('');
      await api.delete(`/equipamentos/modelos/${mod.id}`);
      setSucessoModelo(`Modelo "${mod.nome}" inativado com sucesso.`);
      if (modeloEditId === mod.id) {
        aoCancelarEdicaoModelo();
      }
      await carregarAuxiliares();
      buscarEquipamentos();
    } catch (err) {
      setErroModelo(err.response?.data?.error || 'Não foi possível inativar o modelo.');
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => abrirModalGerenciador('categorias')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 active:bg-slate-100"
            title="Gerenciar Categorias, Marcas e Modelos"
          >
            <Settings2 className="w-4 h-4 text-slate-500" />
            <span>Gerenciar Parâmetros</span>
          </button>
          <button onClick={abrirModalCriacao} className="primary-action">
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por descrição, número de série, cliente, marca ou modelo..."
          className="search-control"
          maxLength={150}
        />
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
                  <th className="px-6 py-4">Equipamento / Série</th>
                  <th className="px-6 py-4">Cliente Proprietário</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Marca / Modelo</th>
                  <th className="px-6 py-4">Status</th>
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
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 font-mono">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span>S/N: {eq.numeroSerie}</span>
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
          </div>
        )}

        {/* Rodapé de Paginação Reutilizável */}
        {!carregando && equipamentos.length > 0 && (
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
          />
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarEquipamento} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* Cliente Proprietário (VARCHAR(36) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
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

                {/* Categoria de Equipamento (INT -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
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

                {/* Marca (VARCHAR(36) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
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

                {/* Modelo (VARCHAR(36) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo
                  </label>
                  <select
                    value={modeloId}
                    onChange={(e) => setModeloId(e.target.value)}
                    disabled={!marcaId}
                    className="form-control disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">{marcaId ? 'Selecione o modelo...' : 'Escolha a marca primeiro'}</option>
                    {modelosFiltrados.map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descrição / Problema Inicial (NVARCHAR(255) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
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

                {/* Número de Série (NVARCHAR(100) -> col-span-7 se editando, col-span-12 se criando) */}
                <div className={`col-span-1 ${estaEditando ? 'sm:col-span-7' : 'sm:col-span-12'}`}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Série / Identificador (Opcional)
                  </label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(sanitizeAlphanumeric(e.target.value, 100))}
                    placeholder="Ex: SN-987456123 / IMEI"
                    maxLength={100}
                    className="form-control font-mono"
                  />
                </div>

                {/* Status do Equipamento (BIT / NVARCHAR(20) -> col-span-5 quando editando) */}
                {estaEditando && (
                  <div className="col-span-1 sm:col-span-5">
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

      {/* Modal Gerenciador de Parâmetros Auxiliares (Categorias, Marcas, Modelos) */}
      {mostrarModalGerenciador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Gerenciador de Parâmetros
                  </h2>
                  <p className="text-xs text-slate-500">
                    Controle de Categorias, Marcas e Modelos vinculados aos equipamentos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalGerenciador(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex items-center gap-1 mt-3 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setAbaGerenciador('categorias')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  abaGerenciador === 'categorias'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Categorias</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                  {categorias.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaGerenciador('marcas')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  abaGerenciador === 'marcas'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Marcas</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                  {marcas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaGerenciador('modelos')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  abaGerenciador === 'modelos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Modelos</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                  {modelos.length}
                </span>
              </button>
            </div>

            {/* Conteúdo com rolagem */}
            <div className="flex-1 overflow-y-auto pt-4 pr-1">
              
              {/* ABA 1: CATEGORIAS */}
              {abaGerenciador === 'categorias' && (
                <div className="space-y-4">
                  {erroCat && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 font-medium flex items-center justify-between">
                      <span>{erroCat}</span>
                      <button type="button" onClick={() => setErroCat('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {sucessoCat && (
                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium flex items-center justify-between">
                      <span>{sucessoCat}</span>
                      <button type="button" onClick={() => setSucessoCat('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Formulário de Criação / Edição */}
                  <form onSubmit={aoSalvarCategoriaGerenciador} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {catEditId ? 'Editar Categoria' : 'Nova Categoria'}
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={catNome}
                        onChange={(e) => setCatNome(e.target.value)}
                        placeholder="Ex: Drone, Câmera, Console, Impressora"
                        maxLength={100}
                        required
                        className="form-control flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1.5">
                        {catEditId && (
                          <button
                            type="button"
                            onClick={aoCancelarEdicaoCategoria}
                            className="secondary-action text-xs px-3 py-2"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={salvandoCat || !catNome.trim()}
                          className="primary-action text-xs px-4 py-2"
                        >
                          {salvandoCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : catEditId ? 'Salvar Alteração' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Lista de Categorias */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Nome da Categoria</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categorias.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                              Nenhuma categoria cadastrada.
                            </td>
                          </tr>
                        ) : (
                          categorias.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {cat.nome}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Ativo
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => aoIniciarEdicaoCategoria(cat)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-colors"
                                    title="Editar categoria"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => aoInativarCategoriaGerenciador(cat)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                    title="Inativar categoria"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 2: MARCAS */}
              {abaGerenciador === 'marcas' && (
                <div className="space-y-4">
                  {erroMarca && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 font-medium flex items-center justify-between">
                      <span>{erroMarca}</span>
                      <button type="button" onClick={() => setErroMarca('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {sucessoMarca && (
                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium flex items-center justify-between">
                      <span>{sucessoMarca}</span>
                      <button type="button" onClick={() => setSucessoMarca('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Formulário de Criação / Edição de Marca */}
                  <form onSubmit={aoSalvarMarcaGerenciador} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {marcaEditId ? 'Editar Marca' : 'Nova Marca'}
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={marcaNome}
                        onChange={(e) => setMarcaNome(e.target.value)}
                        placeholder="Ex: Asus, Dell, Lenovo, Apple"
                        maxLength={100}
                        required
                        className="form-control flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1.5">
                        {marcaEditId && (
                          <button
                            type="button"
                            onClick={aoCancelarEdicaoMarca}
                            className="secondary-action text-xs px-3 py-2"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={salvandoMarca || !marcaNome.trim()}
                          className="primary-action text-xs px-4 py-2"
                        >
                          {salvandoMarca ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : marcaEditId ? 'Salvar Alteração' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Lista de Marcas */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Nome da Marca</th>
                          <th className="px-4 py-2.5">Modelos Vinculados</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marcas.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                              Nenhuma marca cadastrada.
                            </td>
                          </tr>
                        ) : (
                          marcas.map((m) => {
                            const totalModelos = modelos.filter((mod) => String(mod.marcaId || mod.marca_id) === String(m.id)).length;
                            return (
                              <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {m.nome}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {totalModelos} modelo(s)
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Ativo
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => aoIniciarEdicaoMarca(m)}
                                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-colors"
                                      title="Editar marca"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => aoInativarMarcaGerenciador(m)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                      title="Inativar marca e modelos"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 3: MODELOS */}
              {abaGerenciador === 'modelos' && (
                <div className="space-y-4">
                  {erroModelo && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 font-medium flex items-center justify-between">
                      <span>{erroModelo}</span>
                      <button type="button" onClick={() => setErroModelo('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {sucessoModelo && (
                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 font-medium flex items-center justify-between">
                      <span>{sucessoModelo}</span>
                      <button type="button" onClick={() => setSucessoModelo('')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Formulário de Criação / Edição de Modelo */}
                  <form onSubmit={aoSalvarModeloGerenciador} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      {modeloEditId ? 'Editar Modelo' : 'Novo Modelo'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Marca *
                        </label>
                        <select
                          value={modeloMarcaId}
                          onChange={(e) => setModeloMarcaId(e.target.value)}
                          required
                          className="form-control text-xs"
                        >
                          <option value="">Selecione uma marca...</option>
                          {marcas.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={modeloEditId ? "sm:col-span-5" : "sm:col-span-6"}>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nome do Modelo *
                        </label>
                        <input
                          type="text"
                          value={modeloNome}
                          onChange={(e) => setModeloNome(e.target.value)}
                          placeholder="Ex: Vivobook 15, Inspiron 15"
                          maxLength={100}
                          required
                          className="form-control text-xs"
                        />
                      </div>

                      <div className={`flex items-end gap-1.5 ${modeloEditId ? "sm:col-span-3" : "sm:col-span-2"}`}>
                        {modeloEditId && (
                          <button
                            type="button"
                            onClick={aoCancelarEdicaoModelo}
                            className="secondary-action text-xs px-3 py-2 w-full justify-center"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={salvandoModelo || !modeloNome.trim() || !modeloMarcaId}
                          className="primary-action text-xs px-4 py-2 w-full justify-center whitespace-nowrap"
                        >
                          {salvandoModelo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : modeloEditId ? 'Salvar' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Barra de Filtro por Marca */}
                  <div className="flex items-center justify-between gap-3 py-2 border-t border-slate-100 mt-4">
                    <span className="text-xs font-semibold text-slate-700">Modelos Cadastrados</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">Filtrar por marca:</span>
                      <select
                        value={filtroMarcaModelos}
                        onChange={(e) => setFiltroMarcaModelos(e.target.value)}
                        className="form-control text-xs py-1.5 px-2.5 max-w-[200px]"
                      >
                        <option value="">Todas as marcas</option>
                        {marcas.map((m) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lista de Modelos */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Modelo</th>
                          <th className="px-4 py-2.5">Marca</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const filtrados = filtroMarcaModelos
                            ? modelos.filter((m) => String(m.marcaId || m.marca_id) === String(filtroMarcaModelos))
                            : modelos;

                          if (filtrados.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                                  Nenhum modelo localizado.
                                </td>
                              </tr>
                            );
                          }

                          return filtrados.map((mod) => {
                            const nomeDaMarca = marcas.find((m) => String(m.id) === String(mod.marcaId || mod.marca_id))?.nome || 'Marca não identificada';

                            return (
                              <tr key={mod.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {mod.nome}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                    {nomeDaMarca}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Ativo
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => aoIniciarEdicaoModelo(mod)}
                                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-colors"
                                      title="Editar modelo"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => aoInativarModeloGerenciador(mod)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                      title="Inativar modelo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Rodapé do Modal */}
            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMostrarModalGerenciador(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
