const { Router } = require('express');
const userController = require('../controllers/user.controller');

const router = Router();

router.get('/', userController.listar);
router.post('/', userController.criar);
router.put('/:id', userController.atualizar);
router.delete('/:id', userController.excluir);

module.exports = router;
