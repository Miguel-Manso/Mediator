const { getPool, sql } = require('../config/db');
const ClientModel = require('../models/Client.model');
const AddressModel = require('../models/Address.model');

const clientController = {
  // Listagem com filtro opcional via Model, ordenação e paginação
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const incluirInativos = req.query.incluirInativos === 'true' || req.query.inativos === 'true';
      const apenasAtivos = !incluirInativos && req.query.apenasAtivos !== 'false';
      const orderBy = req.query.orderBy || req.query.ordenarPor || 'nome';
      const orderDirection = req.query.orderDirection || req.query.ordem || 'ASC';
      const pagina = req.query.pagina ? Number(req.query.pagina) : null;
      const limite = req.query.limite ? Number(req.query.limite) : null;

      const resultado = await ClientModel.findAll({
        search: busca,
        apenasAtivos,
        orderBy,
        orderDirection,
        pagina,
        limite,
      });
      return res.status(200).json(resultado);
    } catch (erro) {
      console.error('Erro ao listar clientes:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar clientes.' });
    }
  },

  // Cadastro de cliente com validacao de campos e criacao de endereco
  async criar(req, res) {
    try {
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
        // Campos estruturados de endereco
        logradouro,
        numero,
        complemento,
        bairro,
        uf,
        cep,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      // 1. Validacao de campos obrigatorios
      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }

      if (!telefone || !String(telefone).trim()) {
        return res.status(400).json({ error: 'O telefone do cliente é obrigatório.' });
      }

      // 2. Validacao de correspondencia de e-mail (se fornecido)
      const emailTratado = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null;
      const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

      if (emailTratado && confirmacaoEmail && emailTratado !== confirmacaoEmail) {
        return res.status(400).json({
          error: 'A confirmação de e-mail não corresponde ao e-mail informado.',
        });
      }

      // 3. Checar duplicidade de CPF se fornecido
      if (cpf && String(cpf).trim() !== '') {
        const cpfExiste = await ClientModel.checkCpfExists(cpf);
        if (cpfExiste) {
          return res.status(400).json({
            error: 'Este CPF já está cadastrado para outro cliente no sistema.',
          });
        }
      }

      // 4. Criar ou reutilizar registro de endereco caso haja dados de localizacao
      let enderecoId = req.body.enderecoId || null;
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal && String(logradouroFinal).trim() !== '') {
        try {
          const enderecoCriado = await AddressModel.findOrCreate({
            logradouro: String(logradouroFinal).trim(),
            numero: numero ? String(numero).trim() : null,
            complemento: complemento ? String(complemento).trim() : null,
            bairro: bairro ? String(bairro).trim() : null,
            cidade: cidade ? String(cidade).trim() : 'Viradouro',
            uf: uf ? String(uf).trim().toUpperCase() : 'SP',
            cep: cep ? String(cep).trim() : null,
          });
          enderecoId = enderecoCriado.id;
        } catch (erroEndereco) {
          console.warn('Não foi possível persistir o registro em enderecos:', erroEndereco.message);
        }
      }

      // 5. Criar cliente na camada Model
      const cliente = await ClientModel.create({
        nome: String(nome).trim(),
        cpf: cpf ? String(cpf).trim() : null,
        email: emailTratado,
        telefone: String(telefone).trim(),
        enderecoId,
        observacoes: observacoes ? String(observacoes).trim() : null,
      });

      if (cliente && cliente.id) {
        cliente.enderecos = await AddressModel.findByClienteId(cliente.id);
      }

      // 7. Registro de auditoria em logs_sistema
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_CLIENTE')
          .input('entidade', sql.NVarChar, 'clientes')
          .input('entidade_id', sql.NVarChar, cliente.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({ nome: cliente.nome, telefone: cliente.telefone, cidade: cliente.cidade })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criacao de cliente:', erroLog.message);
      }

      return res.status(201).json(cliente);
    } catch (erro) {
      console.error('Erro ao criar cliente:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar cliente.' });
    }
  },

  // Atualizacao de cliente
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
        // Campos estruturados de endereco
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

      const clienteExistente = await ClientModel.findById(id);
      if (!clienteExistente) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema para atualização.',
        });
      }

      const dadosAtualizacao = {};

      if (nome !== undefined) {
        dadosAtualizacao.nome = String(nome).trim();
      }

      if (cpf !== undefined) {
        if (cpf && String(cpf).trim() !== '') {
          const cpfDuplicado = await ClientModel.checkCpfExists(cpf, id);
          if (cpfDuplicado) {
            return res.status(400).json({
              error: 'Este CPF já pertence a outro cliente cadastrado no sistema.',
            });
          }
          dadosAtualizacao.cpf = String(cpf).trim();
        } else {
          dadosAtualizacao.cpf = null;
        }
      }

      // Validacao e correspondencia de e-mail
      if (email !== undefined) {
        const emailTratado = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null;
        const confirmacaoEmail = String(confirmEmail || confirmarEmail || '').trim().toLowerCase();

        if (emailTratado && confirmacaoEmail && emailTratado !== confirmacaoEmail) {
          return res.status(400).json({
            error: 'A confirmação de e-mail não corresponde ao novo e-mail informado.',
          });
        }
        dadosAtualizacao.email = emailTratado;
      }

      if (telefone !== undefined) {
        dadosAtualizacao.telefone = String(telefone).trim();
      }
      if (observacoes !== undefined) {
        dadosAtualizacao.observacoes = observacoes ? String(observacoes).trim() : null;
      }
      if (status !== undefined) {
        dadosAtualizacao.status = status;
        dadosAtualizacao.ativo = status === 'ATIVO' ? 1 : 0;
      }

      // Atualizar ou criar registro de endereco estruturado exclusivamente via AddressModel
      const logradouroFinal = logradouro || endereco;
      if (logradouroFinal || numero || bairro || cep || uf || cidade) {
        const enderecosVinculados = await AddressModel.findByClienteId(id);
        const principalEnd = enderecosVinculados.find((e) => e.principal) || enderecosVinculados[0];

        if (principalEnd) {
          await AddressModel.update(principalEnd.id, {
            logradouro: logradouroFinal ? String(logradouroFinal).trim() : undefined,
            numero: numero !== undefined ? (numero ? String(numero).trim() : null) : undefined,
            complemento: complemento !== undefined ? (complemento ? String(complemento).trim() : null) : undefined,
            bairro: bairro !== undefined ? (bairro ? String(bairro).trim() : null) : undefined,
            cidade: cidade !== undefined ? String(cidade).trim() : undefined,
            uf: uf !== undefined ? String(uf).trim().toUpperCase() : undefined,
            cep: cep !== undefined ? (cep ? String(cep).trim() : null) : undefined,
          });
        } else if (logradouroFinal && String(logradouroFinal).trim() !== '') {
          const novoEnd = await AddressModel.findOrCreate({
            logradouro: String(logradouroFinal).trim(),
            numero: numero ? String(numero).trim() : null,
            complemento: complemento ? String(complemento).trim() : null,
            bairro: bairro ? String(bairro).trim() : null,
            cidade: cidade ? String(cidade).trim() : 'Viradouro',
            uf: uf ? String(uf).trim().toUpperCase() : 'SP',
            cep: cep ? String(cep).trim() : null,
          });
          await AddressModel.vincularCliente(id, novoEnd.id, { tipo: 'PRINCIPAL', principal: 1 });
        }
      } else if (req.body.enderecoId) {
        await AddressModel.vincularCliente(id, req.body.enderecoId, { tipo: 'PRINCIPAL', principal: 1 });
      }

      const clienteAtualizado = await ClientModel.update(id, dadosAtualizacao);
      if (clienteAtualizado) {
        clienteAtualizado.enderecos = await AddressModel.findByClienteId(id);
      }

      // Auditoria
      try {
        const pool = await getPool();
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
        console.warn('Falha ao registrar log de atualizacao de cliente:', erroLog.message);
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

      const clienteExistente = await ClientModel.findById(id);
      if (!clienteExistente) {
        return res.status(404).json({
          error: 'Cliente não localizado no sistema para inativação.',
        });
      }

      const clienteInativado = await ClientModel.softDelete(id);

      // Auditoria
      try {
        const pool = await getPool();
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
        console.warn('Falha ao registrar log de inativacao de cliente:', erroLog.message);
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

  // Listar todos os endereços do cliente
  async listarEnderecos(req, res) {
    try {
      const { id } = req.params;
      const enderecos = await AddressModel.findByClienteId(id);
      return res.json(enderecos);
    } catch (erro) {
      console.error('Erro ao listar endereços do cliente:', erro);
      return res.status(500).json({ error: 'Erro ao consultar endereços do cliente.' });
    }
  },

  // Adicionar ou vincular endereço ao cliente
  async adicionarEndereco(req, res) {
    try {
      const { id } = req.params;
      const {
        enderecoId,
        tipo = 'OUTRO',
        principal = 0,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
      } = req.body || {};

      let endId = enderecoId;
      if (!endId && logradouro) {
        const enderecoCriado = await AddressModel.findOrCreate({
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
        });
        endId = enderecoCriado.id;
      }

      if (!endId) {
        return res.status(400).json({ error: 'ID do endereço ou dados de logradouro são obrigatórios.' });
      }

      await AddressModel.vincularCliente(id, endId, { tipo, principal });
      const enderecos = await AddressModel.findByClienteId(id);
      return res.status(201).json(enderecos);
    } catch (erro) {
      console.error('Erro ao adicionar endereço ao cliente:', erro);
      return res.status(500).json({ error: 'Erro ao vincular endereço ao cliente.' });
    }
  },

  // Desvincular endereço do cliente
  async removerEndereco(req, res) {
    try {
      const { id, enderecoId } = req.params;
      await AddressModel.desvincularCliente(id, enderecoId);
      return res.json({ message: 'Endereço desvinculado com sucesso.' });
    } catch (erro) {
      console.error('Erro ao desvincular endereço do cliente:', erro);
      return res.status(500).json({ error: 'Erro ao desvincular endereço do cliente.' });
    }
  },
};

module.exports = clientController;
