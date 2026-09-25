class BrandModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.nome = dados.nome ? String(dados.nome).trim() : '';
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.criadoEm = dados.criadoEm || dados.criado_em || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || null;
  }
}

module.exports = BrandModel;
