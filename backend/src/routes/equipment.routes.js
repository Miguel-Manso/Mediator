const { Router } = require('express');
const equipmentController = require('../controllers/equipment.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Rota para dados auxiliares de selects (livre para autenticados)
router.get('/auxiliares', equipmentController.obterAuxiliares);

// Endpoints de cadastro rápido de Categorias, Marcas e Modelos para o modal (ADMIN, ATENDENTE e TECNICO)
router.post(
  '/categorias',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.criarCategoria
);
router.post(
  '/marcas',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.criarMarca
);
router.post(
  '/modelos',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.criarModelo
);

// Consulta permitida a todos autenticados
router.get('/', equipmentController.listar);
router.get('/:id', equipmentController.obterPorId);

// Mutação permitida a ADMIN, ATENDENTE e TECNICO
router.post(
  '/',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.criar
);
router.put(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.atualizar
);
router.patch(
  '/:id/status',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.alternarStatus
);
router.delete(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  equipmentController.excluir
);

module.exports = router;
