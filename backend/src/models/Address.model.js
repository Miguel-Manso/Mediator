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

  static async findMatching({
    logradouro,
    numero = null,
    complemento = null,
    bairro = null,
    cidade = 'Viradouro',
    uf = 'SP',
    cep = null,
  }) {
    if (!logradouro || String(logradouro).trim() === '') return null;
    const pool = await getPool();
    const req = pool.request();
    const numeroLimpo = numero ? String(numero).replace(/\D/g, '').trim() || null : null;
    const cepLimpo = cep ? String(cep).replace(/\D/g, '').trim() || null : null;

    req.input('logradouro', sql.NVarChar, String(logradouro).trim());
    req.input('cidade', sql.NVarChar, cidade ? String(cidade).trim() : 'Viradouro');
    req.input('uf', sql.NVarChar, uf ? String(uf).trim().toUpperCase() : 'SP');

    let query = `
      SELECT TOP 1 *
      FROM enderecos
      WHERE LOWER(LTRIM(RTRIM(logradouro))) = LOWER(@logradouro)
        AND LOWER(LTRIM(RTRIM(cidade))) = LOWER(@cidade)
        AND UPPER(LTRIM(RTRIM(uf))) = @uf
        AND ativo = 1
    `;

    if (numeroLimpo) {
      query += ' AND numero = @numero';
      req.input('numero', sql.NVarChar, numeroLimpo);
    } else {
      query += ' AND (numero IS NULL OR numero = \'\')';
    }

    if (bairro && String(bairro).trim() !== '') {
      query += ' AND LOWER(LTRIM(RTRIM(bairro))) = LOWER(@bairro)';
      req.input('bairro', sql.NVarChar, String(bairro).trim());
    }

    if (cepLimpo) {
      query += ' AND REPLACE(REPLACE(cep, \'-\', \'\'), \' \', \'\') = @cep';
      req.input('cep', sql.NVarChar, cepLimpo);
    }

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  static async findOrCreate({
    logradouro,
    numero = null,
    complemento = null,
    bairro = null,
    cidade = 'Viradouro',
    uf = 'SP',
    cep = null,
  }) {
    const existente = await this.findMatching({
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
    });

    if (existente) {
      return existente;
    }

    return this.create({
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
    });
  }

  // Vincular endereço a cliente (N:N)
  static async vincularCliente(clienteId, enderecoId, { tipo = 'PRINCIPAL', principal = 1 } = {}) {
    if (!clienteId || !enderecoId) return null;
    const pool = await getPool();

    // Se marcado como principal, desmarca o principal anterior deste cliente
    if (Number(principal) === 1) {
      await pool
        .request()
        .input('cliente_id', sql.VarChar, clienteId)
        .query('UPDATE cliente_enderecos SET principal = 0 WHERE cliente_id = @cliente_id');
    }

    const result = await pool
      .request()
      .input('cliente_id', sql.VarChar, clienteId)
      .input('endereco_id', sql.VarChar, enderecoId)
      .input('tipo', sql.NVarChar, tipo || 'PRINCIPAL')
      .input('principal', sql.Bit, Number(principal) === 1 ? 1 : 0)
      .query(`
        IF EXISTS (SELECT 1 FROM cliente_enderecos WHERE cliente_id = @cliente_id AND endereco_id = @endereco_id)
        BEGIN
          UPDATE cliente_enderecos
          SET tipo = @tipo, principal = @principal, ativo = 1, atualizado_em = GETDATE()
          OUTPUT inserted.*
          WHERE cliente_id = @cliente_id AND endereco_id = @endereco_id;
        END
        ELSE
        BEGIN
          INSERT INTO cliente_enderecos (id, cliente_id, endereco_id, tipo, principal, ativo, criado_em, atualizado_em)
          OUTPUT inserted.*
          VALUES (LOWER(NEWID()), @cliente_id, @endereco_id, @tipo, @principal, 1, GETDATE(), GETDATE());
        END
      `);

    return result.recordset[0] || null;
  }

  // Desvincular endereço de cliente
  static async desvincularCliente(clienteId, enderecoId) {
    if (!clienteId || !enderecoId) return false;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('cliente_id', sql.VarChar, clienteId)
      .input('endereco_id', sql.VarChar, enderecoId)
      .query(`
        UPDATE cliente_enderecos
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.*
        WHERE cliente_id = @cliente_id AND endereco_id = @endereco_id
      `);

    return result.recordset.length > 0;
  }

  // Listar todos os endereços vinculados a um cliente
  static async findByClienteId(clienteId, { apenasAtivos = true } = {}) {
    if (!clienteId) return [];
    const pool = await getPool();
    const req = pool.request().input('cliente_id', sql.VarChar, clienteId);

    let query = `
      SELECT 
        e.id, 
        e.logradouro, 
        e.numero, 
        e.complemento, 
        e.bairro, 
        e.cidade, 
        e.uf, 
        e.cep,
        e.ativo,
        ce.id AS linkId,
        ce.tipo,
        ce.principal,
        ce.ativo AS vinculoAtivo,
        ce.criado_em AS vinculadoEm
      FROM cliente_enderecos ce
      INNER JOIN enderecos e ON ce.endereco_id = e.id
      WHERE ce.cliente_id = @cliente_id
    `;

    if (apenasAtivos) {
      query += ' AND ce.ativo = 1 AND e.ativo = 1';
    }

    query += ' ORDER BY ce.principal DESC, ce.criado_em DESC';

    const result = await req.query(query);
    return result.recordset;
  }

  // Vincular endereço a usuário (N:N)
  static async vincularUsuario(usuarioId, enderecoId, { tipo = 'PRINCIPAL', principal = 1 } = {}) {
    if (!usuarioId || !enderecoId) return null;
    const pool = await getPool();

    if (Number(principal) === 1) {
      await pool
        .request()
        .input('usuario_id', sql.VarChar, usuarioId)
        .query('UPDATE usuario_enderecos SET principal = 0 WHERE usuario_id = @usuario_id');
    }

    const result = await pool
      .request()
      .input('usuario_id', sql.VarChar, usuarioId)
      .input('endereco_id', sql.VarChar, enderecoId)
      .input('tipo', sql.NVarChar, tipo || 'PRINCIPAL')
      .input('principal', sql.Bit, Number(principal) === 1 ? 1 : 0)
      .query(`
        IF EXISTS (SELECT 1 FROM usuario_enderecos WHERE usuario_id = @usuario_id AND endereco_id = @endereco_id)
        BEGIN
          UPDATE usuario_enderecos
          SET tipo = @tipo, principal = @principal, ativo = 1, atualizado_em = GETDATE()
          OUTPUT inserted.*
          WHERE usuario_id = @usuario_id AND endereco_id = @endereco_id;
        END
        ELSE
        BEGIN
          INSERT INTO usuario_enderecos (id, usuario_id, endereco_id, tipo, principal, ativo, criado_em, atualizado_em)
          OUTPUT inserted.*
          VALUES (LOWER(NEWID()), @usuario_id, @endereco_id, @tipo, @principal, 1, GETDATE(), GETDATE());
        END
      `);

    return result.recordset[0] || null;
  }

  // Desvincular endereço de usuário
  static async desvincularUsuario(usuarioId, enderecoId) {
    if (!usuarioId || !enderecoId) return false;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('usuario_id', sql.VarChar, usuarioId)
      .input('endereco_id', sql.VarChar, enderecoId)
      .query(`
        UPDATE usuario_enderecos
        SET ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.*
        WHERE usuario_id = @usuario_id AND endereco_id = @endereco_id
      `);

    return result.recordset.length > 0;
  }

  // Listar todos os endereços vinculados a um usuário
  static async findByUsuarioId(usuarioId, { apenasAtivos = true } = {}) {
    if (!usuarioId) return [];
    const pool = await getPool();
    const req = pool.request().input('usuario_id', sql.VarChar, usuarioId);

    let query = `
      SELECT 
        e.id, 
        e.logradouro, 
        e.numero, 
        e.complemento, 
        e.bairro, 
        e.cidade, 
        e.uf, 
        e.cep,
        e.ativo,
        ue.id AS linkId,
        ue.tipo,
        ue.principal,
        ue.ativo AS vinculoAtivo,
        ue.criado_em AS vinculadoEm
      FROM usuario_enderecos ue
      INNER JOIN enderecos e ON ue.endereco_id = e.id
      WHERE ue.usuario_id = @usuario_id
    `;

    if (apenasAtivos) {
      query += ' AND ue.ativo = 1 AND e.ativo = 1';
    }

    query += ' ORDER BY ue.principal DESC, ue.criado_em DESC';

    const result = await req.query(query);
    return result.recordset;
  }
}

module.exports = AddressModel;
