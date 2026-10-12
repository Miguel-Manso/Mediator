function roleMiddleware(perfisPermitidos = ['ADMIN'], mensagemCustomizada = null) {
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
      let mensagem = typeof mensagemCustomizada === 'function'
        ? mensagemCustomizada(cargoFormatado)
        : mensagemCustomizada;

      if (!mensagem) {
        mensagem = 'Acesso restrito. Você não tem permissão para acessar este recurso. Contate um administrador.';
      }

      return res.status(403).json({
        error: mensagem,
      });
    }

    return next();
  };
}

module.exports = roleMiddleware;
