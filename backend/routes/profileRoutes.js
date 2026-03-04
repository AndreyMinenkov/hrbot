const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// Все маршруты профиля требуют авторизации
router.use(authMiddleware);

// Получить профиль текущего пользователя
router.get('/', profileController.getProfile);

// Обновить профиль текущего пользователя
router.put('/', profileController.updateProfile);

module.exports = router;
