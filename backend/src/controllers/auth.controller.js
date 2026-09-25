const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const UserModel = require('../models/User.model');

const authController = {
  async login(req, res) {
    try {
      const { email, senha, password } = req.body || {};
      const senhaInformada = senha || password;

      if (!email || !senhaInformada) {
        return res.status(400).json({ error: 'Informe o e-mail e a senha para acessar.' });
      }

      const emailLimpo = String(email).trim().toLowerCase();

      const pool = await getPool();
      const result = await pool
        .request()
        .input('email', sql.NVarChar, emailLimpo)
        .query(`
          SELECT 
            u.id, u.nome, u.email, u.cpf, u.senha_hash, u.cargo, u.status, u.ativo, u.telefone, 
            COALESCE(e.cidade, 'Viradouro') AS cidade, u.endereco_id AS enderecoId
          FROM usuarios u
          LEFT JOIN enderecos e ON u.endereco_id = e.id
          WHERE LOWER(u.email) = @email
        `);

      const usuarioDb = result.recordset[0];
      if (!usuarioDb) {
        return res.status(401).json({
          error: 'Nenhuma conta foi localizada com o e-mail informado. Verifique a digitação ou contate o administrador.',
        });
      }

      const usuario = new UserModel(usuarioDb);

      const statusAtivo = (usuario.status === 'ATIVO' || usuario.status === 'ACTIVE') && usuario.ativo !== false && usuario.ativo !== 0;
      if (!statusAtivo) {
        return res.status(401).json({
          error: 'Esta conta de usuário está desativada. Solicite a reativação do acesso ao administrador do sistema.',
        });
      }

      const senhaValida = await bcrypt.compare(String(senhaInformada), usuario.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({
          error: 'A senha informada está incorreta. Verifique a digitação e se a tecla Caps Lock está ativada.',
        });
      }

      const secret = process.env.JWT_SECRET || 'rocha_magazine_jwt_secret_dev_key_2026_super_safe';
      const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

      const token = jwt.sign(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
        },
        secret,
        { expiresIn }
      );

      try {
        await pool
          .request()
          .input('usuario_id', sql.VarChar, usuario.id)
          .input('acao', sql.NVarChar, 'LOGIN_USUARIO')
          .input('entidade', sql.NVarChar, 'autenticacao')
          .input('entidade_id', sql.NVarChar, usuario.id)
          .input('detalhes', sql.NVarChar, JSON.stringify({ email: usuario.email, cargo: usuario.cargo }))
          .query(`
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes, ativo)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes, 1)
          `);
      } catch (erroLog) {
        console.warn('Falha ao registrar log de login:', erroLog.message);
      }

      return res.status(200).json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
        },
        user: {
          id: usuario.id,
          nome: usuario.nome,
          name: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo,
          role: usuario.cargo,
        },
      });
    } catch (erro) {
      console.error('Erro no login:', erro);
      return res.status(500).json({ error: erro.message || 'Erro interno ao realizar login.' });
    }
  },
};

module.exports = authController;
