class AddressModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.logradouro = dados.logradouro ? String(dados.logradouro).trim() : '';
    this.numero = dados.numero !== undefined && dados.numero !== null ? String(dados.numero).trim() : null;
    this.complemento = dados.complemento !== undefined && dados.complemento !== null ? String(dados.complemento).trim() : null;
    this.bairro = dados.bairro !== undefined && dados.bairro !== null ? String(dados.bairro).trim() : null;
    this.cidade = dados.cidade ? String(dados.cidade).trim() : 'Viradouro';
    this.uf = dados.uf ? String(dados.uf).trim().toUpperCase() : 'SP';
    this.cep = dados.cep !== undefined && dados.cep !== null ? String(dados.cep).trim() : null;
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.criadoEm = dados.criadoEm || dados.criado_em || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || null;
  }
}

module.exports = AddressModel;
