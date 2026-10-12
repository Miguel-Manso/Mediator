const { getPool, sql } = require('../config/db');
const EquipmentModel = require('../models/Equipment.model');
const BrandModel = require('../models/Brand.model');
const ModelModel = require('../models/Model.model');
const CategoryModel = require('../models/Category.model');

const equipmentController = {
  // Listagem com busca e filtros
  async listar(req, res) {
    try {
      const busca = req.query.busca || req.query.search || '';
      const clienteId = req.query.clienteId || req.query.cliente_id || null;
      const categoriaId = req.query.categoriaId || req.query.categoria_id || null;
      const marcaId = req.query.marcaId || req.query.marca_id || null;
      const incluirInativos = req.query.incluirInativos === 'true' || req.query.inativos === 'true';
      const apenasAtivos = !incluirInativos && req.query.apenasAtivos !== 'false';

      const equipamentos = await EquipmentModel.listar({
        busca,
        clienteId,
        categoriaId,
        marcaId,
        apenasAtivos,
      });

      return res.status(200).json(equipamentos);
    } catch (erro) {
      console.error('Erro ao listar equipamentos:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao listar equipamentos.' });
    }
  },

  // Dados auxiliares para popular selects nos formulários do front
  async obterAuxiliares(_req, res) {
    try {
      const pool = await getPool();

      const [resClientes, resCategorias, resMarcas, resModelos] = await Promise.all([
        pool.query("SELECT id, nome, cpf, telefone FROM clientes WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome FROM categorias_equipamento WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome FROM marcas WHERE ativo = 1 ORDER BY nome ASC"),
        pool.query("SELECT id, nome, marca_id AS marcaId FROM modelos WHERE ativo = 1 ORDER BY nome ASC"),
      ]);

      return res.status(200).json({
        clientes: resClientes.recordset,
        categorias: resCategorias.recordset,
        marcas: resMarcas.recordset,
        modelos: resModelos.recordset,
      });
    } catch (erro) {
      console.error('Erro ao obter dados auxiliares:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao carregar dados auxiliares de equipamentos.' });
    }
  },

  // Buscar equipamento por ID
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const equipamento = await EquipmentModel.buscarPorId(id);

      if (!equipamento) {
        return res.status(404).json({ error: 'Equipamento não localizado no sistema.' });
      }

      return res.status(200).json(equipamento);
    } catch (erro) {
      console.error('Erro ao buscar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao buscar equipamento.' });
    }
  },

  // Cadastro de novo equipamento
  async criar(req, res) {
    try {
      const {
        descricao,
        numeroSerie,
        numero_serie,
        marcaId,
        marca_id,
        modeloId,
        modelo_id,
        clienteId,
        cliente_id,
        categoriaId,
        categoria_id,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      const descFinal = descricao ? String(descricao).trim() : '';
      const clienteFinal = clienteId || cliente_id;
      const categoriaFinal = categoriaId || categoria_id;

      if (!descFinal) {
        return res.status(400).json({ error: 'A descrição do equipamento é obrigatória.' });
      }

      if (!clienteFinal) {
        return res.status(400).json({ error: 'O cliente proprietário do equipamento é obrigatório.' });
      }

      if (!categoriaFinal) {
        return res.status(400).json({ error: 'A categoria do equipamento é obrigatória.' });
      }

      const equipamento = await EquipmentModel.criar({
        descricao: descFinal,
        numeroSerie: numeroSerie || numero_serie || null,
        marcaId: marcaId || marca_id || null,
        modeloId: modeloId || modelo_id || null,
        clienteId: clienteFinal,
        categoriaId: categoriaFinal,
      });

      // Auditoria obrigatória
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, equipamento.id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamento.descricao,
              clienteId: equipamento.clienteId,
              categoriaId: equipamento.categoriaId,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de equipamento:', erroLog.message);
      }

      return res.status(201).json(equipamento);
    } catch (erro) {
      console.error('Erro ao criar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar equipamento.' });
    }
  },

  // Atualização de equipamento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        descricao,
        numeroSerie,
        numero_serie,
        marcaId,
        marca_id,
        modeloId,
        modelo_id,
        clienteId,
        cliente_id,
        categoriaId,
        categoria_id,
        ativo,
      } = req.body || {};

      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do equipamento não informado.' });
      }

      const equipamentoExistente = await EquipmentModel.buscarPorId(id);
      if (!equipamentoExistente) {
        return res.status(404).json({ error: 'Equipamento não localizado para atualização.' });
      }

      const dadosAtualizacao = {};

      if (descricao !== undefined) {
        const descTrim = String(descricao).trim();
        if (!descTrim) {
          return res.status(400).json({ error: 'A descrição não pode ser vazia.' });
        }
        dadosAtualizacao.descricao = descTrim;
      }

      if (numeroSerie !== undefined || numero_serie !== undefined) {
        const serie = numeroSerie !== undefined ? numeroSerie : numero_serie;
        dadosAtualizacao.numeroSerie = serie ? String(serie).trim() : null;
      }

      if (marcaId !== undefined || marca_id !== undefined) {
        dadosAtualizacao.marcaId = marcaId !== undefined ? marcaId : marca_id;
      }

      if (modeloId !== undefined || modelo_id !== undefined) {
        dadosAtualizacao.modeloId = modeloId !== undefined ? modeloId : modelo_id;
      }

      if (clienteId !== undefined || cliente_id !== undefined) {
        const clienteFinal = clienteId !== undefined ? clienteId : cliente_id;
        if (!clienteFinal) {
          return res.status(400).json({ error: 'O cliente proprietário não pode ser nulo.' });
        }
        dadosAtualizacao.clienteId = clienteFinal;
      }

      if (categoriaId !== undefined || categoria_id !== undefined) {
        const catFinal = categoriaId !== undefined ? categoriaId : categoria_id;
        if (!catFinal) {
          return res.status(400).json({ error: 'A categoria do equipamento não pode ser nula.' });
        }
        dadosAtualizacao.categoriaId = catFinal;
      }

      if (ativo !== undefined) {
        dadosAtualizacao.ativo = ativo ? 1 : 0;
      }

      const equipamentoAtualizado = await EquipmentModel.atualizar(id, dadosAtualizacao);

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'ATUALIZAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamentoAtualizado.descricao,
              ativo: equipamentoAtualizado.ativo,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de atualização de equipamento:', erroLog.message);
      }

      return res.status(200).json(equipamentoAtualizado);
    } catch (erro) {
      console.error('Erro ao atualizar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao atualizar equipamento.' });
    }
  },

  // Inativação lógica / Soft Delete
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!id) {
        return res.status(400).json({ error: 'ID do equipamento não informado.' });
      }

      const equipamentoExistente = await EquipmentModel.buscarPorId(id);
      if (!equipamentoExistente) {
        return res.status(404).json({ error: 'Equipamento não localizado para inativação.' });
      }

      const equipamentoInativado = await EquipmentModel.inativar(id);

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'INATIVAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input(
            'detalhes',
            sql.NVarChar,
            JSON.stringify({
              descricao: equipamentoExistente.descricao,
              ativoAnterior: equipamentoExistente.ativo,
              ativoNovo: 0,
            })
          )
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de inativação de equipamento:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: 'Equipamento inativado com sucesso.',
        equipamento: equipamentoInativado,
      });
    } catch (erro) {
      console.error('Erro ao inativar equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao inativar equipamento.' });
    }
  },

  // Alternar status (ativar/inativar)
  async alternarStatus(req, res) {
    try {
      const { id } = req.params;
      const { ativo } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      const equipamentoExistente = await EquipmentModel.buscarPorId(id);
      if (!equipamentoExistente) {
        return res.status(404).json({ error: 'Equipamento não localizado.' });
      }

      const novoStatus = ativo !== undefined ? (ativo ? 1 : 0) : equipamentoExistente.ativo ? 0 : 1;
      const equipamentoAtualizado = novoStatus === 1
        ? await EquipmentModel.ativar(id)
        : await EquipmentModel.inativar(id);

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, novoStatus === 1 ? 'ATIVAR_EQUIPAMENTO' : 'INATIVAR_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'equipamentos')
          .input('entidade_id', sql.NVarChar, id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ novoStatus }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de alteração de status de equipamento:', erroLog.message);
      }

      return res.status(200).json({
        mensagem: `Equipamento ${novoStatus === 1 ? 'ativado' : 'inativado'} com sucesso.`,
        equipamento: equipamentoAtualizado,
      });
    } catch (erro) {
      console.error('Erro ao alternar status do equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao alternar status do equipamento.' });
    }
  },

  // Cadastro rápido de marca diretamente pelo modal de equipamentos
  async criarMarca(req, res) {
    try {
      const { nome } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome da marca é obrigatório.' });
      }

      const nomeTratado = String(nome).trim();
      const novaMarca = await BrandModel.create({ nome: nomeTratado });

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_MARCA')
          .input('entidade', sql.NVarChar, 'marcas')
          .input('entidade_id', sql.NVarChar, novaMarca.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novaMarca.nome }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de marca:', erroLog.message);
      }

      return res.status(201).json(novaMarca);
    } catch (erro) {
      console.error('Erro ao criar marca:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar marca.' });
    }
  },

  // Cadastro rápido de modelo diretamente pelo modal de equipamentos
  async criarModelo(req, res) {
    try {
      const { nome, marcaId, marca_id } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;
      const idMarca = marcaId || marca_id;

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome do modelo é obrigatório.' });
      }

      if (!idMarca) {
        return res.status(400).json({ error: 'A marca associada ao modelo é obrigatória.' });
      }

      const nomeTratado = String(nome).trim();
      const novoModelo = await ModelModel.create({ nome: nomeTratado, marcaId: idMarca });

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_MODELO')
          .input('entidade', sql.NVarChar, 'modelos')
          .input('entidade_id', sql.NVarChar, novoModelo.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novoModelo.nome, marcaId: idMarca }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de modelo:', erroLog.message);
      }

      return res.status(201).json(novoModelo);
    } catch (erro) {
      console.error('Erro ao criar modelo:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar modelo.' });
    }
  },

  // Cadastro rápido de categoria de equipamento diretamente pelo modal
  async criarCategoria(req, res) {
    try {
      const { nome } = req.body || {};
      const usuarioId = req.usuario?.id || req.user?.id || null;

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ error: 'O nome da categoria de equipamento é obrigatório.' });
      }

      const nomeTratado = String(nome).trim();
      if (nomeTratado.length > 100) {
        return res.status(400).json({ error: 'O nome da categoria deve conter no máximo 100 caracteres.' });
      }

      // Checar duplicidade de nome
      const nomeExiste = await CategoryModel.checkNameExists(nomeTratado);
      if (nomeExiste) {
        return res.status(400).json({ error: 'Já existe uma categoria de equipamento com este nome.' });
      }

      const novaCategoria = await CategoryModel.create({ nome: nomeTratado });

      // Auditoria
      try {
        const pool = await getPool();
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuarioId)
          .input('acao', sql.NVarChar, 'CRIAR_CATEGORIA_EQUIPAMENTO')
          .input('entidade', sql.NVarChar, 'categorias_equipamento')
          .input('entidade_id', sql.NVarChar, String(novaCategoria.id))
          .input('detalhes', sql.NVarChar, JSON.stringify({ nome: novaCategoria.nome }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de criação de categoria de equipamento:', erroLog.message);
      }

      return res.status(201).json(novaCategoria);
    } catch (erro) {
      console.error('Erro ao criar categoria de equipamento:', erro);
      return res.status(500).json({ error: erro.message || 'Erro ao cadastrar categoria.' });
    }
  },
};

module.exports = equipmentController;
