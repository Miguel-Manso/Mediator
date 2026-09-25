const { Router } = require('express');
const productController = require('../controllers/product.controller');

const router = Router();

router.get('/', productController.listar);
router.get('/:id', productController.obterPorId);
router.post('/', productController.criar);
router.put('/:id', productController.atualizar);
router.patch('/:id/status', productController.alternarStatus);
router.delete('/:id', productController.excluir);

module.exports = router;
