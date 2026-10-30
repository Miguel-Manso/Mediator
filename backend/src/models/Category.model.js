const { getPool, sql } = require('../config/db');

class CategoryModel {
  static async findAll({ apenasAtivos = true } = {}) {
    const pool = await getPool();
    let query = 'SELECT id, nome, ativo FROM categorias_equipamento';
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
      .input('id', sql.Int, Number(id))
      .query('SELECT id, nome, ativo FROM categorias_equipamento WHERE id = @id');

    return result.recordset[0] || null;
  }

  static async checkNameExists(nome, excludeId = null) {
    if (!nome || !String(nome).trim()) return false;
    const pool = await getPool();
    const req = pool.request().input('nome', sql.NVarChar, String(nome).trim().toLowerCase());

    let query = 'SELECT id FROM categorias_equipamento WHERE LOWER(nome) = @nome';
    if (excludeId) {
      req.input('excludeId', sql.Int, Number(excludeId));
      query += ' AND id != @excludeId';
    }

    const result = await req.query(query);
    return result.recordset.length > 0;
  }

  static async create({ nome }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .query(`
        INSERT INTO categorias_equipamento (nome, ativo)
        OUTPUT inserted.id, inserted.nome, inserted.ativo
        VALUES (@nome, 1)
      `);

    return result.recordset[0];
  }
}

module.exports = CategoryModel;
