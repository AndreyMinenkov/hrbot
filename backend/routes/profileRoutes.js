const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = '/root/hr-bot/uploads/documents/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены'));
        }
    }
});

// Получение профиля
router.get('/', authMiddleware, profileController.getProfile);

// Обновление профиля (отдел, организация)
router.put('/', authMiddleware, profileController.updateProfile);

// Обновление аватара
router.put('/avatar', authMiddleware, upload.single('avatar'), profileController.updateAvatar);

// Получить аватар
router.get('/avatar', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
        
        if (result.rows.length === 0 || !result.rows[0].avatar_url) {
            return res.status(404).json({ message: 'Аватар не найден' });
        }

        const filePath = result.rows[0].avatar_url;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Файл не найден' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Error getting avatar:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;
