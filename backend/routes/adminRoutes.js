const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Все маршруты требуют авторизации и прав администратора
router.use(authMiddleware, adminMiddleware);

// ===== Дополнительные роуты для FAQ с ветками =====
router.get('/faq/root', adminController.getRootFaq);
router.get('/faq/:id/children', adminController.getChildren);

// ===== Управление FAQ =====
router.get('/faq', adminController.getAllFaq);
router.get('/faq/:id', adminController.getFaqById);
router.post('/faq', adminController.upload.single('file'), adminController.createFaq);
router.put('/faq/:id', adminController.upload.single('file'), adminController.updateFaq);
router.delete('/faq/:id', adminController.deleteFaq);

// ===== Управление пользователями =====
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetPassword);

module.exports = router;

// ===== Mindmap =====
router.get('/faq/mindmap/:rootId', adminController.getMindmapGraph);

// ===== Mindmap редактирование =====
router.put('/faq/node/:id/position', adminController.updateNodePosition);
router.post('/faq/node', adminController.createMindmapNode);
router.put('/faq/node/:id', adminController.updateMindmapNode);
