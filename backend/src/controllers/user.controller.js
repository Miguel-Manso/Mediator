const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');
const UserModel = require('../models/User.model');
const AddressModel = require('../models/Address.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const userController = {
  // Listagem de colaboradores com suporte a busca e paginação
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const { pagina, limite } = getPaginationParams(req.query, 10, 100);
      const paginado = req.query.todas !== 'true' && req.query.paginado !== 'false';

      const pool = await getPool();
      const reqCount = pool.request();
      const reqData = pool.request();

      let whereClause = ' WHERE 1=1';

      if (busca && String(busca).trim() !== '') {
        const termo = `%${String(busca).trim()}%`;
        reqCount.input('termoBusca', sql.NVarChar, termo);
        reqData.input('termoBusca', sql.NVarChar, termo);
        whereClause += `
          AND (
            u.nome LIKE @termoBusca 
            OR u.email LIKE @termoBusca 
            OR u.cpf LIKE @termoBusca
            OR u.cargo LIKE @termoBusca
            OR u.telefone LIKE @termoBusca
          )
        `;
      }

      // 1. Contagem total
      const countQuery = `
        SELECT COUNT(u.id) AS total
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
      `;
      const countResult = await reqCount.query(countQuery);
      const total = countResult.recordset[0]?.total || 0;

      // 2. Query de dados dos usuários
      let dataQuery = `
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
          e.logradouro,
          e.numero,
          e.complemento,
          e.bairro,
          COALESCE(e.cidade, 'Viradouro') AS enderecoCidade,
          e.cep,
          e.uf
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        ${whereClause}
        ORDER BY u.nome ASC
      `;

      if (paginado !== false) {
        const offset = (pagina - 1) * limite;
        reqData.input('offset', sql.Int, offset);
        reqData.input('limite', sql.Int, limite);
        dataQuery += ' OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY';
      }

      const result = await reqData.query(dataQuery);
      const usuarios = result.recordset.map((row) => new UserModel(row));
      const paginacao = buildPaginationMeta(total, pagina, limite);

      return res.status(200).json({
        dados: usuarios,
        usuarios,
        paginacao,
      });
    } catch (erro) {
      console.error('Erro ao listar usuários:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar colaboradores.' });
    }
  },

  // Cadastro de novo colaborador com validações de confirmação de email e senha
  async criar(req, res) {
    try {
      const dadosModelo = new UserModel(req.body);
      const {
        senha,
        confirmSenha,
        confirmarSenha,
        confirmEmail,
        confirmarEmail,
        endereco,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      // 1. Validação de campos obrigatórios
      if (!dadosModelo.nome) {
        return res.status(400).json({ error: 'O nome do colaborador é obrigatório.' });
      }

      if (!dadosModelo.email) {
        return res.status(400).json({ error: 'O e-mail do colaborador é obrigatório.' });
      }

      // 2. Regra de correspondência de e-mail (se confirmação fornecida)
      const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();
      if (confirmacaoEmail && dadosModelo.email !== confirmacaoEmail) {
        return res.status(400).json({
          error: 'A confirmação de e-mail não confere com o e-mail informado.',
        });
      }

      // 3. Validação de senha
      if (!senha || String(senha).length < 6) {
        return res.status(400).json({
          error: 'A senha é obrigatória e deve ter pelo menos 6 caracteres.',
        });
      }

      const confirmacaoSenha = String(confirmSenha || confirmarSenha || '');
      if (confirmacaoSenha && String(senha) !== confirmacaoSenha) {
        return res.status(400).json({
          error: 'A confirmação de senha não confere com a senha digitada.',
        });
      }

      const pool = await getPool();

      // 4. Checar duplicidade de e-mail
      const checkEmail = await pool
        .request()
        .input('email', sql.NVarChar, dadosModelo.email)
        .query('SELECT id FROM usuarios WHERE LOWER(email) = @email');

      if (checkEmail.recordset.length > 0) {
        return res.status(400).json({
          error: 'Este endereço de e-mail já está cadastrado para outro colaborador.',
        });
      }

      // 4.1 Checar duplicidade de CPF se fornecido
      if (dadosModelo.cpf) {
        const checkCpf = await pool
          .request()
          .input('cpf', sql.NVarChar, dadosModelo.cpf)
          .query('SELECT id FROM usuarios WHERE cpf = @cpf');

        if (checkCpf.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este CPF já está cadastrado para outro colaborador.',
          });
        }
      }

      // 5. Criptografia da senha
      const senhaHash = await bcrypt.hash(String(senha), 10);

      // 6. Criar endereço normalizado caso dados tenham sido informados
      let enderecoId = dadosModelo.enderecoId;
      const logradouroFinal = dadosModelo.logradouro || endereco;
      if (logradouroFinal || dadosModelo.numero || dadosModelo.bairro || dadosModelo.cep || dadosModelo.uf || dadosModelo.cidade) {
        try {
          const enderecoObj = new AddressModel({
            logradouro: logradouroFinal || 'Não informado',
            numero: dadosModelo.numero,
            complemento: dadosModelo.complemento,
            bairro: dadosModelo.bairro,
            cidade: dadosModelo.cidade,
            uf: dadosModelo.uf,
            cep: dadosModelo.cep,
          });

          const resEnd = await pool
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

          enderecoId = resEnd.recordset[0]?.id || null;
        } catch (erroEnd) {
          console.warn('Falha ao registrar endereço de usuário:', erroEnd.message);
        }
      }

      // 7. Inserir usuário
      const resultUser = await pool
        .request()
        .input('nome', sql.NVarChar, dadosModelo.nome)
        .input('email', sql.NVarChar, dadosModelo.email)
        .input('cpf', sql.NVarChar, dadosModelo.cpf)
        .input('senha_hash', sql.NVarChar, senhaHash)
        .input('cargo', sql.NVarChar, dadosModelo.cargo)
        .input('telefone', sql.NVarChar, dadosModelo.telefone)
        .input('endereco_id', sql.VarChar, enderecoId)
        .query(`
          INSERT INTO usuarios (id, nome, email, cpf, senha_hash, cargo, status, ativo, telefone, endereco_id)
          OUTPUT 
            inserted.id, inserted.nome, inserted.email, inserted.cpf, 
            inserted.cargo, inserted.status, inserted.ativo, 
            inserted.telefone, inserted.endereco_id AS enderecoId, 
            inserted.criado_em AS criadoEm, inserted.atualizado_em AS atualizadoEm
          VALUES (LOWER(NEWID()), @nome, @email, @cpf, @senha_hash, @cargo, 'ATIVO', 1, @telefone, @endereco_id)
        `);

      const usuarioCriado = new UserModel({
        ...resultUser.recordset[0],
        logradouro: dadosModelo.logradouro,
        numero: dadosModelo.numero,
        complemento: dadosModelo.complemento,
        bairro: dadosModelo.bairro,
        cidade: dadosModelo.cidade,
        uf: dadosModelo.uf,
        cep: dadosModelo.cep,
      });

      // 8. Registro de auditoria em logs_sistema
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, usuarioCriado.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: usuarioCriado.nome, cargo: usuarioCriado.cargo, email: usuarioCriado.email, cpf: usuarioCriado.cpf })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de usuário:', erroLog.message);
      }

      return res.status(201).json(usuarioCriado);
    } catch (erro) {
      console.error('Erro ao criar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar colaborador.' });
    }
  },

  // Atualização de colaborador
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        email,
        cpf,
        confirmEmail,
        confirmarEmail,
        senha,
        confirmSenha,
        confirmarSenha,
        cargo,
        status,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        endereco,
        enderecoId,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário não fornecido.' });
      }

      const pool = await getPool();

      // Checar usuário existente
      const checkUser = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          SELECT 
            u.id, u.nome, u.email, u.cpf, u.cargo, u.status, u.ativo, u.telefone, 
            u.endereco_id AS enderecoId,
            e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep
          FROM usuarios u
          LEFT JOIN enderecos e ON u.endereco_id = e.id
          WHERE u.id = @id
        `);

      const usuarioExistente = checkUser.recordset[0];
      if (!usuarioExistente) {
        return res.status(404).json({
          error: 'Colaborador não localizado no sistema. O usuário pode ter sido inativado recentemente.',
        });
      }

      // Validação e correspondência de email
      let emailTratado = undefined;
      if (email !== undefined && String(email).trim() !== '') {
        emailTratado = String(email).trim().toLowerCase();
        const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

        if (confirmacaoEmail && emailTratado !== confirmacaoEmail) {
          return res.status(400).json({
            error: 'A confirmação de e-mail não confere com o novo e-mail informado.',
          });
        }

        const checkEmailDup = await pool
          .request()
          .input('email', sql.NVarChar, emailTratado)
          .input('id', sql.VarChar, id)
          .query('SELECT id FROM usuarios WHERE LOWER(email) = @email AND id != @id');

        if (checkEmailDup.recordset.length > 0) {
          return res.status(400).json({
            error: 'Este endereço de e-mail já está sendo utilizado por outro colaborador.',
          });
        }
      }

      // Validação e unicidade de CPF
      let cpfTratado = undefined;
      if (cpf !== undefined) {
        cpfTratado = cpf && String(cpf).trim() ? String(cpf).trim() : null;
        if (cpfTratado) {
          const checkCpfDup = await pool
            .request()
            .input('cpf', sql.NVarChar, cpfTratado)
            .input('id', sql.VarChar, id)
            .query('SELECT id FROM usuarios WHERE cpf = @cpf AND id != @id');

          if (checkCpfDup.recordset.length > 0) {
            return res.status(400).json({
              error: 'Este CPF já está sendo utilizado por outro colaborador.',
            });
          }
        }
      }

      // Validação e correspondência de nova senha (se enviada)
      let novaSenhaHash = null;
      if (senha && String(senha).trim() !== '') {
        if (String(senha).length < 6) {
          return res.status(400).json({
            error: 'A nova senha deve possuir pelo menos 6 caracteres.',
          });
        }

        const confirmacaoSenha = String(confirmSenha || confirmarSenha || '');
        if (confirmacaoSenha && String(senha) !== confirmacaoSenha) {
          return res.status(400).json({
            error: 'A confirmação de senha não coincide com a nova senha digitada.',
          });
        }

        novaSenhaHash = await bcrypt.hash(String(senha), 10);
      }

      // Atualizar ou criar registro de endereço normalizado
      let idEndFinal = enderecoId !== undefined ? enderecoId : usuarioExistente.enderecoId;
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal || numero || bairro || cep || uf || cidade) {
        if (idEndFinal) {
          const reqEnd = pool.request().input('id', sql.VarChar, idEndFinal);
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

          idEndFinal = resNovoEnd.recordset[0]?.id || null;
        }
      }

      // Atualizar dados de usuarios
      const reqUserUpdate = pool.request().input('id', sql.VarChar, id);
      let queryUser = 'UPDATE usuarios SET atualizado_em = GETDATE()';

      if (nome !== undefined) {
        queryUser += ', nome = @nome';
        reqUserUpdate.input('nome', sql.NVarChar, String(nome).trim());
      }
      if (emailTratado !== undefined) {
        queryUser += ', email = @email';
        reqUserUpdate.input('email', sql.NVarChar, emailTratado);
      }
      if (cpfTratado !== undefined) {
        queryUser += ', cpf = @cpf';
        reqUserUpdate.input('cpf', sql.NVarChar, cpfTratado);
      }
      if (novaSenhaHash) {
        queryUser += ', senha_hash = @senha_hash';
        reqUserUpdate.input('senha_hash', sql.NVarChar, novaSenhaHash);
      }
      if (cargo !== undefined) {
        queryUser += ', cargo = @cargo';
        reqUserUpdate.input('cargo', sql.NVarChar, String(cargo).toUpperCase());
      }
      if (status !== undefined) {
        queryUser += ', status = @status';
        reqUserUpdate.input('status', sql.NVarChar, status);
        if (status === 'ATIVO') {
          queryUser += ', ativo = 1';
        } else if (status === 'INATIVO') {
          queryUser += ', ativo = 0';
        }
      }
      if (telefone !== undefined) {
        queryUser += ', telefone = @telefone';
        reqUserUpdate.input('telefone', sql.NVarChar, telefone ? String(telefone).trim() : null);
      }
      if (idEndFinal !== undefined) {
        queryUser += ', endereco_id = @endereco_id';
        reqUserUpdate.input('endereco_id', sql.VarChar, idEndFinal || null);
      }

      queryUser += `
        OUTPUT 
          inserted.id, inserted.nome, inserted.email, inserted.cpf, 
          inserted.cargo, inserted.status, inserted.ativo, 
          inserted.telefone, inserted.endereco_id AS enderecoId, 
          inserted.atualizado_em AS atualizadoEm
        WHERE id = @id
      `;

      const resultUserUpdate = await reqUserUpdate.query(queryUser);
      const usuarioAtualizado = new UserModel(resultUserUpdate.recordset[0]);

      // Auditoria
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: usuarioAtualizado.nome,
              cargo: usuarioAtualizado.cargo,
              status: usuarioAtualizado.status,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de usuário:', erroLog.message);
      }

      return res.status(200).json(usuarioAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar colaborador.' });
    }
  },

  // Soft Delete: Proibição total de DELETE físico
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioLogadoId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário não fornecido.' });
      }

      if (usuarioLogadoId === id) {
        return res.status(400).json({
          error: 'Você não pode desativar a sua própria conta logada no sistema.',
        });
      }

      const pool = await getPool();
      const checkUser = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query('SELECT id, nome, email, status, ativo FROM usuarios WHERE id = @id');

      const usuarioExistente = checkUser.recordset[0];
      if (!usuarioExistente) {
        return res.status(404).json({
          error: 'Colaborador não localizado para desativação.',
        });
      }

      const result = await pool
        .request()
        .input('id', sql.VarChar, id)
        .query(`
          UPDATE usuarios 
          SET status = 'INATIVO', ativo = 0, atualizado_em = GETDATE()
          OUTPUT inserted.id, inserted.nome, inserted.status, inserted.ativo, inserted.atualizado_em AS atualizadoEm
          WHERE id = @id
        `);

      const usuarioDesativado = new UserModel(result.recordset[0]);

      // Auditoria: registro de inativação
      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioLogadoId)
          .input('acao', sql.NVarChar, 'INATIVAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              nome: usuarioExistente.nome,
              email: usuarioExistente.email,
              statusAnterior: usuarioExistente.status,
              statusNovo: 'INATIVO',
              ativo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de usuário:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Colaborador desativado com sucesso.',
        usuario: usuarioDesativado,
      });
    } catch (erro) {
      console.error('Erro ao desativar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao desativar colaborador.' });
    }
  },
};

module.exports = userController;
