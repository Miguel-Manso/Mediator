class CategoryModel {
  constructor(dados = {}) {
    this.id = dados.id !== undefined && dados.id !== null ? Number(dados.id) : null;
    this.nome = dados.nome ? String(dados.nome).trim() : '';
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
  }
}

module.exports = CategoryModel;
