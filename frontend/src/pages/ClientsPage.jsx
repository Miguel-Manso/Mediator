import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, MapPin, Loader2, Edit, UserX } from 'lucide-react';
import { api } from '../services/api';
import {
  maskCPF,
  maskPhone,
  maskCEP,
  onlyLetters,
  blockInvalidNumberKeys,
  sanitizeAlphanumeric,
} from '../utils/masks';
import { Pagination } from '../components/Pagination';

export const ClientsPage = () => {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Estados de paginação
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [estaEditando, setEstaEditando] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState(null);

  // Estados do formulario
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Endereco estruturado
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('Viradouro');
  const [uf, setUf] = useState('SP');
  const [cep, setCep] = useState('');

  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('ATIVO');
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const buscarClientes = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (busca && busca.trim()) params.append('busca', busca.trim());
      params.append('pagina', String(pagina));
      params.append('limite', String(limite));

      const resposta = await api.get(`/clientes?${params.toString()}`);
      const lista = Array.isArray(resposta.data)
        ? resposta.data
        : resposta.data.dados || resposta.data.clientes || [];
      const meta = resposta.data.paginacao || {
        pagina: 1,
        limite,
        total: lista.length,
        totalPaginas: 1,
      };

      setClientes(lista);
      setTotalRegistros(meta.total);
      setTotalPaginas(meta.totalPaginas);
    } catch (erro) {
      console.error('Erro ao carregar clientes:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    setPagina(1);
  }, [busca]);

  useEffect(() => {
    buscarClientes();
  }, [busca, pagina, limite]);

  const abrirModalCriacao = () => {
    setErroFormulario('');
    setEstaEditando(false);
    setIdEmEdicao(null);
    setNome('');
    setCpf('');
    setEmail('');
    setConfirmEmail('');
    setTelefone('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('Viradouro');
    setUf('SP');
    setCep('');
    setObservacoes('');
    setStatus('ATIVO');
    setMostrarModal(true);
  };

  const abrirModalEdicao = (cliente) => {
    setErroFormulario('');
    setEstaEditando(true);
    setIdEmEdicao(cliente.id);
    setNome(cliente.nome || cliente.name || '');
    setCpf(maskCPF(cliente.cpf || ''));
    setEmail(cliente.email || '');
    setConfirmEmail(cliente.email || '');
    setTelefone(maskPhone(cliente.telefone || cliente.phone || ''));

    // Dados estruturados de endereco
    setLogradouro(cliente.logradouro || cliente.endereco || cliente.address || '');
    setNumero(cliente.numero || '');
    setComplemento(cliente.complemento || '');
    setBairro(cliente.bairro || '');
    setCidade(cliente.cidade || cliente.city || 'Viradouro');
    setUf(cliente.uf || 'SP');
    setCep(maskCEP(cliente.cep || ''));

    setObservacoes(cliente.observacoes || cliente.notes || '');
    setStatus(cliente.status === 'ATIVO' ? 'ATIVO' : 'INATIVO');
    setMostrarModal(true);
  };

  const aoSalvarCliente = async (e) => {
    e.preventDefault();
    setErroFormulario('');

    // Validacao de correspondencia de e-mail se preenchido
    if (email.trim()) {
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setErroFormulario('A confirmação de e-mail não coincide com o e-mail informado.');
        return;
      }
    }

    setSalvando(true);

    try {
      const dados = {
        nome: nome.trim(),
        cpf: cpf.trim() || null,
        email: email.trim() ? email.trim().toLowerCase() : null,
        confirmEmail: confirmEmail.trim() ? confirmEmail.trim().toLowerCase() : null,
        telefone: telefone.trim(),
        status,
        observacoes: observacoes.trim() || null,
        // Endereco estruturado
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || 'Viradouro',
        uf: uf.trim().toUpperCase() || 'SP',
        cep: cep.trim() || null,
        endereco: logradouro.trim() ? `${logradouro.trim()}${numero ? `, ${numero.trim()}` : ''}` : null,
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

  const aoDesativarCliente = async (id, nomeCliente) => {
    if (!confirm(`Deseja realmente desativar o cliente "${nomeCliente}"?`)) {
      return;
    }

    try {
      await api.delete(`/clientes/${id}`);
      buscarClientes();
    } catch (err) {
      alert(err.response?.data?.error || 'Não foi possível desativar o cliente selecionado.');
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
          placeholder="Buscar cliente por nome, CPF, telefone ou cidade..."
          className="search-control"
          maxLength={150}
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
                  <th className="px-6 py-4">Endereço / Localização</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((cliente) => {
                  const nomeExibicao = cliente.nome || cliente.name || '';
                  const telefoneExibicao = maskPhone(cliente.telefone || cliente.phone || '');
                  const cpfExibicao = cliente.cpf ? maskCPF(cliente.cpf) : 'CPF não informado';
                  const rua = cliente.logradouro || cliente.endereco || cliente.address || '';
                  const num = cliente.numero ? `, nº ${cliente.numero}` : '';
                  const bairro = cliente.bairro ? ` - ${cliente.bairro}` : '';
                  const cidadeUf = `${cliente.cidade || 'Viradouro'}/${cliente.uf || 'SP'}`;
                  const cepFmt = cliente.cep ? ` - CEP: ${maskCEP(cliente.cep)}` : '';
                  const enderecoCompleto = rua ? `${rua}${num}${bairro}, ${cidadeUf}${cepFmt}` : cidadeUf;
                  const statusAtivo = (cliente.status === 'ATIVO' || cliente.status === 'ACTIVE') && cliente.ativo !== false && cliente.ativo !== 0;

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{nomeExibicao}</div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          {cpfExibicao}
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
                          <span>{cidadeUf}</span>
                        </div>
                        {rua && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]" title={enderecoCompleto}>
                            {enderecoCompleto}
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
                            onClick={() => aoDesativarCliente(cliente.id, nomeExibicao)}
                            disabled={!statusAtivo}
                            className={`p-1.5 rounded-md transition-colors ${
                              !statusAtivo
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={!statusAtivo ? 'Cliente já inativo' : 'Desativar Cliente'}
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

        {/* Rodapé de Paginação Reutilizável */}
        {!carregando && clientes.length > 0 && (
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

      {/* Modal de Cadastro / Edicao de Cliente */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {estaEditando ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            {erroFormulario && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {erroFormulario}
              </div>
            )}

            <form onSubmit={aoSalvarCliente} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* Nome completo (NVARCHAR(150) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo do cliente"
                    maxLength={150}
                    required
                    className="form-control"
                  />
                </div>

                {/* CPF (NVARCHAR(14) -> col-span-5) */}
                <div className="col-span-1 sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onKeyDown={blockInvalidNumberKeys}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="form-control font-mono"
                  />
                </div>

                {/* Telefone (NVARCHAR(20) -> col-span-7) */}
                <div className="col-span-1 sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onKeyDown={blockInvalidNumberKeys}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                    className="form-control"
                  />
                </div>

                {/* E-mail (NVARCHAR(180) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    maxLength={180}
                    className="form-control"
                  />
                </div>

                {/* Confirmar E-mail (col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar E-mail
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Repita o e-mail"
                    maxLength={180}
                    className="form-control"
                  />
                </div>

                {/* Seção de Endereço Estruturado */}
                <div className="col-span-1 sm:col-span-12 pt-2 border-t border-slate-100">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Endereço e Localização
                  </span>
                </div>

                {/* Logradouro (NVARCHAR(255) -> col-span-9) */}
                <div className="col-span-1 sm:col-span-9">
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

                {/* Número (NVARCHAR(20) -> col-span-3) */}
                <div className="col-span-1 sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(sanitizeAlphanumeric(e.target.value, 20))}
                    placeholder="123"
                    maxLength={20}
                    className="form-control"
                  />
                </div>

                {/* Complemento (NVARCHAR(100) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto 42, Bloco B"
                    maxLength={100}
                    className="form-control"
                  />
                </div>

                {/* Bairro (NVARCHAR(100) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
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

                {/* CEP (NVARCHAR(9) -> col-span-4) */}
                <div className="col-span-1 sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onKeyDown={blockInvalidNumberKeys}
                    onChange={(e) => setCep(maskCEP(e.target.value))}
                    placeholder="14740-000"
                    maxLength={9}
                    className="form-control font-mono"
                  />
                </div>

                {/* Cidade (NVARCHAR(100) -> col-span-6) */}
                <div className="col-span-1 sm:col-span-6">
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

                {/* UF (NVARCHAR(2) -> col-span-2) */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    value={uf}
                    onChange={(e) => setUf(onlyLetters(e.target.value, 2).toUpperCase())}
                    placeholder="SP"
                    maxLength={2}
                    className="form-control uppercase text-center font-semibold"
                  />
                </div>

                {/* Observações (NVARCHAR(MAX) -> col-span-12) */}
                <div className="col-span-1 sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Notas internas sobre o cliente..."
                    rows={3}
                    maxLength={1000}
                    className="form-control resize-none"
                  />
                </div>

                {/* Status (NVARCHAR(20) -> col-span-4 ao editar) */}
                {estaEditando && (
                  <div className="col-span-1 sm:col-span-4">
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
