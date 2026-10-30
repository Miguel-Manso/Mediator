const { getPool, sql } = require('../config/db');

class OrderStatusModel {
  static async listar({ busca = '', apenasAtivos = true } = {}) {
    const pool = await getPool();
    const req = pool.request();

    let query = `
      SELECT 
        id, 
        nome, 
        descricao, 
        cor, 
        ordem, 
        ativo
      FROM status_ordem
      WHERE 1=1
    `;

    if (busca && String(busca).trim() !== '') {
      req.input('termoBusca', sql.NVarChar, `%${String(busca).trim()}%`);
      query += ' AND (nome LIKE @termoBusca OR descricao LIKE @termoBusca)';
    }

    if (apenasAtivos) {
      query += ' AND ativo = 1';
    }

    query += ' ORDER BY ordem ASC, id ASC';

    const result = await req.query(query);
    return result.recordset;
  }

  static async buscarPorId(id) {
    if (id === undefined || id === null) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT 
          id, 
          nome, 
          descricao, 
          cor, 
          ordem, 
          ativo
        FROM status_ordem
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  static async buscarPorNome(nome, ignorarId = null) {
    if (!nome) return null;
    const pool = await getPool();
    const req = pool.request().input('nome', sql.NVarChar, String(nome).trim());

    let query = 'SELECT id, nome FROM status_ordem WHERE LOWER(nome) = LOWER(@nome)';
    if (ignorarId !== null && ignorarId !== undefined) {
      req.input('ignorarId', sql.Int, Number(ignorarId));
      query += ' AND id != @ignorarId';
    }

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  static async criar({ id, nome, descricao = null, cor = '#3B82F6', ordem = 0 }) {
    const pool = await getPool();
    let novoId = id ? Number(id) : null;

    if (!novoId) {
      const maxRes = await pool.request().query('SELECT ISNULL(MAX(id), 0) + 1 AS proximoId FROM status_ordem');
      novoId = maxRes.recordset[0].proximoId;
    }

    const result = await pool
      .request()
      .input('id', sql.Int, novoId)
      .input('nome', sql.NVarChar, String(nome).trim())
      .input('descricao', sql.NVarChar, descricao ? String(descricao).trim() : null)
      .input('cor', sql.NVarChar, cor ? String(cor).trim() : '#3B82F6')
      .input('ordem', sql.Int, Number(ordem) || 0)
      .query(`
        INSERT INTO status_ordem (id, nome, descricao, cor, ordem, ativo)
        OUTPUT inserted.id, inserted.nome, inserted.descricao, inserted.cor, inserted.ordem, inserted.ativo
        VALUES (@id, @nome, @descricao, @cor, @ordem, 1)
      `);

    return result.recordset[0];
  }

  static async atualizar(id, dados) {
    if (id === undefined || id === null) return null;
    const pool = await getPool();
    const req = pool.request().input('id', sql.Int, Number(id));

    const setClauses = [];

    if (dados.nome !== undefined) {
      setClauses.push('nome = @nome');
      req.input('nome', sql.NVarChar, String(dados.nome).trim());
    }

    if (dados.descricao !== undefined) {
      setClauses.push('descricao = @descricao');
      req.input('descricao', sql.NVarChar, dados.descricao ? String(dados.descricao).trim() : null);
    }

    if (dados.cor !== undefined) {
      setClauses.push('cor = @cor');
      req.input('cor', sql.NVarChar, dados.cor ? String(dados.cor).trim() : '#3B82F6');
    }

    if (dados.ordem !== undefined) {
      setClauses.push('ordem = @ordem');
      req.input('ordem', sql.Int, Number(dados.ordem) || 0);
    }

    if (dados.ativo !== undefined) {
      setClauses.push('ativo = @ativo');
      req.input('ativo', sql.Bit, dados.ativo ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return this.buscarPorId(id);
    }

    const query = `
      UPDATE status_ordem
      SET ${setClauses.join(', ')}
      OUTPUT inserted.id, inserted.nome, inserted.descricao, inserted.cor, inserted.ordem, inserted.ativo
      WHERE id = @id
    `;

    const result = await req.query(query);
    return result.recordset[0] || null;
  }

  static async alternarStatus(id) {
    if (id === undefined || id === null) return null;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, Number(id))
      .query(`
        UPDATE status_ordem
        SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END
        OUTPUT inserted.id, inserted.nome, inserted.descricao, inserted.cor, inserted.ordem, inserted.ativo
        WHERE id = @id
      `);

    return result.recordset[0] || null;
  }

  static async excluir(id) {
    return this.atualizar(id, { ativo: 0 });
  }
}

module.exports = OrderStatusModel;
