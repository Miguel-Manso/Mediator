class UserModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.nome = dados.nome || dados.name ? String(dados.nome || dados.name).trim() : '';
    this.email = dados.email ? String(dados.email).trim().toLowerCase() : '';
    this.cpf = dados.cpf !== undefined && dados.cpf !== null ? String(dados.cpf).trim() : null;
    this.senha_hash = dados.senha_hash || dados.senhaHash || null;
    this.cargo = dados.cargo || dados.role ? String(dados.cargo || dados.role).trim() : 'ATENDENTE';
    this.status = dados.status ? String(dados.status).trim() : 'ATIVO';
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.telefone = dados.telefone || dados.phone ? String(dados.telefone || dados.phone).trim() : null;
    this.enderecoId = dados.enderecoId || dados.endereco_id || null;

    // Campos de endereço vinculado
    this.logradouro = dados.logradouro ? String(dados.logradouro).trim() : null;
    this.numero = dados.numero ? String(dados.numero).trim() : null;
    this.complemento = dados.complemento ? String(dados.complemento).trim() : null;
    this.bairro = dados.bairro ? String(dados.bairro).trim() : null;
    this.cidade = dados.cidade || dados.city || dados.enderecoCidade ? String(dados.cidade || dados.city || dados.enderecoCidade).trim() : 'Viradouro';
    this.uf = dados.uf ? String(dados.uf).trim().toUpperCase() : 'SP';
    this.cep = dados.cep ? String(dados.cep).trim() : null;

    // Aliases para compatibilidade com o frontend
    this.name = this.nome;
    this.role = this.cargo;
    this.phone = this.telefone;
    this.city = this.cidade;
    this.enderecoCidade = this.cidade;

    this.criadoEm = dados.criadoEm || dados.criado_em || dados.createdAt || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || dados.updatedAt || null;
    this.createdAt = this.criadoEm;
    this.updatedAt = this.atualizadoEm;
  }
}

module.exports = UserModel;
