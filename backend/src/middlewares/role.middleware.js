function roleMiddleware(perfisPermitidos = ['ADMIN']) {
  return (req, res, next) => {
    const usuario = req.usuario || req.user;

    if (!usuario) {
      return res.status(401).json({
        error: 'Acesso não autenticado. Faça login para continuar.',
      });
    }

    const cargoFormatado = String(usuario.cargo || usuario.role || '').toUpperCase();
    const cargosValidos = perfisPermitidos.map((c) => String(c).toUpperCase());

    if (!cargosValidos.includes(cargoFormatado)) {
      return res.status(403).json({
        error: 'Acesso restrito. Você não tem permissão para acessar este recurso. Contate um administrador.',
      });
    }

    return next();
  };
}

module.exports = roleMiddleware;
