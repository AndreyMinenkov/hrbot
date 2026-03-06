const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Сохранение истории чата (доступно всем авторизованным)
router.post('/chat/save', authMiddleware, statsController.saveChatHistory);

// Статистика (только для админа)
router.get('/admin', authMiddleware, adminMiddleware, statsController.getStats);
router.get('/admin/chat/all', authMiddleware, adminMiddleware, statsController.getAllChatHistory);
router.get('/admin/chat/user/:user_id', authMiddleware, adminMiddleware, statsController.getUserChatHistory);

module.exports = router;
