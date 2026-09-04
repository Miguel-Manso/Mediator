const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');
const userRoutes = require('./user.routes');

const routes = Router();

// Rota publica de saude da aplicacao
routes.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas publicas de autenticacao
routes.use('/auth', authRoutes);

// Rotas protegidas (exigem token JWT valido)
routes.use('/clientes', authMiddleware, clientRoutes);
routes.use('/clients', authMiddleware, clientRoutes);

routes.use('/usuarios', authMiddleware, userRoutes);
routes.use('/users', authMiddleware, userRoutes);

module.exports = routes;
