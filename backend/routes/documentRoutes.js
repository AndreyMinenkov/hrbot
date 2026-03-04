const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// ===== Публичные маршруты (требуют авторизации) =====
router.get('/categories', authMiddleware, documentController.getCategories);
router.get('/category/:category', authMiddleware, documentController.getDocumentsByCategory);
router.get('/download/:id', authMiddleware, documentController.downloadDocument);

// ===== Админские маршруты =====
router.get('/admin/all', authMiddleware, adminMiddleware, documentController.getAllDocuments);
router.post('/admin/create', authMiddleware, adminMiddleware, documentController.upload.single('file'), documentController.createDocument);
router.put('/admin/update/:id', authMiddleware, adminMiddleware, documentController.upload.single('file'), documentController.updateDocument);
router.delete('/admin/delete/:id', authMiddleware, adminMiddleware, documentController.deleteDocument);

module.exports = router;
