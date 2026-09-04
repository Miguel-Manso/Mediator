import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Plus, Mail, Shield, Loader2, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const UsersPage = () => {
  const { usuario: usuarioAtual, user: userAtual } = useAuth();
  const usuarioLogado = usuarioAtual || userAtual;

  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulario
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('ATENDENTE');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('Viradouro');
  const [status, setStatus] = useState('ATIVO');
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const buscarUsuarios = async () => {
    try {
      setCarregando(true);
      const resposta = await api.get('/usuarios');
      setUsuarios(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar usuários:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarUsuarios();
  }, []);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setNome('');
    setEmail('');
    setSenha('');
    setCargo('ATENDENTE');
    setTelefone('');
    setCidade('Viradouro');
    setStatus('ATIVO');
    setMostrarModal(true);
  };

  const abrirModalEdicao = (usuario) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(usuario.id);
    setNome(usuario.nome || usuario.name || '');
    setEmail(usuario.email);
    setSenha('');
    const cargoFormatado = usuario.cargo || (usuario.role === 'ATTENDANT' ? 'ATENDENTE' : usuario.role === 'TECHNICIAN' ? 'TECNICO' : usuario.role) || 'ATENDENTE';
    setCargo(cargoFormatado);
    setTelefone(usuario.telefone || usuario.phone || '');
    setCidade(usuario.cidade || usuario.city || 'Viradouro');
    setStatus(usuario.status === 'ATIVO' ? 'ATIVO' : 'INATIVO');
    setMostrarModal(true);
  };

  const aoSalvarUsuario = async (e) => {
    e.preventDefault();
    setErroFormulario('');
    setSalvando(true);

    try {
      if (!estaEditando && (!senha || senha.length < 6)) {
        setErroFormulario('A senha deve ter no mínimo 6 caracteres.');
        setSalvando(false);
        return;
      }

      const dados = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cargo,
        telefone: telefone.trim() || null,
        cidade: cidade.trim() || 'Viradouro',
        status,
      };

      if (senha && senha.trim()) {
        dados.senha = senha;
      }

      if (estaEditando && idEmEdicao) {
        await api.put(`/usuarios/${idEmEdicao}`, dados);
      } else {
        await api.post('/usuarios', dados);
      }

      setMostrarModal(false);
      buscarUsuarios();
    } catch (err) {
      const mensagemErro = err.response?.data?.error || 'Verifique as informações e tente novamente.';
      setErroFormulario(mensagemErro);
    } finally {
      setSalvando(false);
    }
  };

  const aoExcluirUsuario = async (id, nomeUsuario) => {
    if (usuarioLogado?.id === id) {
      alert('Você não pode excluir a sua própria conta logada.');
      return;
    }

    if (!confirm(`Deseja realmente excluir o colaborador "${nomeUsuario}"?`)) {
      return;
    }

    try {
      await api.delete(`/usuarios/${id}`);
      buscarUsuarios();
    } catch (err) {
      alert(err.response?.data?.error || 'Não foi possível excluir o usuário selecionado.');
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    const nomeU = (u.nome || u.name || '').toLowerCase();
    const emailU = (u.email || '').toLowerCase();
    return nomeU.includes(termo) || emailU.includes(termo);
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Usuários</h1>
        </div>
        <button
          onClick={abrirModalCriacao}
          className="primary-action"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar usuário por nome ou e-mail..."
          className="search-control"
        />
      </div>

      {/* Tabela de Usuarios */}
      <div className="table-shell">
        {carregando ? (
          <div className="p-8 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span>Carregando usuários...</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400 mt-1">
              {busca ? 'Tente buscar com outros termos.' : 'Nenhum usuário cadastrado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map((u) => {
                  const nomeExibicao = u.nome || u.name || '';
                  const cargoExibicao = u.cargo || (u.role === 'ATTENDANT' ? 'ATENDENTE' : u.role === 'TECHNICIAN' ? 'TECNICO' : u.role) || 'ATENDENTE';
                  const telefoneExibicao = u.telefone || u.phone || '';
                  const statusAtivo = u.status === 'ATIVO';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{nomeExibicao}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-semibold">
                            {cargoExibicao === 'ADMIN' ? 'Administrador' : cargoExibicao === 'TECNICO' ? 'Técnico' : 'Atendente'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 text-xs">
                          {telefoneExibicao || 'Sem telefone'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {u.cidade || u.city || 'Viradouro'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge ${
                            statusAtivo ? 'badge-active' : 'badge-inactive'
                          }`}
                        >
                          {statusAtivo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModalEdicao(u)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                            title="Editar Usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => aoExcluirUsuario(u.id, nomeExibicao)}
                            disabled={usuarioLogado?.id === u.id}
                            className={`p-1.5 rounded-md transition-colors ${
                              usuarioLogado?.id === u.id
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={usuarioLogado?.id === u.id ? 'Não é possível excluir seu próprio usuário' : 'Excluir Usuário'}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal de Cadastro / Edicao de Usuario */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarUsuario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do colaborador"
                  required
                  className="form-control"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colaborador@mediator.com"
                    required
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {estaEditando ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={estaEditando ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                    required={!estaEditando}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo / Função
                  </label>
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="form-control"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="ATENDENTE">Atendente</option>
                    <option value="TECNICO">Técnico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Viradouro"
                    className="form-control"
                  />
                </div>

                {estaEditando && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="form-control"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
