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
} from 'lucide-react';
import { api } from '../services/api';

export const EquipmentsPage = () => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Dados auxiliares para selects
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);

  // Estados do modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulário
  const [descricao, setDescricao] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [modeloId, setModeloId] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Estados para criação dinâmica rápida de Categoria, Marca e Modelo
  const [mostrarCriarCategoria, setMostrarCriarCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [mostrarCriarMarca, setMostrarCriarMarca] = useState(false);
  const [novaMarcaNome, setNovaMarcaNome] = useState('');
  const [mostrarCriarModelo, setMostrarCriarModelo] = useState(false);
  const [novoModeloNome, setNovoModeloNome] = useState('');
  const [salvandoRapido, setSalvandoRapido] = useState(false);
  const [erroRapido, setErroRapido] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar dados de equipamentos
  const buscarEquipamentos = async () => {
    try {
      setCarregando(true);
      const url = `/equipamentos${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`;
      const resposta = await api.get(url);
      setEquipamentos(resposta.data);
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
  }, [busca]);

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
    setMostrarCriarCategoria(false);
    setNovaCategoriaNome('');
    setMostrarCriarMarca(false);
    setMostrarCriarModelo(false);
    setNovaMarcaNome('');
    setNovoModeloNome('');
    setErroRapido('');
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
    setMostrarCriarCategoria(false);
    setNovaCategoriaNome('');
    setMostrarCriarMarca(false);
    setMostrarCriarModelo(false);
    setNovaMarcaNome('');
    setNovoModeloNome('');
    setErroRapido('');
    setMostrarModal(true);
  };

  // Criação rápida de Categoria
  const aoCriarCategoriaRapida = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!novaCategoriaNome.trim()) return;

    try {
      setSalvandoRapido(true);
      setErroRapido('');
      const resp = await api.post('/equipamentos/categorias', { nome: novaCategoriaNome.trim() });
      const catCriada = resp.data;
      setCategorias((prev) => [...prev, catCriada]);
      setCategoriaId(catCriada.id);
      setNovaCategoriaNome('');
      setMostrarCriarCategoria(false);
    } catch (err) {
      setErroRapido(err.response?.data?.error || 'Erro ao cadastrar categoria.');
    } finally {
      setSalvandoRapido(false);
    }
  };

  // Criação rápida de Marca
  const aoCriarMarcaRapida = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!novaMarcaNome.trim()) return;

    try {
      setSalvandoRapido(true);
      setErroRapido('');
      const resp = await api.post('/equipamentos/marcas', { nome: novaMarcaNome.trim() });
      const marcaCriada = resp.data;
      setMarcas((prev) => [...prev, marcaCriada]);
      setMarcaId(marcaCriada.id);
      setModeloId('');
      setNovaMarcaNome('');
      setMostrarCriarMarca(false);
    } catch (err) {
      setErroRapido(err.response?.data?.error || 'Erro ao cadastrar marca.');
    } finally {
      setSalvandoRapido(false);
    }
  };

  // Criação rápida de Modelo
  const aoCriarModeloRapido = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!novoModeloNome.trim() || !marcaId) return;

    try {
      setSalvandoRapido(true);
      setErroRapido('');
      const resp = await api.post('/equipamentos/modelos', {
        nome: novoModeloNome.trim(),
        marcaId,
      });
      const modeloCriado = resp.data;
      setModelos((prev) => [...prev, modeloCriado]);
      setModeloId(modeloCriado.id);
      setNovoModeloNome('');
      setMostrarCriarModelo(false);
    } catch (err) {
      setErroRapido(err.response?.data?.error || 'Erro ao cadastrar modelo.');
    } finally {
      setSalvandoRapido(false);
    }
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
        <button onClick={abrirModalCriacao} className="primary-action">
          <Plus className="w-4 h-4" />
          <span>Novo Equipamento</span>
        </button>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Categoria de Equipamento *
                  </label>
                  <button
                    type="button"
                    title="Cadastrar Nova Categoria"
                    onClick={() => {
                      setMostrarCriarCategoria(!mostrarCriarCategoria);
                      setMostrarCriarMarca(false);
                      setMostrarCriarModelo(false);
                      setNovaCategoriaNome('');
                      setErroRapido('');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5 hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{mostrarCriarCategoria ? 'Cancelar' : 'Nova Categoria'}</span>
                  </button>
                </div>

                {mostrarCriarCategoria ? (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-blue-950">Nova Categoria</span>
                      <button
                        type="button"
                        onClick={() => setMostrarCriarCategoria(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={novaCategoriaNome}
                        onChange={(e) => setNovaCategoriaNome(e.target.value)}
                        placeholder="Ex: Drone / Câmera / Console"
                        maxLength={100}
                        className="form-control text-xs py-1.5"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            aoCriarCategoriaRapida(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={aoCriarCategoriaRapida}
                        disabled={salvandoRapido || !novaCategoriaNome.trim()}
                        className="primary-action text-xs px-2.5 py-1.5 whitespace-nowrap"
                      >
                        {salvandoRapido ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Categoria'}
                      </button>
                    </div>
                    {erroRapido && (
                      <p className="text-[11px] text-red-600 mt-1">{erroRapido}</p>
                    )}
                  </div>
                ) : (
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
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Marca
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarCriarMarca(!mostrarCriarMarca);
                        setMostrarCriarModelo(false);
                        setNovaMarcaNome('');
                        setErroRapido('');
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{mostrarCriarMarca ? 'Cancelar' : 'Nova Marca'}</span>
                    </button>
                  </div>

                  {mostrarCriarMarca ? (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-blue-950">Nova Marca</span>
                        <button
                          type="button"
                          onClick={() => setMostrarCriarMarca(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={novaMarcaNome}
                          onChange={(e) => setNovaMarcaNome(e.target.value)}
                          placeholder="Ex: Asus, Acer, Xiaomi"
                          maxLength={100}
                          className="form-control text-xs py-1.5"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              aoCriarMarcaRapida(e);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={aoCriarMarcaRapida}
                          disabled={salvandoRapido || !novaMarcaNome.trim()}
                          className="primary-action text-xs px-2.5 py-1.5 whitespace-nowrap"
                        >
                          {salvandoRapido ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                        </button>
                      </div>
                      {erroRapido && (
                        <p className="text-[11px] text-red-600 mt-1">{erroRapido}</p>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Modelo
                    </label>
                    {marcaId && (
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarCriarModelo(!mostrarCriarModelo);
                          setMostrarCriarMarca(false);
                          setNovoModeloNome('');
                          setErroRapido('');
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5 hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{mostrarCriarModelo ? 'Cancelar' : 'Novo Modelo'}</span>
                      </button>
                    )}
                  </div>

                  {mostrarCriarModelo ? (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-blue-950">
                          Novo Modelo ({marcas.find((m) => String(m.id) === String(marcaId))?.nome || 'Marca'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setMostrarCriarModelo(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={novoModeloNome}
                          onChange={(e) => setNovoModeloNome(e.target.value)}
                          placeholder="Ex: Vivobook 15, Aspire 5"
                          maxLength={100}
                          className="form-control text-xs py-1.5"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              aoCriarModeloRapido(e);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={aoCriarModeloRapido}
                          disabled={salvandoRapido || !novoModeloNome.trim()}
                          className="primary-action text-xs px-2.5 py-1.5 whitespace-nowrap"
                        >
                          {salvandoRapido ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                        </button>
                      </div>
                      {erroRapido && (
                        <p className="text-[11px] text-red-600 mt-1">{erroRapido}</p>
                      )}
                    </div>
                  ) : (
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
                  )}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Série / Identificador (Opcional)
                </label>
                <input
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="Ex: SN-987456123 / IMEI"
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
