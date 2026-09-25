const { Router } = require('express');
const equipmentController = require('../controllers/equipment.controller');

const router = Router();

// Rota para dados auxiliares de selects (deve vir antes de /:id)
router.get('/auxiliares', equipmentController.obterAuxiliares);

// Endpoints de gerenciamento (CRUD) de Categorias, Marcas e Modelos (devem vir antes de /:id)
router.post('/categorias', equipmentController.criarCategoria);
router.put('/categorias/:id', equipmentController.atualizarCategoria);
router.delete('/categorias/:id', equipmentController.excluirCategoria);

router.post('/marcas', equipmentController.criarMarca);
router.put('/marcas/:id', equipmentController.atualizarMarca);
router.delete('/marcas/:id', equipmentController.excluirMarca);

router.post('/modelos', equipmentController.criarModelo);
router.put('/modelos/:id', equipmentController.atualizarModelo);
router.delete('/modelos/:id', equipmentController.excluirModelo);

router.get('/', equipmentController.listar);
router.get('/:id', equipmentController.obterPorId);
router.post('/', equipmentController.criar);
router.put('/:id', equipmentController.atualizar);
router.patch('/:id/status', equipmentController.alternarStatus);
router.delete('/:id', equipmentController.excluir);

module.exports = router;
