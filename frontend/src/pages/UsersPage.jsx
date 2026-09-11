import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Plus, Mail, Shield, Loader2, Edit, UserX, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';

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
  const [confirmEmail, setConfirmEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [cargo, setCargo] = useState('ATENDENTE');
  const [telefone, setTelefone] = useState('');

  // Endereço estruturado
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('Viradouro');
  const [uf, setUf] = useState('SP');
  const [cep, setCep] = useState('');

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
    setConfirmEmail('');
    setCpf('');
    setSenha('');
    setConfirmSenha('');
    setCargo('ATENDENTE');
    setTelefone('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('Viradouro');
    setUf('SP');
    setCep('');
    setStatus('ATIVO');
    setMostrarModal(true);
  };

  const abrirModalEdicao = (usuario) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(usuario.id);
    setNome(usuario.nome || usuario.name || '');
    setEmail(usuario.email || '');
    setConfirmEmail(usuario.email || '');
    setCpf(maskCPF(usuario.cpf || ''));
    setSenha('');
    setConfirmSenha('');
    const cargoFormatado =
      usuario.cargo ||
      (usuario.role === 'ATTENDANT'
        ? 'ATENDENTE'
        : usuario.role === 'TECHNICIAN'
        ? 'TECNICO'
        : usuario.role) ||
      'ATENDENTE';
    setCargo(cargoFormatado);
    setTelefone(maskPhone(usuario.telefone || usuario.phone || ''));

    // Endereço estruturado
    setLogradouro(usuario.logradouro || '');
    setNumero(usuario.numero || '');
    setComplemento(usuario.complemento || '');
    setBairro(usuario.bairro || '');
    setCidade(usuario.cidade || usuario.city || 'Viradouro');
    setUf(usuario.uf || 'SP');
    setCep(maskCEP(usuario.cep || ''));

    setStatus(usuario.status === 'ATIVO' ? 'ATIVO' : 'INATIVO');
    setMostrarModal(true);
  };

  const aoSalvarUsuario = async (e) => {
    e.preventDefault();
    setErroFormulario('');

    // Validacao de correspondencia de e-mail
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setErroFormulario('A confirmação de e-mail não confere com o e-mail informado.');
      return;
    }

    // Validacao de senha na criacao
    if (!estaEditando && (!senha || senha.length < 6)) {
      setErroFormulario('A senha é obrigatória e deve ter pelo menos 6 caracteres.');
      return;
    }

    // Validacao de correspondencia de senha (criacao ou edicao caso digitada)
    if ((!estaEditando || senha.trim()) && senha !== confirmSenha) {
      setErroFormulario('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setSalvando(true);

    try {
      const dados = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        confirmEmail: confirmEmail.trim().toLowerCase(),
        cpf: cpf.trim() || null,
        cargo,
        telefone: telefone.trim() || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || 'Viradouro',
        uf: uf.trim().toUpperCase() || 'SP',
        cep: cep.trim() || null,
        status,
      };

      if (senha && senha.trim()) {
        dados.senha = senha;
        dados.confirmSenha = confirmSenha;
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

  // Desativar colaborador (Soft Delete)
  const aoDesativarUsuario = async (id, nomeUsuario) => {
    if (usuarioLogado?.id === id) {
      alert('Você não pode desativar a sua própria conta logada no sistema.');
      return;
    }

    if (!confirm(`Deseja realmente desativar o colaborador "${nomeUsuario}"? Ele perderá acesso ao sistema.`)) {
      return;
    }

    try {
      await api.delete(`/usuarios/${id}`);
      buscarUsuarios();
    } catch (err) {
      alert(err.response?.data?.error || 'Não foi possível desativar o colaborador selecionado.');
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    const nomeU = (u.nome || u.name || '').toLowerCase();
    const emailU = (u.email || '').toLowerCase();
    const cpfU = (u.cpf || '').toLowerCase();
    return nomeU.includes(termo) || emailU.includes(termo) || cpfU.includes(termo);
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
          placeholder="Buscar usuário por nome, e-mail ou CPF..."
          className="search-control"
          maxLength={180}
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
                  const cargoExibicao =
                    u.cargo ||
                    (u.role === 'ATTENDANT'
                      ? 'ATENDENTE'
                      : u.role === 'TECHNICIAN'
                      ? 'TECNICO'
                      : u.role) ||
                    'ATENDENTE';
                  const telefoneExibicao = u.telefone || u.phone || '';
                  const statusAtivo = (u.status === 'ATIVO' || u.status === 'ACTIVE') && u.ativo !== false && u.ativo !== 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{nomeExibicao}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.cpf ? (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            CPF: {maskCPF(u.cpf)}
                          </div>
                        ) : null}
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
                          {telefoneExibicao ? maskPhone(telefoneExibicao) : 'Sem telefone'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{u.cidade || u.city || 'Viradouro'}{u.uf ? `/${u.uf}` : ''}</span>
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
                            title="Editar Colaborador"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => aoDesativarUsuario(u.id, nomeExibicao)}
                            disabled={usuarioLogado?.id === u.id || !statusAtivo}
                            className={`p-1.5 rounded-md transition-colors ${
                              usuarioLogado?.id === u.id || !statusAtivo
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              usuarioLogado?.id === u.id
                                ? 'Você não pode desativar seu próprio usuário'
                                : !statusAtivo
                                ? 'Colaborador já inativo'
                                : 'Desativar colaborador'
                            }
                          >
                            <UserX className="w-4 h-4" />
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
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarUsuario} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do colaborador"
                    maxLength={120}
                    required
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Email e Confirmacao de Email */}
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
                    maxLength={180}
                    required
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar E-mail *
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Repita o e-mail"
                    maxLength={180}
                    required
                    className="form-control"
                  />
                </div>
              </div>

              {/* Senha e Confirmacao de Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {estaEditando ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={estaEditando ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                    maxLength={100}
                    required={!estaEditando}
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    value={confirmSenha}
                    onChange={(e) => setConfirmSenha(e.target.value)}
                    placeholder="Repita a senha"
                    maxLength={100}
                    required={!estaEditando || !!senha}
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
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Endereço Estruturado do Colaborador */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Endereço e Localização (Opcional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Logradouro / Rua
                    </label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Rua São Paulo"
                      maxLength={255}
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123"
                      maxLength={20}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Apto 12"
                      maxLength={100}
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Centro"
                      maxLength={100}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(maskCEP(e.target.value))}
                      placeholder="14740-000"
                      maxLength={9}
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Viradouro"
                      maxLength={100}
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      UF
                    </label>
                    <input
                      type="text"
                      value={uf}
                      onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      maxLength={2}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {estaEditando && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status da Conta
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
