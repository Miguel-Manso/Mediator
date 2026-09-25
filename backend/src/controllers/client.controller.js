const { getPool, sql } = require('../config/db');
const ClientModel = require('../models/Client.model');
const AddressModel = require('../models/Address.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const clientController = {
  // Listagem com filtro opcional e paginação controlada
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const { pagina, limite } = getPaginationParams(req.query, 10, 100);
      const paginado = req.query.todas !== 'true' && req.query.paginado !== 'false';

      const pool = await getPool();
      const reqCount = pool.request();
      const reqData = pool.request();

      let whereClause = '';
      if (busca && String(busca).trim() !== '') {
        const termo = `%${String(busca).trim()}%`;
        reqCount.input('termoBusca', sql.NVarChar, termo);
        reqData.input('termoBusca', sql.NVarChar, termo);
        whereClause = `
          WHERE c.nome LIKE @termoBusca 
             OR c.cpf LIKE @termoBusca 
             OR c.telefone LIKE @termoBusca
             OR c.email LIKE @termoBusca
             OR e.cidade LIKE @termoBusca
             OR e.logradouro LIKE @termoBusca
             OR e.bairro LIKE @termoBusca
        `;
      }

      // 1. Contagem total
      const countQuery = `
        SELECT COUNT(c.id) AS total
        FROM clientes c
        LEFT JOIN enderecos e ON c.endereco_id = e.id
        ${whereClause}
      `;
      const countResult = await reqCount.query(countQuery);
      const total = countResult.recordset[0]?.total || 0;

      // 2. Query de dados dos clientes
      let dataQuery = `
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
        ORDER BY c.nome ASC
      `;

      if (paginado !== false) {
        const offset = (pagina - 1) * limite;
        reqData.input('offset', sql.Int, offset);
        reqData.input('limite', sql.Int, limite);
        dataQuery += ' OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY';
      }

      const result = await reqData.query(dataQuery);
      const clientes = result.recordset.map((row) => new ClientModel(row));
      const paginacao = buildPaginationMeta(total, pagina, limite);

      return res.status(200).json({
        dados: clientes,
        clientes,
        paginacao,
      });
    } catch (erro) {
      console.error('Erro ao listar clientes:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar clientes.' });
    }
  },

  // Cadastro de cliente com validação de campos e criação de endereço
  async criar(req, res) {
    try {
      const dadosModelo = new ClientModel(req.body);
      const { confirmEmail, confirmarEmail } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      // 1. Validação de campos obrigatórios
      if (!dadosModelo.nome) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }

      if (!dadosModelo.telefone) {
        return res.status(400).json({ error: 'O telefone do cliente é obrigatório.' });
      }

      // 2. Validação de correspondência de e-mail (se fornecido)
      const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();
      if (dadosModelo.email && confirmacaoEmail && dadosModelo.email !== confirmacaoEmail) {
        return res.status(400).json({
          error: 'A confirmação de e-mail não corresponde ao e-mail informado.',
        });
      }

      const pool = await getPool();

      // 3. Checar duplicidade de CPF se fornecido
      if (dadosModelo.cpf) {
        const checkCpf = await pool
          .request()
          .input('cpf', sql.NVarChar, dadosModelo.cpf)
          .query('SELECT id FROM clientes WHERE cpf = @cpf');

        if (checkCpf.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este CPF já está cadastrado para outro cliente no sistema.',
          });
        }
      }

      // 4. Criar registro de endereço caso haja dados de localização
      let enderecoId = null;
      if (dadosModelo.logradouro) {
        try {
          const enderecoObj = new AddressModel({
            logradouro: dadosModelo.logradouro,
            numero: dadosModelo.numero,
            complemento: dadosModelo.complemento,
            bairro: dadosModelo.bairro,
            cidade: dadosModelo.cidade,
            uf: dadosModelo.uf,
            cep: dadosModelo.cep,
          });

          const resultEnd = await pool
            .request()
            .input('logradouro', sql.NVarChar, enderecoObj.logradouro)
            .input('numero', sql.NVarChar, enderecoObj.numero)
            .input('complemento', sql.NVarChar, enderecoObj.complemento)
            .input('bairro', sql.NVarChar, enderecoObj.bairro)
            .input('cidade', sql.NVarChar, enderecoObj.cidade)
            .input('uf', sql.NVarChar, enderecoObj.uf)
            .input('cep', sql.NVarChar, enderecoObj.cep)
            .query(`
              INSERT INTO enderecos (id, logradouro, numero, complemento, bairro, cidade, uf, cep, ativo)
              OUTPUT inserted.id
              VALUES (LOWER(NEWID()), @logradouro, @numero, @complemento, @bairro, @cidade, @uf, @cep, 1)
            `);

          enderecoId = resultEnd.recordset[0]?.id || null;
        } catch (erroEndereco) {
          console.warn('Não foi possível persistir o registro em enderecos:', erroEndereco.message);
        }
      }

      // 5. Inserir cliente
      const resultCliente = await pool
        .request()
        .input('nome', sql.NVarChar, dadosModelo.nome)
        .input('cpf', sql.NVarChar, dadosModelo.cpf)
        .input('email', sql.NVarChar, dadosModelo.email)
        .input('telefone', sql.NVarChar, dadosModelo.telefone)
        .input('endereco_id', sql.VarChar, enderecoId)
        .input('observacoes', sql.NVarChar, dadosModelo.observacoes)
        .query(`
          INSERT INTO clientes (id, nome, cpf, email, telefone, endereco_id, status, ativo, observacoes)
          OUTPUT 
            inserted.id, inserted.nome, inserted.cpf, inserted.email, 
            inserted.telefone, inserted.endereco_id AS enderecoId,
            inserted.status, inserted.ativo, inserted.observacoes, 
            inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @nome, @cpf, @email, @telefone, @endereco_id, 'ATIVO', 1, @observacoes)
        `);

      const clienteCriado = new ClientModel({
        ...resultCliente.recordset[0],
        logradouro: dadosModelo.logradouro,
        numero: dadosModelo.numero,
        complemento: dadosModelo.complemento,
        bairro: dadosModelo.bairro,
        cidade: dadosModelo.cidade,
        uf: dadosModelo.uf,
        cep: dadosModelo.cep,
      });

      // 6. Registro de auditoria em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, clienteCriado.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: clienteCriado.nome, telefone: clienteCriado.telefone, cidade: clienteCriado.cidade })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de cliente:', erroLog.message);
      }

      return res.status(201).json(clienteCriado);
    } catch (erro) {
      console.error('Erro ao criar cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar cliente.' });
    }
  },

  // Atualização de cliente
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        cpf,
        email,
        confirmEmail,
        confirmarEmail,
        telefone,
        cidade,
        endereco,
        observacoes,
        status,
        logradouro,
        numero,
        complemento,
        bairro,
        uf,
        cep,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido.' });
      }

      const pool = await getPool();

      // Checar cliente existente
      const checkResult = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          SELECT 
            c.id, c.nome, c.cpf, c.email, c.telefone, c.endereco_id AS enderecoId, 
            c.status, c.ativo, c.observacoes,
            e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep
          FROM clientes c
          LEFT JOIN enderecos e ON c.endereco_id = e.id
          WHERE c.id = @id
        `);

      const clienteExistente = checkResult.recordset[0];
      if (!clienteExistente) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema para atualização.',
        });
      }

      // Validação de duplicidade de CPF
      if (cpf !== undefined && cpf && String(cpf).trim() !== '') {
        const cpfTratado = String(cpf).trim();
        const checkCpf = await pool
          .request()
          .input('cpf', sql.NVarChar, cpfTratado)
          .input('id', sql.VarChar, id)
          .query('SELECT id FROM clientes WHERE cpf = @cpf AND id != @id');

        if (checkCpf.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este CPF já pertence a outro cliente cadastrado no sistema.',
          });
        }
      }

      // Validação e correspondência de e-mail
      let emailTratado = undefined;
      if (email !== undefined) {
        emailTratado = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null;
        const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

        if (emailTratado && confirmacaoEmail && emailTratado !== confirmacaoEmail) {
          return res.status(400).json({
            error: 'A confirmação de e-mail não corresponde ao novo e-mail informado.',
          });
        }
      }

      // Atualizar ou criar endereço
      let enderecoId = clienteExistente.enderecoId;
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal || numero || bairro || cep || uf || cidade) {
        if (enderecoId) {
          const reqEnd = pool.request().input('id', sql.VarChar, enderecoId);
          let queryEnd = 'UPDATE enderecos SET atualizado_em = GETDATE()';

          if (logradouroFinal !== undefined) {
            queryEnd += ', logradouro = @logradouro';
            reqEnd.input('logradouro', sql.NVarChar, String(logradouroFinal).trim());
          }
          if (numero !== undefined) {
            queryEnd += ', numero = @numero';
            reqEnd.input('numero', sql.NVarChar, numero ? String(numero).trim() : null);
          }
          if (complemento !== undefined) {
            queryEnd += ', complemento = @complemento';
            reqEnd.input('complemento', sql.NVarChar, complemento ? String(complemento).trim() : null);
          }
          if (bairro !== undefined) {
            queryEnd += ', bairro = @bairro';
            reqEnd.input('bairro', sql.NVarChar, bairro ? String(bairro).trim() : null);
          }
          if (cidade !== undefined) {
            queryEnd += ', cidade = @cidade';
            reqEnd.input('cidade', sql.NVarChar, String(cidade).trim());
          }
          if (uf !== undefined) {
            queryEnd += ', uf = @uf';
            reqEnd.input('uf', sql.NVarChar, String(uf).trim().toUpperCase());
          }
          if (cep !== undefined) {
            queryEnd += ', cep = @cep';
            reqEnd.input('cep', sql.NVarChar, cep ? String(cep).trim() : null);
          }

          queryEnd += ' WHERE id = @id';
          await reqEnd.query(queryEnd);
        } else if (logradouroFinal && String(logradouroFinal).trim() !== '') {
          const endObj = new AddressModel({
            logradouro: logradouroFinal,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            cep,
          });
          const resNovoEnd = await pool
            .request()
            .input('logradouro', sql.NVarChar, endObj.logradouro)
            .input('numero', sql.NVarChar, endObj.numero)
            .input('complemento', sql.NVarChar, endObj.complemento)
            .input('bairro', sql.NVarChar, endObj.bairro)
            .input('cidade', sql.NVarChar, endObj.cidade)
            .input('uf', sql.NVarChar, endObj.uf)
            .input('cep', sql.NVarChar, endObj.cep)
            .query(`
              INSERT INTO enderecos (id, logradouro, numero, complemento, bairro, cidade, uf, cep, ativo)
              OUTPUT inserted.id
              VALUES (LOWER(NEWID()), @logradouro, @numero, @complemento, @bairro, @cidade, @uf, @cep, 1)
            `);
          enderecoId = resNovoEnd.recordset[0]?.id || null;
        }
      }

      // Atualizar dados de clientes
      const reqClienteUpdate = pool.request().input('id', sql.VarChar, id);
      let queryCliente = 'UPDATE clientes SET atualizado_em = GETDATE()';

      if (nome !== undefined) {
        queryCliente += ', nome = @nome';
        reqClienteUpdate.input('nome', sql.NVarChar, String(nome).trim());
      }
      if (cpf !== undefined) {
        queryCliente += ', cpf = @cpf';
        reqClienteUpdate.input('cpf', sql.NVarChar, cpf && String(cpf).trim() ? String(cpf).trim() : null);
      }
      if (emailTratado !== undefined) {
        queryCliente += ', email = @email';
        reqClienteUpdate.input('email', sql.NVarChar, emailTratado);
      }
      if (telefone !== undefined) {
        queryCliente += ', telefone = @telefone';
        reqClienteUpdate.input('telefone', sql.NVarChar, String(telefone).trim());
      }
      if (enderecoId) {
        queryCliente += ', endereco_id = @endereco_id';
        reqClienteUpdate.input('endereco_id', sql.VarChar, enderecoId);
      }
      if (observacoes !== undefined) {
        queryCliente += ', observacoes = @observacoes';
        reqClienteUpdate.input('observacoes', sql.NVarChar, observacoes ? String(observacoes).trim() : null);
      }
      if (status !== undefined) {
        queryCliente += ', status = @status';
        reqClienteUpdate.input('status', sql.NVarChar, status);
        if (status === 'INATIVO') {
          queryCliente += ', ativo = 0';
        } else if (status === 'ATIVO') {
          queryCliente += ', ativo = 1';
        }
      }

      queryCliente += `
        OUTPUT 
          inserted.id, inserted.nome, inserted.cpf, inserted.email, 
          inserted.telefone, inserted.endereco_id AS enderecoId,
          inserted.status, inserted.ativo, inserted.observacoes, inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `;

      const resultUpdate = await reqClienteUpdate.query(queryCliente);
      const clienteRow = resultUpdate.recordset[0];
      const clienteAtualizado = new ClientModel(clienteRow);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: clienteAtualizado.nome, status: clienteAtualizado.status })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de cliente:', erroLog.message);
      }

      return res.status(200).json(clienteAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar cliente.' });
    }
  },

  // Soft Delete de cliente
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente não fornecido.' });
      }

      const pool = await getPool();
      const checkResult = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, status, ativo FROM clientes WHERE id = @id');

      const clienteExistente = checkResult.recordset[0];
      if (!clienteExistente) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema para inativação.',
        });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE clientes 
          SET status = 'INATIVO', ativo = 0, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.status, inserted.ativo, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const clienteInativado = new ClientModel(result.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: clienteExistente.nome, status: 'INATIVO', ativo: 0 })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de cliente:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Cliente desativado com sucesso.',
        cliente: clienteInativado,
      });
    } catch (erro) {
      console.error('Erro ao excluir cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao excluir cliente.' });
    }
  },
};

module.exports = clientController;
