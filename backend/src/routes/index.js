const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const authRoutes = require('./auth.routes');
const clientRoutes = require('./client.routes');
const userRoutes = require('./user.routes');
const equipmentRoutes = require('./equipment.routes');
const productRoutes = require('./product.routes');
const orderStatusRoutes = require('./orderStatus.routes');
const orderRoutes = require('./order.routes');
const auditRoutes = require('./audit.routes');
const reportRoutes = require('./report.routes');

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

// Rotas de Status de Ordem de Servico (RF05)
routes.use('/status-ordem', authMiddleware, orderStatusRoutes);
routes.use('/order-statuses', authMiddleware, orderStatusRoutes);

// Rotas de Ordens de Servico (RF06, RF09 e RF11 com auditoria)
routes.use('/ordens-servico', authMiddleware, orderRoutes);
routes.use('/orders', authMiddleware, orderRoutes);

// Rotas protegidas de usuarios: ACESSO EXCLUSIVO PARA ADMIN
routes.use('/usuarios', authMiddleware, roleMiddleware(['ADMIN']), userRoutes);
routes.use('/users', authMiddleware, roleMiddleware(['ADMIN']), userRoutes);

// Rotas de Auditoria (RF11): ACESSO EXCLUSIVO PARA ADMIN
routes.use('/auditoria', authMiddleware, auditRoutes);
routes.use('/audit-logs', authMiddleware, auditRoutes);

// Rotas de Relatórios Operacionais Master-Detail (RF12)
routes.use('/relatorios', authMiddleware, reportRoutes);
routes.use('/reports', authMiddleware, reportRoutes);

module.exports = routes;

