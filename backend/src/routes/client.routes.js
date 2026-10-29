const { Router } = require('express');
const clientController = require('../controllers/client.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = Router();

// Consulta permitida a todos os perfis autenticados
router.get('/', clientController.listar);

// Cadastros e alterações permitidos para Administradores, Atendentes e Técnicos
router.post(
  '/',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  clientController.criar
);
router.put(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  clientController.atualizar
);
router.delete(
  '/:id',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  clientController.excluir
);

// Gerenciamento de múltiplos endereços (N:N)
router.get('/:id/enderecos', clientController.listarEnderecos);
router.post(
  '/:id/enderecos',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  clientController.adicionarEndereco
);
router.delete(
  '/:id/enderecos/:enderecoId',
  roleMiddleware(['ADMIN', 'ATENDENTE', 'TECNICO']),
  clientController.removerEndereco
);

module.exports = router;
