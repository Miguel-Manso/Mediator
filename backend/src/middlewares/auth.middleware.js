const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET || 'rocha_magazine_jwt_secret_dev_key_2026_super_safe';
  const cabecalhoAuth = req.headers.authorization;

  if (!cabecalhoAuth) {
    return res.status(401).json({ error: 'Você precisa estar logado para realizar esta ação. Faça login para continuar.' });
  }

  const [, token] = cabecalhoAuth.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Formato do token de autenticação inválido. O formato esperado é "Bearer <token>".' });
  }

  try {
    const decodificado = jwt.verify(token, secret);
    req.usuario = decodificado;
    req.user = decodificado;
    return next();
  } catch (erro) {
    return res.status(401).json({ error: 'Sua sessão expirou ou o token é inválido. Por favor, faça login novamente.' });
  }
}

module.exports = authMiddleware;
