import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Loader2, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export const ClientsPage = () => {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulario
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('Viradouro');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('ATIVO');
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const buscarClientes = async () => {
    try {
      setCarregando(true);
      const resposta = await api.get(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);
      setClientes(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar clientes:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarClientes();
  }, [busca]);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setNome('');
    setCpf('');
    setEmail('');
    setTelefone('');
    setCidade('Viradouro');
    setEndereco('');
    setObservacoes('');
    setStatus('ATIVO');
    setMostrarModal(true);
  };

  const abrirModalEdicao = (cliente) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(cliente.id);
    setNome(cliente.nome || cliente.name || '');
    setCpf(cliente.cpf || '');
    setEmail(cliente.email || '');
    setTelefone(cliente.telefone || cliente.phone || '');
    setCidade(cliente.cidade || cliente.city || 'Viradouro');
    setEndereco(cliente.endereco || cliente.address || '');
    setObservacoes(cliente.observacoes || cliente.notes || '');
    setStatus(cliente.status === 'ATIVO' ? 'ATIVO' : 'INATIVO');
    setMostrarModal(true);
  };

  const aoSalvarCliente = async (e) => {
    e.preventDefault();
    setErroFormulario('');
    setSalvando(true);

    try {
      const dados = {
        nome: nome.trim(),
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim(),
        cidade: cidade.trim() || 'Viradouro',
        endereco: endereco.trim() || null,
        observacoes: observacoes.trim() || null,
        status,
      };

      if (estaEditando && idEmEdicao) {
        await api.put(`/clientes/${idEmEdicao}`, dados);
      } else {
        await api.post('/clientes', dados);
      }

      setMostrarModal(false);
      buscarClientes();
    } catch (err) {
      const mensagemErro = err.response?.data?.error || 'Verifique as informações preenchidas e tente novamente.';
      setErroFormulario(mensagemErro);
    } finally {
      setSalvando(false);
    }
  };

  const aoExcluirCliente = async (id, nomeCliente) => {
    if (!confirm(`Deseja realmente excluir o cliente "${nomeCliente}"?`)) {
      return;
    }

    try {
      await api.delete(`/clientes/${id}`);
      buscarClientes();
    } catch (err) {
      alert(err.response?.data?.error || 'Não foi possível excluir o cliente selecionado.');
    }
  };

  return (
    <div className="page-shell">
      {/* Cabecalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Clientes</h1>
        </div>
        <button
          onClick={abrirModalCriacao}
          className="primary-action"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente "
          className="search-control"
        />
      </div>

      {/* Tabela de Clientes */}
      <div className="table-shell">
        {carregando ? (
          <div className="p-8 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <span>Carregando clientes...</span>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400 mt-1">
              {busca ? 'Tente buscar com outros termos.' : 'Nenhum cliente encontrado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nome / CPF</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((cliente) => {
                  const nomeExibicao = cliente.nome || cliente.name || '';
                  const telefoneExibicao = cliente.telefone || cliente.phone || '';
                  const cidadeExibicao = cliente.cidade || cliente.city || 'Viradouro';
                  const enderecoExibicao = cliente.endereco || cliente.address || '';
                  const statusAtivo = cliente.status === 'ATIVO';

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{nomeExibicao}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {cliente.cpf ? `CPF: ${cliente.cpf}` : 'CPF não informado'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{telefoneExibicao}</span>
                        </div>
                        {cliente.email && (
                          <div className="text-xs text-slate-400 mt-0.5">{cliente.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cidadeExibicao}</span>
                        </div>
                        {enderecoExibicao && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={enderecoExibicao}>
                            {enderecoExibicao}
                          </div>
                        )}
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
                            onClick={() => abrirModalEdicao(cliente)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                            title="Editar Cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => aoExcluirCliente(cliente.id, nomeExibicao)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="Excluir Cliente"
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

      {/* Modal de Cadastro / Edicao de Cliente */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cliente"
                  required
                  className="form-control"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    required
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
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
                    className="form-control"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="form-control"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas internas sobre o cliente..."
                  rows={2}
                  className="form-control resize-none"
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
