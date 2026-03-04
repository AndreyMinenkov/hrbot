const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют авторизации
router.get('/search', authMiddleware, faqController.searchFaq);
router.get('/categories', authMiddleware, faqController.getCategories);

module.exports = router;

// Сброс диалога
router.post('/reset', authMiddleware, faqController.resetDialog);
