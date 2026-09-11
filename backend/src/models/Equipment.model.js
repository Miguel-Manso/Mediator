const { getPool, sql } = require('../config/db');

class EquipmentModel {
  static async listar({
    busca = '',
    clienteId = null,
    categoriaId = null,
    marcaId = null,
    apenasAtivos = false,
  } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let query = `
      SELECT 
        e.id, 
        e.descricao, 
        e.numero_serie AS numeroSerie, 
        e.marca_id AS marcaId, 
        e.modelo_id AS modeloId, 
        e.cliente_id AS clienteId, 
        e.categoria_id AS categoriaId, 
        e.ativo, 
        e.criado_em AS criadoEm, 
        e.atualizado_em AS atualizadoEm,
        m.nome AS marcaNome,
        mo.nome AS modeloNome,
        c.nome AS clienteNome,
        c.telefone AS clienteTelefone,
        c.cpf AS clienteCpf,
        cat.nome AS categoriaNome
      FROM equipamentos e
      LEFT JOIN marcas m ON e.marca_id = m.id
      LEFT JOIN modelos mo ON e.modelo_id = mo.id
      LEFT JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN categorias_equipamento cat ON e.categoria_id = cat.id
      WHERE 1=1
    `;

    if (busca && String(busca).trim() !== '') {
      req.input('termoBusca', sql.NVarChar, `%${String(busca).trim()}%`);
      query += `
        AND (
          e.descricao LIKE @termoBusca 
          OR e.numero_serie LIKE @termoBusca 
          OR c.nome LIKE @termoBusca 
          OR m.nome LIKE @termoBusca 
          OR mo.nome LIKE @termoBusca 
          OR cat.nome LIKE @termoBusca
        )
      `;
    }

    if (clienteId) {
      req.input('clienteId', sql.VarChar, clienteId);
      query += ' AND e.cliente_id = @clienteId';
    }

    if (categoriaId) {
      req.input('categoriaId', sql.Int, Number(categoriaId));
      query += ' AND e.categoria_id = @categoriaId';
    }

    if (marcaId) {
      req.input('marcaId', sql.VarChar, marcaId);
      query += ' AND e.marca_id = @marcaId';
    }

    if (apenasAtivos) {
      query += ' AND e.ativo = 1';
    }

    query += ' ORDER BY e.criado_em DESC';

    const result = await req.query(query);
    return result.recordset;
  }

  static async buscarPorId(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        SELECT 
          e.id, 
          e.descricao, 
          e.numero_serie AS numeroSerie, 
          e.marca_id AS marcaId, 
          e.modelo_id AS modeloId, 
          e.cliente_id AS clienteId, 
          e.categoria_id AS categoriaId, 
          e.ativo, 
          e.criado_em AS criadoEm, 
          e.atualizado_em AS atualizadoEm,
          m.nome AS marcaNome,
          mo.nome AS modeloNome,
          c.nome AS clienteNome,
          c.telefone AS clienteTelefone,
          c.cpf AS clienteCpf,
          cat.nome AS categoriaNome
        FROM equipamentos e
        LEFT JOIN marcas m ON e.marca_id = m.id
        LEFT JOIN modelos mo ON e.modelo_id = mo.id
        LEFT JOIN clientes c ON e.cliente_id = c.id
        LEFT JOIN categorias_equipamento cat ON e.categoria_id = cat.id
        WHERE e.id = @id
      `);

    return result.recordset[0] || null;
  }

  static async criar({
    descricao,
    numeroSerie = null,
    numero_serie = null,
    marcaId = null,
    marca_id = null,
    modeloId = null,
    modelo_id = null,
    clienteId,
    cliente_id = null,
    categoriaId,
    categoria_id = null,
  }) {
    const pool = await getPool();
    const serieFinal = numeroSerie || numero_serie || null;
    const marcaFinal = marcaId || marca_id || null;
    const modeloFinal = modeloId || modelo_id || null;
    const clienteFinal = clienteId || cliente_id;
    const categoriaFinal = categoriaId || categoria_id;

    const result = await pool
      .request()
      .input('descricao', sql.NVarChar, String(descricao).trim())
      .input('numero_serie', sql.NVarChar, serieFinal ? String(serieFinal).trim() : null)
      .input('marca_id', sql.VarChar, marcaFinal)
      .input('modelo_id', sql.VarChar, modeloFinal)
      .input('cliente_id', sql.VarChar, clienteFinal)
      .input('categoria_id', sql.Int, Number(categoriaFinal))
      .query(`
        INSERT INTO equipamentos (id, descricao, numero_serie, marca_id, modelo_id, cliente_id, categoria_id, ativo)
        OUTPUT 
          inserted.id, inserted.descricao, inserted.numero_serie AS numeroSerie, 
          inserted.marca_id AS marcaId, inserted.modelo_id AS modeloId, 
          inserted.cliente_id AS clienteId, inserted.categoria_id AS categoriaId, 
          inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @descricao, @numero_serie, @marca_id, @modelo_id, @cliente_id, @categoria_id, 1)
      `);

    return result.recordset[0];
  }

  static async atualizar(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE equipamentos SET atualizado_em = GETDATE()';

    if (dados.descricao !== undefined) {
      query += ', descricao = @descricao';
      req.input('descricao', sql.NVarChar, String(dados.descricao).trim());
    }
    if (dados.numeroSerie !== undefined || dados.numero_serie !== undefined) {
      const serie = dados.numeroSerie !== undefined ? dados.numeroSerie : dados.numero_serie;
      query += ', numero_serie = @numero_serie';
      req.input('numero_serie', sql.NVarChar, serie ? String(serie).trim() : null);
    }
    if (dados.marcaId !== undefined || dados.marca_id !== undefined) {
      const marca = dados.marcaId !== undefined ? dados.marcaId : dados.marca_id;
      query += ', marca_id = @marca_id';
      req.input('marca_id', sql.VarChar, marca || null);
    }
    if (dados.modeloId !== undefined || dados.modelo_id !== undefined) {
      const modelo = dados.modeloId !== undefined ? dados.modeloId : dados.modelo_id;
      query += ', modelo_id = @modelo_id';
      req.input('modelo_id', sql.VarChar, modelo || null);
    }
    if (dados.clienteId !== undefined || dados.cliente_id !== undefined) {
      const cliente = dados.clienteId !== undefined ? dados.clienteId : dados.cliente_id;
      query += ', cliente_id = @cliente_id';
      req.input('cliente_id', sql.VarChar, cliente);
    }
    if (dados.categoriaId !== undefined || dados.categoria_id !== undefined) {
      const cat = dados.categoriaId !== undefined ? dados.categoriaId : dados.categoria_id;
      query += ', categoria_id = @categoria_id';
      req.input('categoria_id', sql.Int, Number(cat));
    }
    if (dados.ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }

    query += `
      OUTPUT 
        inserted.id, inserted.descricao, inserted.numero_serie AS numeroSerie, 
        inserted.marca_id AS marcaId, inserted.modelo_id AS modeloId, 
        inserted.cliente_id AS clienteId, inserted.categoria_id AS categoriaId, 
        inserted.ativo, inserted.atualizado_em AS atualizadoEm
      WHERE id = @id
    `;
    req.input('id', sql.VarChar, id);

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  // Inativação lógica (Soft Delete)
  static async inativar(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE equipamentos 
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.descricao, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  // Reativação
  static async ativar(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE equipamentos 
        SET ativo = 1, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.descricao, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  // Aliases para compatibilidade
  static async findAll(params) {
    return this.listar(params);
  }

  static async findById(id) {
    return this.buscarPorId(id);
  }

  static async create(dados) {
    return this.criar(dados);
  }

  static async update(id, dados) {
    return this.atualizar(id, dados);
  }

  static async softDelete(id) {
    return this.inativar(id);
  }
}

module.exports = EquipmentModel;
