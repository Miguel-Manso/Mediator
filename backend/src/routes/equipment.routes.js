const { Router } = require('express');
const equipmentController = require('../controllers/equipment.controller');

const router = Router();

// Rota para dados auxiliares de selects (deve vir antes de /:id)
router.get('/auxiliares', equipmentController.obterAuxiliares);

// Endpoints de cadastro rápido de Categorias, Marcas e Modelos para o modal
router.post('/categorias', equipmentController.criarCategoria);
router.post('/marcas', equipmentController.criarMarca);
router.post('/modelos', equipmentController.criarModelo);

router.get('/', equipmentController.listar);
router.get('/:id', equipmentController.obterPorId);
router.post('/', equipmentController.criar);
router.put('/:id', equipmentController.atualizar);
router.patch('/:id/status', equipmentController.alternarStatus);
router.delete('/:id', equipmentController.excluir);

module.exports = router;
