const { Router } = require('express');
const orderStatusController = require('../controllers/orderStatus.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Listagem e busca detalhada dos status estáticos e fixos
router.get('/', orderStatusController.listar);
router.get('/:id', orderStatusController.obterPorId);

// Status é estático e fixo: mutações bloqueadas
router.all('*', (req, res) => {
  return res.status(405).json({
    error: 'A lista de status de ordem de serviço é fixa no sistema e não permite modificações dinâmicas.',
  });
});

module.exports = router;
