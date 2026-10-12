const { getPool, sql } = require('../config/db');

class ProductModel {
  static async listar({ busca = '', apenasAtivos = true } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let query = `
      SELECT 
        id, 
        nome, 
        descricao, 
        preco, 
        estoque, 
        ativo, 
        criado_em AS criadoEm, 
        atualizado_em AS atualizadoEm
      FROM produtos
      WHERE 1=1
    `;

    if (busca && String(busca).trim() !== '') {
      req.input('termoBusca', sql.NVarChar, `%${String(busca).trim()}%`);
      query += ' AND (nome LIKE @termoBusca OR descricao LIKE @termoBusca)';
    }

    if (apenasAtivos) {
      query += ' AND ativo = 1';
    }

    query += ' ORDER BY nome ASC';

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
          id, 
          nome, 
          descricao, 
          preco, 
          estoque, 
          ativo, 
          criado_em AS criadoEm, 
          atualizado_em AS atualizadoEm
        FROM produtos
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  static async criar({
    nome,
    descricao = null,
    preco = 0.0,
    estoque = 0,
  }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .input('descricao', sql.NVarChar, descricao ? String(descricao).trim() : null)
      .input('preco', sql.Decimal(10, 2), Number(preco) || 0)
      .input('estoque', sql.Int, Number(estoque) || 0)
      .query(`
        INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
        OUTPUT 
          inserted.id, inserted.nome, inserted.descricao, 
          inserted.preco, inserted.estoque, inserted.ativo, 
          inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @nome, @descricao, @preco, @estoque, 1)
      `);

    return result.recordset[0];
  }

  static async atualizar(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE produtos SET atualizado_em = GETDATE()';

    if (dados.nome !== undefined) {
      query += ', nome = @nome';
      req.input('nome', sql.NVarChar, String(dados.nome).trim());
    }
    if (dados.descricao !== undefined) {
      query += ', descricao = @descricao';
      req.input('descricao', sql.NVarChar, dados.descricao ? String(dados.descricao).trim() : null);
    }
    if (dados.preco !== undefined) {
      query += ', preco = @preco';
      req.input('preco', sql.Decimal(10, 2), Number(dados.preco));
    }
    if (dados.estoque !== undefined) {
      query += ', estoque = @estoque';
      req.input('estoque', sql.Int, Number(dados.estoque));
    }
    if (dados.ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }

    query += `
      OUTPUT 
        inserted.id, inserted.nome, inserted.descricao, 
        inserted.preco, inserted.estoque, inserted.ativo, 
        inserted.atualizado_em AS atualizadoEm
      WHERE id = @id
    `;
    req.input('id', sql.VarChar, id);

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  static async inativar(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE produtos 
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  static async ativar(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE produtos 
        SET ativo = 1, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
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

module.exports = ProductModel;
