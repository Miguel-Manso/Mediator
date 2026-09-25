class ClientModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.nome = dados.nome || dados.name ? String(dados.nome || dados.name).trim() : '';
    this.cpf = dados.cpf !== undefined && dados.cpf !== null ? String(dados.cpf).trim() : null;
    this.email = dados.email !== undefined && dados.email !== null ? String(dados.email).trim().toLowerCase() : null;
    this.telefone = dados.telefone || dados.phone ? String(dados.telefone || dados.phone).trim() : '';
    this.enderecoId = dados.enderecoId || dados.endereco_id || null;
    this.status = dados.status ? String(dados.status).trim() : 'ATIVO';
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.observacoes = dados.observacoes || dados.notes ? String(dados.observacoes || dados.notes).trim() : null;

    // Campos de endereço vinculado (quando há join)
    this.logradouro = dados.logradouro || dados.endereco || dados.address ? String(dados.logradouro || dados.endereco || dados.address).trim() : '';
    this.numero = dados.numero ? String(dados.numero).trim() : null;
    this.complemento = dados.complemento ? String(dados.complemento).trim() : null;
    this.bairro = dados.bairro ? String(dados.bairro).trim() : null;
    this.cidade = dados.cidade || dados.city || dados.enderecoCidade ? String(dados.cidade || dados.city || dados.enderecoCidade).trim() : 'Viradouro';
    this.uf = dados.uf ? String(dados.uf).trim().toUpperCase() : 'SP';
    this.cep = dados.cep ? String(dados.cep).trim() : null;

    // Aliases para compatibilidade com o frontend
    this.name = this.nome;
    this.phone = this.telefone;
    this.city = this.cidade;
    this.address = this.logradouro;
    this.endereco = this.logradouro;
    this.enderecoCidade = this.cidade;
    this.notes = this.observacoes;

    this.criadoEm = dados.criadoEm || dados.criado_em || dados.createdAt || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || dados.updatedAt || null;
    this.createdAt = this.criadoEm;
    this.updatedAt = this.atualizadoEm;
  }
}

module.exports = ClientModel;
