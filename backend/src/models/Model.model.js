const { getPool, sql } = require('../config/db');

class ModelModel {
  static async findAll({ marcaId = null, apenasAtivos = false } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let query = `
      SELECT 
        m.id, 
        m.nome, 
        m.marca_id AS marcaId, 
        m.ativo, 
        m.criado_em AS criadoEm, 
        m.atualizado_em AS atualizadoEm,
        b.nome AS marcaNome
      FROM modelos m
      INNER JOIN marcas b ON m.marca_id = b.id
      WHERE 1=1
    `;

    if (marcaId) {
      req.input('marcaId', sql.VarChar, marcaId);
      query += ' AND m.marca_id = @marcaId';
    }

    if (apenasAtivos) {
      query += ' AND m.ativo = 1 AND b.ativo = 1';
    }

    query += ' ORDER BY m.nome ASC';

    const result = await req.query(query);
    return result.recordset;
  }

  static async findById(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        SELECT 
          m.id, 
          m.nome, 
          m.marca_id AS marcaId, 
          m.ativo, 
          m.criado_em AS criadoEm, 
          m.atualizado_em AS atualizadoEm,
          b.nome AS marcaNome
        FROM modelos m
        INNER JOIN marcas b ON m.marca_id = b.id
        WHERE m.id = @id
      `);

    return result.recordset[0] || null;
  }

  static async create({ nome, marcaId }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .input('marca_id', sql.VarChar, marcaId)
      .query(`
        INSERT INTO modelos (id, nome, marca_id, ativo)
        OUTPUT inserted.id, inserted.nome, inserted.marca_id AS marcaId, inserted.ativo, inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @nome, @marca_id, 1)
      `);

    return result.recordset[0];
  }

  static async update(id, { nome, marcaId, ativo }) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE modelos SET atualizado_em = GETDATE()';

    if (nome !== undefined) {
      query += ', nome = @nome';
      req.input('nome', sql.NVarChar, String(nome).trim());
    }
    if (marcaId !== undefined) {
      query += ', marca_id = @marca_id';
      req.input('marca_id', sql.VarChar, marcaId);
    }
    if (ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, ativo ? 1 : 0);
    }

    query += `
      OUTPUT inserted.id, inserted.nome, inserted.marca_id AS marcaId, inserted.ativo, inserted.atualizado_em AS atualizadoEm
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
        UPDATE modelos 
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.nome, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }
}

module.exports = ModelModel;
