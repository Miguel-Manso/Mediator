const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const roleMiddleware = require('../middlewares/role.middleware');
const auditMiddleware = require('../middlewares/audit.middleware');

const router = Router();

// Middleware de Auditoria (RF11) para capturar POST, PUT, DELETE e PATCH nas OS
router.use(auditMiddleware);

// Rota auxiliar para combos de abertura e filtros (visível para todos autenticados)
router.get('/auxiliares', orderController.obterAuxiliaresAbertura);

// CRUD básico e listagem
router.get('/', orderController.listar);
router.get('/:id', orderController.obterPorId);

// Abertura de OS: restrita a ADMIN e ATENDENTE
router.post(
  '/',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Técnicos não possuem permissão para abertura de Ordens de Serviço. Esta ação é restrita a Atendentes e Administradores.'
  ),
  orderController.criar
);

// Atualização de dados gerais da OS
router.put('/:id', orderController.atualizar);

// Inativação / Reativação de OS: técnicos não podem inativar ou excluir OS
router.patch(
  '/:id/alternar-ativo',
  roleMiddleware(
    ['ADMIN', 'ATENDENTE'],
    'Técnicos não possuem permissão para inativar ou excluir Ordens de Serviço. Esta ação é restrita a Atendentes e Administradores.'
  ),
  orderController.alternarStatusOrdem
);

// Evolução de status e apontamentos técnicos (RF05 & RF06 - Drag-and-Drop / Kanban)
router.patch('/:id/status', orderController.atualizarStatus);
router.put('/:id/status', orderController.atualizarStatus);

// Registro de laudo técnico ou parecer de bancada: restrito a ADMIN e TECNICO
router.put(
  '/:id/laudo',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para registrar laudos ou pareceres técnicos de bancada. Esta ação é restrita a Técnicos e Administradores.'
  ),
  orderController.adicionarObservacaoTecnica
);

router.post(
  '/:id/observacoes-tecnicas',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para registrar laudos ou pareceres técnicos de bancada. Esta ação é restrita a Técnicos e Administradores.'
  ),
  orderController.adicionarObservacaoTecnica
);

// Peças e insumos (RF06 - Consumo e baixa em estoque): restrito a ADMIN e TECNICO
router.post(
  '/:id/produtos',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para adicionar ou dar baixa de peças no estoque da Ordem de Serviço.'
  ),
  orderController.adicionarItemProduto
);

router.post(
  '/:id/itens',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para adicionar ou dar baixa de peças no estoque da Ordem de Serviço.'
  ),
  orderController.adicionarItemProduto
);

router.delete(
  '/:id/produtos/:itemId',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para remover ou estornar peças da Ordem de Serviço.'
  ),
  orderController.removerItemProduto
);

router.delete(
  '/:id/itens/:itemId',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para remover ou estornar peças da Ordem de Serviço.'
  ),
  orderController.removerItemProduto
);

// Baixa no estoque de peças da OS (RF06): restrito a ADMIN e TECNICO
router.post(
  '/:id/baixar-estoque',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para realizar baixa de peças no estoque.'
  ),
  orderController.baixarEstoque
);

// Atribuição ou alteração de técnico responsável: restrito a ADMIN e TECNICO
router.patch(
  '/:id/tecnico',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para atribuir ou alterar o técnico responsável.'
  ),
  orderController.atribuirTecnico
);

router.post(
  '/:id/assumir',
  roleMiddleware(
    ['ADMIN', 'TECNICO'],
    'Atendentes não possuem permissão para assumir a Ordem de Serviço.'
  ),
  orderController.atribuirTecnico
);

module.exports = router;
