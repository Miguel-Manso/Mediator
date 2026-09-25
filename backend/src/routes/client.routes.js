const { Router } = require('express');
const clientController = require('../controllers/client.controller');

const router = Router();

router.get('/', clientController.listar);
router.post('/', clientController.criar);
router.put('/:id', clientController.atualizar);
router.delete('/:id', clientController.excluir);

module.exports = router;
