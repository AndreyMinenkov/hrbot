const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Публичные маршруты (не требуют авторизации)
router.post('/login', authController.login);

// Защищенные маршруты (требуют авторизации)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
