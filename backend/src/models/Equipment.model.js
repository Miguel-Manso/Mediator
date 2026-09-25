class EquipmentModel {
  constructor(dados = {}) {
    this.id = dados.id || null;
    this.descricao = dados.descricao ? String(dados.descricao).trim() : '';
    this.numeroSerie = dados.numeroSerie || dados.numero_serie ? String(dados.numeroSerie || dados.numero_serie).trim() : null;
    this.marcaId = dados.marcaId || dados.marca_id || null;
    this.modeloId = dados.modeloId || dados.modelo_id || null;
    this.clienteId = dados.clienteId || dados.cliente_id || null;
    this.categoriaId = dados.categoriaId || dados.categoria_id ? Number(dados.categoriaId || dados.categoria_id) : null;
    this.ativo = dados.ativo !== undefined ? Boolean(dados.ativo) : true;
    this.marcaNome = dados.marcaNome || null;
    this.modeloNome = dados.modeloNome || null;
    this.clienteNome = dados.clienteNome || null;
    this.clienteTelefone = dados.clienteTelefone || null;
    this.clienteCpf = dados.clienteCpf || null;
    this.categoriaNome = dados.categoriaNome || null;
    this.criadoEm = dados.criadoEm || dados.criado_em || null;
    this.atualizadoEm = dados.atualizadoEm || dados.atualizado_em || null;
  }
}

module.exports = EquipmentModel;
