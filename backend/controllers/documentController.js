const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки документов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/documents/';
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

exports.upload = multer({ storage: storage });

// ========== Публичное API (для сотрудников) ==========

// Получить все категории документов
exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category'
        );
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Ошибка при получении категорий:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получить документы по категории
exports.getDocumentsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const result = await pool.query(
            'SELECT id, title, category, file_path, file_size, downloads_count FROM documents WHERE category = $1 ORDER BY title',
            [decodeURIComponent(category)]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении документов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Скачать документ (увеличивает счетчик скачиваний)
exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const docResult = await pool.query(
            'SELECT file_path, title FROM documents WHERE id = $1',
            [id]
        );

        if (docResult.rows.length === 0) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        const filePath = path.join(__dirname, '..', docResult.rows[0].file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Файл не найден на сервере' });
        }

        await pool.query(
            'UPDATE documents SET downloads_count = downloads_count + 1 WHERE id = $1',
            [id]
        );

        // Устанавливаем правильный Content-Type в зависимости от расширения
        const ext = path.extname(docResult.rows[0].file_path).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
                const encodedFilename = encodeURIComponent(docResult.rows[0].title);
        res.setHeader("Content-Disposition", `attachment; filename="${encodedFilename}${ext}"; filename*=UTF-8${encodedFilename}${ext}`);

        // Отправляем файл
        res.sendFile(filePath);
        
    } catch (error) {
        console.error('Ошибка при скачивании документа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// ========== Админское API (CRUD) ==========

// Получить все документы (для админа)
exports.getAllDocuments = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, title, category, file_path, file_size, downloads_count, created_at FROM documents ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении документов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Создать документ
exports.createDocument = async (req, res) => {
    try {
        const { title, category } = req.body;

        if (!title || !category || !req.file) {
            return res.status(400).json({ message: 'Название, категория и файл обязательны' });
        }

        const file_path = `/uploads/documents/${req.file.filename}`;
        const file_size = req.file.size;

        const result = await pool.query(
            `INSERT INTO documents (title, category, file_path, file_size) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [title, category, file_path, file_size]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при создании документа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Обновить документ
exports.updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category } = req.body;

        let query, values;

        if (req.file) {
            const file_path = `/uploads/documents/${req.file.filename}`;
            const file_size = req.file.size;

            const oldDoc = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id]);
            if (oldDoc.rows.length > 0) {
                const oldPath = path.join(__dirname, '..', oldDoc.rows[0].file_path);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            query = `UPDATE documents SET title = $1, category = $2, file_path = $3, file_size = $4 WHERE id = $5 RETURNING *`;
            values = [title, category, file_path, file_size, id];
        } else {
            query = `UPDATE documents SET title = $1, category = $2 WHERE id = $3 RETURNING *`;
            values = [title, category, id];
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении документа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Удалить документ
exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const docResult = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id]);

        if (docResult.rows.length === 0) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        const filePath = path.join(__dirname, '..', docResult.rows[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await pool.query('DELETE FROM documents WHERE id = $1', [id]);

        res.json({ message: 'Документ удален', id: parseInt(id) });
    } catch (error) {
        console.error('Ошибка при удалении документа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
