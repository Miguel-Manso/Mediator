const { getPool, sql } = require('../config/db');

class BrandModel {
  static async findAll({ apenasAtivos = false } = {}) {
    const pool = await getPool();
    let query = 'SELECT id, nome, ativo, criado_em AS criadoEm, atualizado_em AS atualizadoEm FROM marcas';
    if (apenasAtivos) {
      query += ' WHERE ativo = 1';
    }
    query += ' ORDER BY nome ASC';

    const result = await pool.query(query);
    return result.recordset;
  }

  static async findById(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query('SELECT id, nome, ativo, criado_em AS criadoEm, atualizado_em AS atualizadoEm FROM marcas WHERE id = @id');

    return result.recordset[0] || null;
  }

  static async create({ nome }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .query(`
        INSERT INTO marcas (id, nome, ativo)
        OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @nome, 1)
      `);

    return result.recordset[0];
  }

  static async update(id, { nome, ativo }) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE marcas SET atualizado_em = GETDATE()';

    if (nome !== undefined) {
      query += ', nome = @nome';
      req.input('nome', sql.NVarChar, String(nome).trim());
    }
    if (ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, ativo ? 1 : 0);
    }

    query += `
      OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
      WHERE id = @id
    `;
    req.input('id', sql.VarChar, id);

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  static async softDelete(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE marcas 
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }
}

module.exports = BrandModel;
