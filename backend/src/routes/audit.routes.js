const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Todas as rotas de auditoria são de acesso estritamente restrito a Administradores (RF11)
router.use(
  roleMiddleware(
    ['ADMIN'],
    'Acesso restrito à Auditoria do Sistema. Somente Administradores têm permissão para visualizar estes registros.'
  )
);

// Consulta de logs de auditoria com filtros por período e usuário
router.get('/', auditController.listar);
router.get('/:id', auditController.obterPorId);

module.exports = router;
