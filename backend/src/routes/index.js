const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');
const userRoutes = require('./user.routes');
const equipmentRoutes = require('./equipment.routes');
const productRoutes = require('./product.routes');

const routes = Router();

// Rota publica de saude da aplicacao
routes.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rotas publicas de autenticacao
routes.use('/auth', authRoutes);

// Rotas protegidas de clientes
routes.use('/clientes', authMiddleware, clientRoutes);
routes.use('/clients', authMiddleware, clientRoutes);

// Rotas protegidas de equipamentos (RF03)
routes.use('/equipamentos', authMiddleware, equipmentRoutes);
routes.use('/equipments', authMiddleware, equipmentRoutes);

// Rotas protegidas de produtos / pecas (RF04)
routes.use('/produtos', authMiddleware, productRoutes);
routes.use('/products', authMiddleware, productRoutes);

// Rotas protegidas de usuarios: ACESSO EXCLUSIVO PARA ADMIN
routes.use('/usuarios', authMiddleware, roleMiddleware(['ADMIN']), userRoutes);
routes.use('/users', authMiddleware, roleMiddleware(['ADMIN']), userRoutes);

module.exports = routes;
