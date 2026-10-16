const { Router } = require('express');
const orderStatusController = require('../controllers/orderStatus.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Listagem e busca detalhada dos status
router.get('/', orderStatusController.listar);
router.get('/:id', orderStatusController.obterPorId);

// CRUD de status / colunas de OS
router.post(
  '/',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Apenas Administradores e Atendentes possuem permissão para criar novas etapas de status.'
  ),
  orderStatusController.criar
);

router.put(
  '/:id',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Apenas Administradores e Atendentes possuem permissão para alterar etapas de status.'
  ),
  orderStatusController.atualizar
);

router.patch(
  '/:id/status',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Apenas Administradores e Atendentes possuem permissão para alternar visibilidade de status.'
  ),
  orderStatusController.alternarStatus
);

router.delete(
  '/:id',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Apenas Administradores e Atendentes possuem permissão para inativar status.'
  ),
  orderStatusController.excluir
);

module.exports = router;
