const { getPool, sql } = require('../config/db');

const clientController = {
  // Listagem com filtro opcional
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search;
      const pool = await getPool();
      const requisicao = pool.request();

      let consulta = `
        SELECT 
          id, 
          nome, 
          cpf, 
          email, 
          telefone, 
          cidade, 
          endereco, 
          status, 
          observacoes, 
          criado_em AS criadoEm, 
          atualizado_em AS atualizadoEm,
          nome AS name,
          telefone AS phone,
          cidade AS city,
          endereco AS address,
          observacoes AS notes,
          criado_em AS createdAt,
          atualizado_em AS updatedAt
        FROM clientes
      `;

      if (busca && String(busca).trim() !== '') {
        requisicao.input('termoBusca', sql.NVarChar, `%${String(busca).trim()}%`);
        consulta += `
          WHERE nome LIKE @termoBusca 
             OR cpf LIKE @termoBusca 
             OR cidade LIKE @termoBusca 
             OR telefone LIKE @termoBusca
        `;
      }

      consulta += ' ORDER BY nome ASC';

      const resultado = await requisicao.query(consulta);
      return res.status(200).json(resultado.recordset);
    } catch (erro) {
      console.error('Erro ao listar clientes:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar clientes.' });
    }
  },

  // Cadastro de cliente
  async criar(req, res) {
    try {
      const { nome, cpf, email, telefone, cidade, endereco, observacoes } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      // Validacoes manuais diretas
      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }

      if (!telefone || !String(telefone).trim()) {
        return res.status(400).json({ error: 'O telefone do cliente é obrigatório.' });
      }

      const pool = await getPool();

      // Checar duplicidade de CPF caso informado
      if (cpf && String(cpf).trim() !== '') {
        const checarCpf = await pool
          .request()
          .input('cpf', sql.NVarChar, String(cpf).trim())
          .query('SELECT id FROM clientes WHERE cpf = @cpf');

        if (checarCpf.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este CPF já está cadastrado para outro cliente no sistema. Verifique o número informado.',
          });
        }
      }

      const resultadoInsercao = await pool
        .request()
        .input('nome', sql.NVarChar, String(nome).trim())
        .input('cpf', sql.NVarChar, cpf ? String(cpf).trim() : null)
        .input('email', sql.NVarChar, email ? String(email).trim() : null)
        .input('telefone', sql.NVarChar, String(telefone).trim())
        .input('cidade', sql.NVarChar, cidade ? String(cidade).trim() : 'Viradouro')
        .input('endereco', sql.NVarChar, endereco ? String(endereco).trim() : null)
        .input('observacoes', sql.NVarChar, observacoes ? String(observacoes).trim() : null)
        .query(`
          INSERT INTO clientes (id, nome, cpf, email, telefone, cidade, endereco, status, observacoes)
          OUTPUT inserted.id, inserted.nome, inserted.cpf, inserted.email, inserted.telefone, inserted.cidade, inserted.endereco, inserted.status, inserted.observacoes, inserted.criado_em, inserted.atualizado_em
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @telefone, @cidade, @endereco, 'ATIVO', @observacoes)
        `);

      const cliente = resultadoInsercao.recordset[0];

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, cliente.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: cliente.nome, telefone: cliente.telefone, cidade: cliente.cidade }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criacao de cliente:', erroLog.message);
      }

      return res.status(201).json({
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        email: cliente.email,
        telefone: cliente.telefone,
        cidade: cliente.cidade,
        endereco: cliente.endereco,
        status: cliente.status,
        observacoes: cliente.observacoes,
        criadoEm: cliente.criado_em,
        atualizadoEm: cliente.atualizado_em,
        name: cliente.nome,
        phone: cliente.telefone,
        city: cliente.cidade,
        address: cliente.endereco,
        notes: cliente.observacoes,
        createdAt: cliente.criado_em,
        updatedAt: cliente.atualizado_em,
      });
    } catch (erro) {
      console.error('Erro ao criar cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar cliente.' });
    }
  },

  // Atualizacao de cliente
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, cpf, email, telefone, cidade, endereco, observacoes, status } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido.' });
      }

      const pool = await getPool();

      // Checar existencia do cliente
      const checarExistente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id FROM clientes WHERE id = @id');

      if (checarExistente.recordset.length === 0) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema. O registro pode ter sido excluído recentemente.',
        });
      }

      // Validar duplicidade de CPF com outro cliente
      if (cpf && String(cpf).trim() !== '') {
        const checarCpf = await pool
          .request()
          .input('cpf', sql.NVarChar, String(cpf).trim())
          .input('id', sql.VarChar, id)
          .query('SELECT id FROM clientes WHERE cpf = @cpf AND id != @id');

        if (checarCpf.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este CPF já pertence a outro cliente cadastrado no sistema. Informe um CPF diferente.',
          });
        }
      }

      const requisicao = pool.request();
      let consulta = 'UPDATE clientes SET atualizado_em = GETDATE()';

      if (nome !== undefined) {
        consulta += ', nome = @nome';
        requisicao.input('nome', sql.NVarChar, String(nome).trim());
      }
      if (cpf !== undefined) {
        consulta += ', cpf = @cpf';
        requisicao.input('cpf', sql.NVarChar, cpf ? String(cpf).trim() : null);
      }
      if (email !== undefined) {
        consulta += ', email = @email';
        requisicao.input('email', sql.NVarChar, email ? String(email).trim() : null);
      }
      if (telefone !== undefined) {
        consulta += ', telefone = @telefone';
        requisicao.input('telefone', sql.NVarChar, String(telefone).trim());
      }
      if (cidade !== undefined) {
        consulta += ', cidade = @cidade';
        requisicao.input('cidade', sql.NVarChar, String(cidade).trim());
      }
      if (endereco !== undefined) {
        consulta += ', endereco = @endereco';
        requisicao.input('endereco', sql.NVarChar, endereco ? String(endereco).trim() : null);
      }
      if (observacoes !== undefined) {
        consulta += ', observacoes = @observacoes';
        requisicao.input('observacoes', sql.NVarChar, observacoes ? String(observacoes).trim() : null);
      }
      if (status !== undefined) {
        consulta += ', status = @status';
        requisicao.input('status', sql.NVarChar, status);
      }

      consulta += `
        OUTPUT 
          inserted.id, inserted.nome, inserted.cpf, inserted.email, 
          inserted.telefone, inserted.cidade, inserted.endereco, 
          inserted.status, inserted.observacoes, inserted.atualizado_em
        WHERE id = @id
      `;
      requisicao.input('id', sql.VarChar, id);

      const resultadoAtualizacao = await requisicao.query(consulta);
      const cliente = resultadoAtualizacao.recordset[0];

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, cliente.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: cliente.nome, status: cliente.status }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualizacao de cliente:', erroLog.message);
      }

      return res.status(200).json({
        ...cliente,
        name: cliente.nome,
        phone: cliente.telefone,
        city: cliente.cidade,
        updatedAt: cliente.atualizado_em,
      });
    } catch (erro) {
      console.error('Erro ao atualizar cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar cliente.' });
    }
  },

  // Exclusao de cliente
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido.' });
      }

      const pool = await getPool();

      const resultadoCliente = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome FROM clientes WHERE id = @id');

      if (resultadoCliente.recordset.length === 0) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema para exclusão. O registro pode já ter sido removido.',
        });
      }

      const cliente = resultadoCliente.recordset[0];

      await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('DELETE FROM clientes WHERE id = @id');

      // Auditoria: registro obrigatorio em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'EXCLUIR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, cliente.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: cliente.nome, status: 'EXCLUIDO' }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de exclusao de cliente:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Cliente excluído com sucesso.',
        cliente,
      });
    } catch (erro) {
      console.error('Erro ao excluir cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao excluir cliente.' });
    }
  },
};

module.exports = clientController;
