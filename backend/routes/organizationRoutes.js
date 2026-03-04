const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Все маршруты требуют авторизации
router.use(authMiddleware);

// Публичные маршруты (доступны всем авторизованным)
router.get('/', organizationController.getAll);
router.get('/:id', organizationController.getById);

// Админские маршруты (только для администраторов)
router.post('/', adminMiddleware, organizationController.create);
router.put('/:id', adminMiddleware, organizationController.update);
router.delete('/:id', adminMiddleware, organizationController.delete);

module.exports = router;
