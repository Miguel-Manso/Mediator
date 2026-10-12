const { Router } = require('express');
const productController = require('../controllers/product.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Consulta de produtos / peças permitida para todos autenticados
router.get('/', productController.listar);
router.get('/:id', productController.obterPorId);

// Cadastro, alteração e exclusão no catálogo de produtos permitidos para ADMIN, ATENDENTE e TECNICO
router.post(
  '/',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  productController.criar
);
router.put(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  productController.atualizar
);
router.patch(
  '/:id/status',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  productController.alternarStatus
);
router.delete(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  productController.excluir
);

module.exports = router;
