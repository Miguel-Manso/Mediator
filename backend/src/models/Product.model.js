class ProductModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.nome = dados.nome ? String(dados.nome).trim() : '';
    this.descricao = dados.descricao !== undefined && dados.descricao !== null ? String(dados.descricao).trim() : null;
    this.preco = dados.preco !== undefined && dados.preco !== null ? Number(dados.preco) : 0;
    this.estoque = dados.estoque !== undefined && dados.estoque !== null ? parseInt(dados.estoque, 10) : 0;
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.criadoEm = dados.criadoEm || dados.criado_em || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || null;
  }
}

module.exports = ProductModel;
