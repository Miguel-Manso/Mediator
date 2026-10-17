const { getPool, sql } = require('../config/db');

class ClientModel {
  static async findAll({
    search = '',
    apenasAtivos = true,
    orderBy = 'nome',
    orderDirection = 'ASC',
    pagina = null,
    limite = null,
  } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let whereClause = 'WHERE 1=1';

    if (apenasAtivos) {
      whereClause += ' AND c.ativo = 1';
    }

    if (search && String(search).trim() !== '') {
      req.input('termoBusca', sql.NVarChar, `%${String(search).trim()}%`);
      whereClause += `
        AND (
          c.nome LIKE @termoBusca 
          OR c.cpf LIKE @termoBusca 
          OR c.telefone LIKE @termoBusca
          OR c.email LIKE @termoBusca
          OR e.cidade LIKE @termoBusca
          OR e.logradouro LIKE @termoBusca
          OR e.bairro LIKE @termoBusca
        )
      `;
    }

    const mapCamposOrdenacao = {
      nome: 'c.nome',
      cpf: 'c.cpf',
      email: 'c.email',
      telefone: 'c.telefone',
      cidade: "COALESCE(e.cidade, 'Viradouro')",
      status: 'c.status',
      criadoEm: 'c.criado_em',
      criado_em: 'c.criado_em',
      atualizadoEm: 'c.atualizado_em',
      atualizado_em: 'c.atualizado_em',
    };

    const campoOrdenacao = mapCamposOrdenacao[orderBy] || 'c.nome';
    const direcaoOrdenacao = String(orderDirection).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Se paginação for solicitada
    if (pagina !== null && limite !== null && Number(pagina) > 0 && Number(limite) > 0) {
      const countQuery = `
        SELECT COUNT(1) AS total
        FROM clientes c
        LEFT JOIN enderecos e ON c.endereco_id = e.id
        ${whereClause}
      `;
      const countRes = await req.query(countQuery);
      const total = countRes.recordset[0]?.total || 0;

      const offset = Math.max(0, (Number(pagina) - 1) * Number(limite));
      req.input('offset', sql.Int, offset);
      req.input('limite', sql.Int, Number(limite));

      const query = `
        SELECT 
          c.id, 
          c.nome, 
          c.cpf, 
          c.email, 
          c.telefone, 
          COALESCE(e.cidade, 'Viradouro') AS cidade, 
          COALESCE(e.logradouro, '') AS endereco, 
          c.endereco_id AS enderecoId,
          c.status, 
          c.ativo,
          c.observacoes, 
          c.criado_em AS criadoEm, 
          c.atualizado_em AS atualizadoEm,
          c.nome AS name,
          c.telefone AS phone,
          COALESCE(e.cidade, 'Viradouro') AS city,
          COALESCE(e.logradouro, '') AS address,
          c.observacoes AS notes,
          c.criado_em AS createdAt,
          c.atualizado_em AS updatedAt,
          e.logradouro,
          e.numero,
          e.complemento,
          e.bairro,
          COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
          e.cep,
          e.uf
        FROM clientes c
        LEFT JOIN enderecos e ON c.endereco_id = e.id
        ${whereClause}
        ORDER BY ${campoOrdenacao} ${direcaoOrdenacao}
        OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
      `;

      const result = await req.query(query);
      return {
        dados: result.recordset,
        total,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(total / Number(limite)) || 1,
      };
    }

    let query = `
      SELECT 
        c.id, 
        c.nome, 
        c.cpf, 
        c.email, 
        c.telefone, 
        COALESCE(e.cidade, 'Viradouro') AS cidade, 
        COALESCE(e.logradouro, '') AS endereco, 
        c.endereco_id AS enderecoId,
        c.status, 
        c.ativo,
        c.observacoes, 
        c.criado_em AS criadoEm, 
        c.atualizado_em AS atualizadoEm,
        c.nome AS name,
        c.telefone AS phone,
        COALESCE(e.cidade, 'Viradouro') AS city,
        COALESCE(e.logradouro, '') AS address,
        c.observacoes AS notes,
        c.criado_em AS createdAt,
        c.atualizado_em AS updatedAt,
        e.logradouro,
        e.numero,
        e.complemento,
        e.bairro,
        COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
        e.cep,
        e.uf
      FROM clientes c
      LEFT JOIN enderecos e ON c.endereco_id = e.id
      ${whereClause}
      ORDER BY ${campoOrdenacao} ${direcaoOrdenacao}
    `;

    const result = await req.query(query);
    return result.recordset;
  }

  static async listar(params) {
    return this.findAll(params);
  }

  static async findById(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        SELECT 
          c.id, 
          c.nome, 
          c.cpf, 
          c.email, 
          c.telefone, 
          COALESCE(e.cidade, 'Viradouro') AS cidade, 
          COALESCE(e.logradouro, '') AS endereco, 
          c.endereco_id AS enderecoId,
          c.status, 
          c.ativo,
          c.observacoes, 
          c.criado_em AS criadoEm, 
          c.atualizado_em AS atualizadoEm,
          c.nome AS name,
          c.telefone AS phone,
          COALESCE(e.cidade, 'Viradouro') AS city,
          COALESCE(e.logradouro, '') AS address,
          c.observacoes AS notes,
          c.criado_em AS createdAt,
          c.atualizado_em AS updatedAt,
          e.logradouro,
          e.numero,
          e.complemento,
          e.bairro,
          COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
          e.cep,
          e.uf
        FROM clientes c
        LEFT JOIN enderecos e ON c.endereco_id = e.id
        WHERE c.id = @id
      `);

    return result.recordset[0] || null;
  }

  static async findByCpf(cpf) {
    if (!cpf) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('cpf', sql.NVarChar, String(cpf).trim())
      .query('SELECT * FROM clientes WHERE cpf = @cpf');

    return result.recordset[0] || null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, String(email).trim().toLowerCase())
      .query('SELECT * FROM clientes WHERE LOWER(email) = @email');

    return result.recordset[0] || null;
  }

  static async checkCpfExists(cpf, excludeId = null) {
    if (!cpf || String(cpf).trim() === '') return false;
    const pool = await getPool();
    const req = pool.request().input('cpf', sql.NVarChar, String(cpf).trim());

    let query = 'SELECT id FROM clientes WHERE cpf = @cpf';
    if (excludeId) {
      req.input('excludeId', sql.VarChar, excludeId);
      query += ' AND id != @excludeId';
    }

    const result = await req.query(query);
    return result.recordset.length > 0;
  }

  static async checkEmailExists(email, excludeId = null) {
    if (!email || String(email).trim() === '') return false;
    const pool = await getPool();
    const req = pool.request().input('email', sql.NVarChar, String(email).trim().toLowerCase());

    let query = 'SELECT id FROM clientes WHERE LOWER(email) = @email';
    if (excludeId) {
      req.input('excludeId', sql.VarChar, excludeId);
      query += ' AND id != @excludeId';
    }

    const result = await req.query(query);
    return result.recordset.length > 0;
  }

  static async create({
    nome,
    cpf = null,
    email = null,
    telefone,
    enderecoId = null,
    observacoes = null,
  }) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, String(nome).trim())
      .input('cpf', sql.NVarChar, cpf ? String(cpf).trim() : null)
      .input('email', sql.NVarChar, email ? String(email).trim().toLowerCase() : null)
      .input('telefone', sql.NVarChar, String(telefone).trim())
      .input('endereco_id', sql.VarChar, enderecoId || null)
      .input('observacoes', sql.NVarChar, observacoes ? String(observacoes).trim() : null)
      .query(`
        INSERT INTO clientes (id, nome, cpf, email, telefone, endereco_id, status, ativo, observacoes)
        OUTPUT 
          inserted.id, inserted.nome, inserted.cpf, inserted.email, 
          inserted.telefone, inserted.endereco_id AS enderecoId,
          inserted.status, inserted.ativo, inserted.observacoes, 
          inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
        VALUES (LOWER(NEWID()), @nome, @cpf, @email, @telefone, @endereco_id, 'ATIVO', 1, @observacoes)
      `);

    const cliente = result.recordset[0];
    return {
      ...cliente,
      name: cliente.nome,
      phone: cliente.telefone,
      notes: cliente.observacoes,
      createdAt: cliente.criadoEm,
      updatedAt: cliente.atualizadoEm,
    };
  }

  static async update(id, dados) {
    if (!id) return null;
    const pool = await getPool();
    const req = pool.request();
    let query = 'UPDATE clientes SET atualizado_em = GETDATE()';

    if (dados.nome !== undefined) {
      query += ', nome = @nome';
      req.input('nome', sql.NVarChar, String(dados.nome).trim());
    }
    if (dados.cpf !== undefined) {
      query += ', cpf = @cpf';
      req.input('cpf', sql.NVarChar, dados.cpf ? String(dados.cpf).trim() : null);
    }
    if (dados.email !== undefined) {
      query += ', email = @email';
      req.input('email', sql.NVarChar, dados.email ? String(dados.email).trim().toLowerCase() : null);
    }
    if (dados.telefone !== undefined) {
      query += ', telefone = @telefone';
      req.input('telefone', sql.NVarChar, String(dados.telefone).trim());
    }
    if (dados.enderecoId !== undefined) {
      query += ', endereco_id = @endereco_id';
      req.input('endereco_id', sql.VarChar, dados.enderecoId || null);
    }
    if (dados.observacoes !== undefined) {
      query += ', observacoes = @observacoes';
      req.input('observacoes', sql.NVarChar, dados.observacoes ? String(dados.observacoes).trim() : null);
    }
    if (dados.status !== undefined) {
      query += ', status = @status';
      req.input('status', sql.NVarChar, dados.status);
    }
    if (dados.ativo !== undefined) {
      query += ', ativo = @ativo';
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    } else if (dados.status !== undefined) {
      query += ', ativo = @ativo_calc';
      req.input('ativo_calc', sql.Bit, dados.status === 'ATIVO' ? 1 : 0);
    }

    query += `
      OUTPUT 
        inserted.id, inserted.nome, inserted.cpf, inserted.email, 
        inserted.telefone, inserted.endereco_id AS enderecoId,
        inserted.status, inserted.ativo, inserted.observacoes, inserted.atualizado_em AS atualizadoEm
      WHERE id = @id
    `;
    req.input('id', sql.VarChar, id);

    const result = await req.query(query);
    const cliente = result.recordset[0];
    if (!cliente) return null;

    return {
      ...cliente,
      name: cliente.nome,
      phone: cliente.telefone,
      notes: cliente.observacoes,
      updatedAt: cliente.atualizadoEm,
    };
  }

  static async softDelete(id) {
    if (!id) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query(`
        UPDATE clientes 
        SET status = 'INATIVO', ativo = 0, atualizado_em = GETDATE()
        OUTPUT inserted.id, inserted.nome, inserted.status, inserted.ativo, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }
}

module.exports = ClientModel;
