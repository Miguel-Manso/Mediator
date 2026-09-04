const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

const authController = {
  async login(req, res) {
    try {
      const { email, senha, password } = req.body || {};
      const senhaInformada = senha || password;

      if (!email || !senhaInformada) {
        return res.status(400).json({ error: 'Informe o e-mail e a senha para acessar.' });
      }

      const pool = await getPool();
      const emailLimpo = String(email).trim().toLowerCase();

      // Busca usuario por email
      const resultado = await pool
        .request()
        .input('email', sql.NVarChar, emailLimpo)
        .query('SELECT id, nome, email, senha_hash, cargo, status FROM usuarios WHERE LOWER(email) = @email');

      const usuario = resultado.recordset[0];

      if (!usuario) {
        return res.status(401).json({
          error: 'Nenhuma conta foi localizada com o e-mail informado. Verifique a digitação ou contate o administrador.',
        });
      }

      const statusAtivo = usuario.status === 'ATIVO' || usuario.status === 'ACTIVE';
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

      // Geracao do token JWT usando segredo das variaveis de ambiente
      const secret = process.env.JWT_SECRET || 'teste';
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
            INSERT INTO logs_sistema (id, usuario_id, acao, entidade, entidade_id, detalhes)
            VALUES (LOWER(NEWID()), @usuario_id, @acao, @entidade, @entidade_id, @detalhes)
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
