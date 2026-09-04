const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

const userController = {
  // Listagem de colaboradores
  async listar(req, res) {
    try {
      const pool = await getPool();
      const resultado = await pool.query(`
        SELECT 
          id, 
          nome, 
          email, 
          cargo, 
          status, 
          telefone, 
          cidade, 
          criado_em AS criadoEm,
          nome AS name,
          cargo AS role,
          telefone AS phone,
          cidade AS city,
          criado_em AS createdAt
        FROM usuarios
        ORDER BY nome ASC
      `);

      return res.status(200).json(resultado.recordset);
    } catch (erro) {
      console.error('Erro ao listar usuários:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar colaboradores.' });
    }
  },

  // Cadastro de novo colaborador
  async criar(req, res) {
    try {
      const { nome, email, senha, cargo, telefone, cidade } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      // Validacoes manuais diretas
      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do colaborador é obrigatório.' });
      }

      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'O e-mail do colaborador é obrigatório.' });
      }

      if (!senha || String(senha).length < 6) {
        return res.status(400).json({ error: 'A senha é obrigatória e deve ter pelo menos 6 caracteres.' });
      }

      const emailTratado = String(email).trim().toLowerCase();
      const cargoTratado = cargo ? String(cargo).toUpperCase() : 'ATENDENTE';

      const pool = await getPool();

      // Checar duplicidade de e-mail
      const checarUsuario = await pool
        .request()
        .input('email', sql.NVarChar, emailTratado)
        .query('SELECT id FROM usuarios WHERE email = @email');

      if (checarUsuario.recordset.length > 0) {
        return res.status(400).json({
          error: 'Este endereço de e-mail já está cadastrado para outro colaborador.',
        });
      }

      // Hash da senha com custo 10
      const senhaHash = await bcrypt.hash(String(senha), 10);

      const resultadoInsercao = await pool
        .request()
        .input('nome', sql.NVarChar, String(nome).trim())
        .input('email', sql.NVarChar, emailTratado)
        .input('senha_hash', sql.NVarChar, senhaHash)
        .input('cargo', sql.NVarChar, cargoTratado)
        .input('telefone', telefone ? String(telefone).trim() : null)
        .input('cidade', cidade ? String(cidade).trim() : 'Viradouro')
        .query(`
          INSERT INTO usuarios (id, nome, email, senha_hash, cargo, status, telefone, cidade)
          OUTPUT inserted.id, inserted.nome, inserted.email, inserted.cargo, inserted.status, inserted.telefone, inserted.cidade, inserted.criado_em
          VALUES (LOWER(NEWID()), @nome, @email, @senha_hash, @cargo, 'ATIVO', @telefone, @cidade)
        `);

      const usuario = resultadoInsercao.recordset[0];

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, usuario.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: usuario.nome, cargo: usuario.cargo, email: usuario.email }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criacao de usuario:', erroLog.message);
      }

      return res.status(201).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        status: usuario.status,
        telefone: usuario.telefone,
        cidade: usuario.cidade,
        criadoEm: usuario.criado_em,
        name: usuario.nome,
        role: usuario.cargo,
        createdAt: usuario.criado_em,
      });
    } catch (erro) {
      console.error('Erro ao criar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar colaborador.' });
    }
  },

  // Atualizacao de colaborador
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, email, senha, cargo, status, telefone, cidade } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário não fornecido.' });
      }

      const pool = await getPool();

      // Checar se usuario existe
      const checarExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id FROM usuarios WHERE id = @id');

      if (checarExistente.recordset.length === 0) {
        return res.status(404).json({
          error: 'Colaborador não localizado no sistema. O usuário pode ter sido excluído recentemente.',
        });
      }

      // Validar duplicidade de email caso alterado
      if (email && String(email).trim()) {
        const emailTratado = String(email).trim().toLowerCase();
        const checarEmail = await pool
          .request()
          .input('email', sql.NVarChar, emailTratado)
          .input('id', sql.VarChar, id)
          .query('SELECT id FROM usuarios WHERE email = @email AND id != @id');

        if (checarEmail.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este endereço de e-mail já está sendo utilizado por outro colaborador no sistema.',
          });
        }
      }

      const requisicao = pool.request();
      let consulta = 'UPDATE usuarios SET atualizado_em = GETDATE()';

      if (nome !== undefined) {
        consulta += ', nome = @nome';
        requisicao.input('nome', sql.NVarChar, String(nome).trim());
      }
      if (email !== undefined) {
        consulta += ', email = @email';
        requisicao.input('email', sql.NVarChar, String(email).trim().toLowerCase());
      }
      if (senha && String(senha).trim()) {
        const senhaHash = await bcrypt.hash(String(senha), 10);
        consulta += ', senha_hash = @senha_hash';
        requisicao.input('senha_hash', sql.NVarChar, senhaHash);
      }
      if (cargo !== undefined) {
        consulta += ', cargo = @cargo';
        requisicao.input('cargo', sql.NVarChar, String(cargo).toUpperCase());
      }
      if (status !== undefined) {
        consulta += ', status = @status';
        requisicao.input('status', sql.NVarChar, status);
      }
      if (telefone !== undefined) {
        consulta += ', telefone = @telefone';
        requisicao.input('telefone', sql.NVarChar, telefone ? String(telefone).trim() : null);
      }
      if (cidade !== undefined) {
        consulta += ', cidade = @cidade';
        requisicao.input('cidade', sql.NVarChar, String(cidade).trim());
      }

      consulta += `
        OUTPUT 
          inserted.id, inserted.nome, inserted.email, inserted.cargo, 
          inserted.status, inserted.telefone, inserted.cidade, inserted.atualizado_em
        WHERE id = @id
      `;
      requisicao.input('id', sql.VarChar, id);

      const resultadoAtualizacao = await requisicao.query(consulta);
      const usuario = resultadoAtualizacao.recordset[0];

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, usuario.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: usuario.nome, cargo: usuario.cargo, status: usuario.status }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualizacao de usuario:', erroLog.message);
      }

      return res.status(200).json({
        ...usuario,
        name: usuario.nome,
        role: usuario.cargo,
        phone: usuario.telefone,
        city: usuario.cidade,
        updatedAt: usuario.atualizado_em,
      });
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar colaborador.' });
    }
  },

  // Exclusao de colaborador
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário não fornecido.' });
      }

      const pool = await getPool();

      const resultadoUsuario = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, email FROM usuarios WHERE id = @id');

      if (resultadoUsuario.recordset.length === 0) {
        return res.status(404).json({
          error: 'Colaborador não localizado para exclusão. O registro pode já ter sido removido.',
        });
      }

      const usuario = resultadoUsuario.recordset[0];

      await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('DELETE FROM usuarios WHERE id = @id');

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'EXCLUIR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, usuario.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: usuario.nome, email: usuario.email, status: 'EXCLUIDO' }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de exclusao de usuario:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Colaborador excluído com sucesso.',
        usuario,
      });
    } catch (erro) {
      console.error('Erro ao excluir usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao excluir colaborador.' });
    }
  },
};

module.exports = userController;
