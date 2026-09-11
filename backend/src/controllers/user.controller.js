const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');
const UserModel = require('../models/User.model');
const AddressModel = require('../models/Address.model');

const userController = {
  // Listagem de colaboradores usando a camada Model
  async listar(_req, res) {
    try {
      const usuarios = await UserModel.findAll();
      return res.status(200).json(usuarios);
    } catch (erro) {
      console.error('Erro ao listar usuários:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar colaboradores.' });
    }
  },

  // Cadastro de novo colaborador com validacoes de confirmacao de email e senha
  async criar(req, res) {
    try {
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
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        endereco,
        enderecoId: enderecoIdReq,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      // 1. Validacao de campos obrigatorios
      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do colaborador é obrigatório.' });
      }

      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'O e-mail do colaborador é obrigatório.' });
      }

      const emailTratado = String(email).trim().toLowerCase();
      const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

      // 2. Regra de correspondencia de e-mail (se confirmacao fornecida)
      if (confirmacaoEmail && emailTratado !== confirmacaoEmail) {
        return res.status(400).json({
          error: 'A confirmação de e-mail não confere com o e-mail informado.',
        });
      }

      // 3. Validacao de senha
      if (!senha || String(senha).length < 6) {
        return res.status(400).json({
          error: 'A senha é obrigatória e deve ter pelo menos 6 caracteres.',
        });
      }

      const confirmacaoSenha = String(confirmSenha || confirmarSenha || '');

      // 4. Regra de correspondencia de senha (se confirmacao fornecida)
      if (confirmacaoSenha && String(senha) !== confirmacaoSenha) {
        return res.status(400).json({
          error: 'A confirmação de senha não confere com a senha digitada.',
        });
      }

      // 5. Checar duplicidade de e-mail via Model
      const emailJaExiste = await UserModel.checkEmailExists(emailTratado);
      if (emailJaExiste) {
        return res.status(400).json({
          error: 'Este endereço de e-mail já está cadastrado para outro colaborador.',
        });
      }

      // 5.1 Checar duplicidade de CPF via Model se fornecido
      if (cpf && String(cpf).trim()) {
        const cpfTratado = String(cpf).trim();
        const cpfJaExiste = await UserModel.checkCpfExists(cpfTratado);
        if (cpfJaExiste) {
          return res.status(400).json({
            error: 'Este CPF já está cadastrado para outro colaborador.',
          });
        }
      }

      // 6. Criptografia da senha
      const senhaHash = await bcrypt.hash(String(senha), 10);

      // 6.1 Criar endereco normalizado via AddressModel caso dados tenham sido informados
      let enderecoId = enderecoIdReq || null;
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal || numero || bairro || cep || uf || cidade) {
        try {
          const enderecoCriado = await AddressModel.create({
            logradouro: logradouroFinal ? String(logradouroFinal).trim() : 'Não informado',
            numero: numero ? String(numero).trim() : null,
            complemento: complemento ? String(complemento).trim() : null,
            bairro: bairro ? String(bairro).trim() : null,
            cidade: cidade ? String(cidade).trim() : 'Viradouro',
            uf: uf ? String(uf).trim().toUpperCase() : 'SP',
            cep: cep ? String(cep).trim() : null,
          });
          enderecoId = enderecoCriado.id;
        } catch (erroEnd) {
          console.warn('Falha ao registrar endereço de usuário:', erroEnd.message);
        }
      }

      // 7. Criacao atraves da camada Model
      const usuario = await UserModel.create({
        nome: String(nome).trim(),
        email: emailTratado,
        cpf: cpf ? String(cpf).trim() : null,
        senhaHash,
        cargo: cargo ? String(cargo).toUpperCase() : 'ATENDENTE',
        telefone: telefone ? String(telefone).trim() : null,
        enderecoId,
      });

      // 8. Registro de auditoria em logs_sistema
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_USUARIO')
          .input('entidade', sql.NVarChar, 'usuarios')
          .input('entidade_id', sql.NVarChar, usuario.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: usuario.nome, cargo: usuario.cargo, email: usuario.email, cpf: usuario.cpf })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criacao de usuario:', erroLog.message);
      }

      return res.status(201).json(usuario);
    } catch (erro) {
      console.error('Erro ao criar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar colaborador.' });
    }
  },

  // Atualizacao de colaborador
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

      const usuarioExistente = await UserModel.findById(id);
      if (!usuarioExistente) {
        return res.status(404).json({
          error: 'Colaborador não localizado no sistema. O usuário pode ter sido inativado recentemente.',
        });
      }

      const dadosAtualizacao = {};

      if (nome !== undefined) {
        dadosAtualizacao.nome = String(nome).trim();
      }

      // Validacao e correspondencia de email
      if (email !== undefined && String(email).trim() !== '') {
        const emailTratado = String(email).trim().toLowerCase();
        const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

        if (confirmacaoEmail && emailTratado !== confirmacaoEmail) {
          return res.status(400).json({
            error: 'A confirmação de e-mail não confere com o novo e-mail informado.',
          });
        }

        const emailEmUso = await UserModel.checkEmailExists(emailTratado, id);
        if (emailEmUso) {
          return res.status(400).json({
            error: 'Este endereço de e-mail já está sendo utilizado por outro colaborador.',
          });
        }

        dadosAtualizacao.email = emailTratado;
      }

      // Validacao e unicidade de CPF
      if (cpf !== undefined) {
        const cpfTratado = cpf ? String(cpf).trim() : null;
        if (cpfTratado) {
          const cpfEmUso = await UserModel.checkCpfExists(cpfTratado, id);
          if (cpfEmUso) {
            return res.status(400).json({
              error: 'Este CPF já está sendo utilizado por outro colaborador.',
            });
          }
        }
        dadosAtualizacao.cpf = cpfTratado;
      }

      // Validacao e correspondencia de nova senha (se enviada)
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

        dadosAtualizacao.senhaHash = await bcrypt.hash(String(senha), 10);
      }

      if (cargo !== undefined) {
        dadosAtualizacao.cargo = String(cargo).toUpperCase();
      }
      if (status !== undefined) {
        dadosAtualizacao.status = status;
        dadosAtualizacao.ativo = status === 'ATIVO' ? 1 : 0;
      }
      if (telefone !== undefined) {
        dadosAtualizacao.telefone = telefone ? String(telefone).trim() : null;
      }
      if (enderecoId !== undefined) {
        dadosAtualizacao.enderecoId = enderecoId || null;
      }

      // Atualizar ou criar registro de endereço normalizado exclusivamente via AddressModel
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal || numero || bairro || cep || uf || cidade) {
        const idEnd = usuarioExistente.endereco_id || usuarioExistente.enderecoId;
        if (idEnd) {
          await AddressModel.update(idEnd, {
            logradouro: logradouroFinal ? String(logradouroFinal).trim() : undefined,
            numero: numero !== undefined ? (numero ? String(numero).trim() : null) : undefined,
            complemento: complemento !== undefined ? (complemento ? String(complemento).trim() : null) : undefined,
            bairro: bairro !== undefined ? (bairro ? String(bairro).trim() : null) : undefined,
            cidade: cidade !== undefined ? String(cidade).trim() : undefined,
            uf: uf !== undefined ? String(uf).trim().toUpperCase() : undefined,
            cep: cep !== undefined ? (cep ? String(cep).trim() : null) : undefined,
          });
        } else if (logradouroFinal && String(logradouroFinal).trim() !== '') {
          const novoEnd = await AddressModel.create({
            logradouro: String(logradouroFinal).trim(),
            numero: numero ? String(numero).trim() : null,
            complemento: complemento ? String(complemento).trim() : null,
            bairro: bairro ? String(bairro).trim() : null,
            cidade: cidade ? String(cidade).trim() : 'Viradouro',
            uf: uf ? String(uf).trim().toUpperCase() : 'SP',
            cep: cep ? String(cep).trim() : null,
          });
          dadosAtualizacao.enderecoId = novoEnd.id;
        }
      }

      const usuarioAtualizado = await UserModel.update(id, dadosAtualizacao);

      // Auditoria
      try {
        const pool = await getPool();
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
        console.warn('Falha ao registrar log de atualizacao de usuario:', erroLog.message);
      }

      return res.status(200).json(usuarioAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar colaborador.' });
    }
  },

  // Soft Delete: Proibicao total de DELETE fisico
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

      const usuarioExistente = await UserModel.findById(id);
      if (!usuarioExistente) {
        return res.status(404).json({
          error: 'Colaborador não localizado para desativação.',
        });
      }

      // Executa Soft Delete pelo Model (UPDATE status = 'INATIVO', ativo = 0)
      const usuarioDesativado = await UserModel.softDelete(id);

      // Auditoria: registro de inativacao
      try {
        const pool = await getPool();
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
        console.warn('Falha ao registrar log de inativacao de usuario:', erroLog.message);
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
