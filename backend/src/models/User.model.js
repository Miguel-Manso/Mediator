const { getPool, sql } = require('../config/db');

class UserModel {
  static async findAll() {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.nome, 
        u.email, 
        u.cpf,
        u.cargo, 
        u.status, 
        u.ativo,
        u.telefone, 
        COALESCE(e.cidade, 'Viradouro') AS cidade, 
        u.endereco_id AS enderecoId,
        u.criado_em AS criadoEm,
        u.atualizado_em AS atualizadoEm,
        u.nome AS name,
        u.cargo AS role,
        u.telefone AS phone,
        COALESCE(e.cidade, 'Viradouro') AS city,
        u.criado_em AS createdAt,
        u.atualizado_em AS updatedAt,
        e.logradouro,
        e.numero,
        e.complemento,
        e.bairro,
        COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
        e.cep,
        e.uf
      FROM usuarios u
      LEFT JOIN enderecos e ON u.endereco_id = e.id
      ORDER BY u.nome ASC
    `);

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
          u.id, 
          u.nome, 
          u.email, 
          u.cpf,
          u.senha_hash, 
          u.cargo, 
          u.status, 
          u.ativo,
          u.telefone, 
          COALESCE(e.cidade, 'Viradouro') AS cidade, 
          u.endereco_id AS enderecoId,
          u.criado_em AS criadoEm,
          u.atualizado_em AS atualizadoEm,
          u.nome AS name,
          u.cargo AS role,
          u.telefone AS phone,
          COALESCE(e.cidade, 'Viradouro') AS city,
          u.criado_em AS createdAt,
          u.atualizado_em AS updatedAt,
          e.logradouro,
          e.numero,
          e.complemento,
          e.bairro,
          COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
          e.cep,
          e.uf
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE u.id = @id
      `);

    return result.recordset[0] || null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, String(email).trim().toLowerCase())
      .query(`
        SELECT 
          u.id, u.nome, u.email, u.cpf, u.senha_hash, u.cargo, u.status, u.ativo, u.telefone, 
          COALESCE(e.cidade, 'Viradouro') AS cidade, u.endereco_id
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        WHERE LOWER(u.email) = @email
      `);

    return result.recordset[0] || null;
  }

  static async checkEmailExists(email, excludeId = null) {
    if (!email) return false;
    const pool = await getPool();
    const req = pool.request().input('email', sql.NVarChar, String(email).trim().toLowerCase());

    let query = 'SELECT id FROM usuarios WHERE LOWER(email) = @email';
    if (excludeId) {
      req.input('excludeId', sql.VarChar, excludeId);
      query += ' AND id != @excludeId';
    }

    const result = await req.query(query);
    return result.recordset.length > 0;
  }

  static async checkCpfExists(cpf, excludeId = null) {
    if (!cpf) return false;
    const pool = await getPool();
    const req = pool.request().input('cpf', sql.NVarChar, String(cpf).trim());

    let query = 'SELECT id FROM usuarios WHERE cpf = @cpf';
    if (excludeId) {
      req.input('excludeId', sql.VarChar, excludeId);
      query += ' AND id != @excludeId';
    }

    const result = await req.query(query);
    return result.recordset.length > 0;
  }

  static async create({
    nome,
    email,
    cpf = null,
    senhaHash,
    cargo = 'ATENDENTE',
    telefone = null,
    enderecoId = null,
  }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .input('email', sql.NVarChar, String(email).trim().toLowerCase())
      .input('cpf', sql.NVarChar, cpf ? String(cpf).trim() : null)
      .input('senha_hash', sql.NVarChar, senhaHash)
      .input('cargo', sql.NVarChar, String(cargo).toUpperCase())
      .input('telefone', telefone ? String(telefone).trim() : null)
      .input('endereco_id', sql.VarChar, enderecoId || null)
      .query(`
        INSERT INTO usuarios (id, nome, email, cpf, senha_hash, cargo, status, ativo, telefone, endereco_id)
        OUTPUT 
          inserted.id, inserted.nome, inserted.email, inserted.cpf, inserted.cargo, 
          inserted.status, inserted.ativo, inserted.telefone, 
          inserted.endereco_id AS enderecoId, inserted.criado_em AS criadoEm, 
          inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @nome, @email, @cpf, @senha_hash, @cargo, 'ATIVO', 1, @telefone, @endereco_id)
      `);

    const user = result.recordset[0];
    return {
      ...user,
      name: user.nome,
      role: user.cargo,
      phone: user.telefone,
      createdAt: user.criadoEm,
      updatedAt: user.atualizadoEm,
    };
  }

  static async update(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE usuarios SET atualizado_em = GETDATE()';

    if (dados.nome !== undefined) {
      query += ', nome = @nome';
      req.input('nome', sql.NVarChar, String(dados.nome).trim());
    }
    if (dados.email !== undefined) {
      query += ', email = @email';
      req.input('email', sql.NVarChar, String(dados.email).trim().toLowerCase());
    }
    if (dados.cpf !== undefined) {
      query += ', cpf = @cpf';
      req.input('cpf', sql.NVarChar, dados.cpf ? String(dados.cpf).trim() : null);
    }
    if (dados.senhaHash !== undefined) {
      query += ', senha_hash = @senha_hash';
      req.input('senha_hash', sql.NVarChar, dados.senhaHash);
    }
    if (dados.cargo !== undefined) {
      query += ', cargo = @cargo';
      req.input('cargo', sql.NVarChar, String(dados.cargo).toUpperCase());
    }
    if (dados.status !== undefined) {
      query += ', status = @status';
      req.input('status', sql.NVarChar, dados.status);
      if (dados.status === 'INATIVO') {
        query += ', ativo = 0';
      } else if (dados.status === 'ATIVO') {
        query += ', ativo = 1';
      }
    }
    if (dados.ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }
    if (dados.telefone !== undefined) {
      query += ', telefone = @telefone';
      req.input('telefone', sql.NVarChar, dados.telefone ? String(dados.telefone).trim() : null);
    }
    if (dados.enderecoId !== undefined) {
      query += ', endereco_id = @endereco_id';
      req.input('endereco_id', sql.VarChar, dados.enderecoId || null);
    }

    query += `
      OUTPUT 
        inserted.id, inserted.nome, inserted.email, inserted.cpf, inserted.cargo, 
        inserted.status, inserted.ativo, inserted.telefone, 
        inserted.endereco_id AS enderecoId, inserted.criado_em AS criadoEm, 
        inserted.atualizado_em AS atualizadoEm
      WHERE id = @id
    `;
    req.input('id', sql.VarChar, id);

    const result = await req.query(query);
    const user = result.recordset[0];
    if (!user) return null;

    return {
      ...user,
      name: user.nome,
      role: user.cargo,
      phone: user.telefone,
      createdAt: user.criadoEm,
      updatedAt: user.atualizadoEm,
    };
  }

  // Soft delete obrigatorio: Proibido DELETE fisico
  static async softDelete(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE usuarios 
        SET status = 'INATIVO', ativo = 0, atualizado_em = GETDATE()
        OUTPUT 
          inserted.id, inserted.nome, inserted.email, inserted.cargo, 
          inserted.status, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }
}

module.exports = UserModel;
