const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

async function popularUsuarios() {
  try {
    console.log('Conectando ao banco de dados...');
    const pool = await getPool();
    console.log('Conectado com sucesso.');

    // Fator de custo 10 para otimizacao
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashComum = await bcrypt.hash('123456', 10);

    // 1. Atualizar Administrador
    await pool
      .request()
      .input('email', sql.NVarChar, 'admin@mediator.com')
      .input('senha_hash', sql.NVarChar, hashAdmin)
      .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");

    // 2. Atualizar Atendente
    await pool
      .request()
      .input('email', sql.NVarChar, 'ana@mediator.com')
      .input('senha_hash', sql.NVarChar, hashComum)
      .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");

    // 3. Atualizar Tecnico
    await pool
      .request()
      .input('email', sql.NVarChar, 'carlos@mediator.com')
      .input('senha_hash', sql.NVarChar, hashComum)
      .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");

    // 4. Criar ou Atualizar Miguel Manso
    const checarMiguel = await pool
      .request()
      .input('email', sql.NVarChar, 'miguel@mediator.com')
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (checarMiguel.recordset.length === 0) {
      await pool
        .request()
        .input('nome', sql.NVarChar, 'Miguel Manso (Administrador)')
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .input('cargo', sql.NVarChar, 'ADMIN')
        .input('status', sql.NVarChar, 'ATIVO')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status)
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, @status)
        `);
    } else {
      await pool
        .request()
        .input('email', sql.NVarChar, 'miguel@mediator.com')
        .input('senha_hash', sql.NVarChar, hashAdmin)
        .query("UPDATE usuarios SET senha_hash = @senha_hash, status = 'ATIVO' WHERE email = @email");
    }

    const todosUsuarios = await pool.request().query('SELECT id, nome, email, cargo, status FROM usuarios');
    console.log('Usuarios atualizados com sucesso:');
    console.table(todosUsuarios.recordset);
  } catch (erro) {
    console.error('Erro ao sincronizar usuarios:', erro.message);
  } finally {
    process.exit(0);
  }
}

popularUsuarios();
