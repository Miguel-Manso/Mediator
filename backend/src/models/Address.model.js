const { getPool, sql } = require('../config/db');

class AddressModel {
  static async create({
    logradouro,
    numero = null,
    complemento = null,
    bairro = null,
    cidade = 'Viradouro',
    uf = 'SP',
    cep = null,
  }) {
    const pool = await getPool();
    const numeroLimpo = numero ? String(numero).replace(/\D/g, '').trim() || null : null;
    const result = await pool
      .request()
      .input('logradouro', sql.NVarChar, String(logradouro).trim())
      .input('numero', sql.NVarChar, numeroLimpo)
      .input('complemento', sql.NVarChar, complemento ? String(complemento).trim() : null)
      .input('bairro', sql.NVarChar, bairro ? String(bairro).trim() : null)
      .input('cidade', sql.NVarChar, cidade ? String(cidade).trim() : 'Viradouro')
      .input('uf', sql.NVarChar, uf ? String(uf).trim().toUpperCase() : 'SP')
      .input('cep', sql.NVarChar, cep ? String(cep).trim() : null)
      .query(`
        INSERT INTO enderecos (id, logradouro, numero, complemento, bairro, cidade, uf, cep, ativo)
        OUTPUT 
          inserted.id, inserted.logradouro, inserted.numero, inserted.complemento, 
          inserted.bairro, inserted.cidade, inserted.uf, inserted.cep, 
          inserted.ativo, inserted.criado_em, inserted.atualizado_em
        VALUES (LOWER(NEWID()), @logradouro, @numero, @complemento, @bairro, @cidade, @uf, @cep, 1)
      `);

    return result.recordset[0];
  }

  static async findById(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query('SELECT * FROM enderecos WHERE id = @id');

    return result.recordset[0] || null;
  }

  static async update(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE enderecos SET atualizado_em = GETDATE()';

    if (dados.logradouro !== undefined) {
      query += ', logradouro = @logradouro';
      req.input('logradouro', sql.NVarChar, String(dados.logradouro).trim());
    }
    if (dados.numero !== undefined) {
      const numeroLimpo = dados.numero ? String(dados.numero).replace(/\D/g, '').trim() || null : null;
      query += ', numero = @numero';
      req.input('numero', sql.NVarChar, numeroLimpo);
    }
    if (dados.complemento !== undefined) {
      query += ', complemento = @complemento';
      req.input('complemento', sql.NVarChar, dados.complemento ? String(dados.complemento).trim() : null);
    }
    if (dados.bairro !== undefined) {
      query += ', bairro = @bairro';
      req.input('bairro', sql.NVarChar, dados.bairro ? String(dados.bairro).trim() : null);
    }
    if (dados.cidade !== undefined) {
      query += ', cidade = @cidade';
      req.input('cidade', sql.NVarChar, dados.cidade ? String(dados.cidade).trim() : 'Viradouro');
    }
    if (dados.uf !== undefined) {
      query += ', uf = @uf';
      req.input('uf', sql.NVarChar, dados.uf ? String(dados.uf).trim().toUpperCase() : 'SP');
    }
    if (dados.cep !== undefined) {
      query += ', cep = @cep';
      req.input('cep', sql.NVarChar, dados.cep ? String(dados.cep).trim() : null);
    }
    if (dados.ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }

    query += `
      OUTPUT 
        inserted.id, inserted.logradouro, inserted.numero, inserted.complemento, 
        inserted.bairro, inserted.cidade, inserted.uf, inserted.cep, 
        inserted.ativo, inserted.atualizado_em
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
        UPDATE enderecos 
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.ativo, inserted.atualizado_em
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }
}

module.exports = AddressModel;
