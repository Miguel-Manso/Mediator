const { Router } = require('express');
const reportController = require('../controllers/report.controller');

const router = Router();

// Endpoints Master-Detail de relatórios operacionais (RF12)
router.get('/operacional', reportController.obterRelatorioOperacional);
router.get('/operational', reportController.obterRelatorioOperacional);

module.exports = router;
