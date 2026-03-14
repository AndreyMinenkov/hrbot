const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const autoKnowledgeService = require('../services/autoKnowledgeService');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    // Создаем папку, если её нет
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
  fileFilter: (req, file, cb) => {
    // Разрешаем загружать документы
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.docx', '.doc', '.pdf', '.txt', '.odt'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла. Разрешены: .docx, .doc, .pdf, .txt, .odt'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Все роуты требуют авторизации и прав администратора
router.use(authMiddleware);
router.use(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
  next();
});

// Загрузка одного документа с автоматическим наполнением базы знаний
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const { title, category, organization_id } = req.body;
    const organizationId = organization_id || req.user.organization_id;

    // Сохраняем информацию о документе в базу
    const documentResult = await pool.query(
      `INSERT INTO documents 
       (title, category, file_path, file_size, organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        title || req.file.originalname.replace(/\.[^/.]+$/, ""),
        category || 'Общие документы',
        req.file.path,
        req.file.size,
        organizationId
      ]
    );

    const documentId = documentResult.rows[0].id;

    // Запускаем автоматическое наполнение базы знаний
    // Не ждем завершения, чтобы не задерживать ответ
    autoKnowledgeService.processDocument(
      documentId,
      req.file.path,
      req.file.originalname,
      organizationId
    ).then(result => {
      if (result.success) {
        console.log(`Auto-knowledge completed for document ${documentId}:`, result);
      } else {
        console.error(`Auto-knowledge failed for document ${documentId}:`, result.error);
      }
    }).catch(err => {
      console.error(`Auto-knowledge error for document ${documentId}:`, err);
    });

    res.status(201).json({
      message: 'Документ загружен, база знаний обновляется',
      document: {
        id: documentId,
        title: title || req.file.originalname.replace(/\.[^/.]+$/, ""),
        category: category || 'Общие документы',
        file_name: req.file.filename,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Ошибка при загрузке документа' });
  }
});

// Алиас для совместимости с фронтендом (create)
router.post('/create', upload.single('file'), async (req, res) => {
  // Просто перенаправляем на основной метод
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const { title, category, organization_id } = req.body;
    const organizationId = organization_id || req.user.organization_id;

    // Сохраняем информацию о документе в базу
    const documentResult = await pool.query(
      `INSERT INTO documents 
       (title, category, file_path, file_size, organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        title || req.file.originalname.replace(/\.[^/.]+$/, ""),
        category || 'Общие документы',
        req.file.path,
        req.file.size,
        organizationId
      ]
    );

    const documentId = documentResult.rows[0].id;

    // Запускаем автоматическое наполнение базы знаний
    autoKnowledgeService.processDocument(
      documentId,
      req.file.path,
      req.file.originalname,
      organizationId
    ).catch(err => {
      console.error(`Auto-knowledge error for document ${documentId}:`, err);
    });

    res.status(201).json({
      message: 'Документ загружен, база знаний обновляется',
      document: {
        id: documentId,
        title: title || req.file.originalname.replace(/\.[^/.]+$/, ""),
        category: category || 'Общие документы',
        file_name: req.file.filename,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Error in create document:', error);
    res.status(500).json({ message: 'Ошибка при загрузке документа' });
  }
});

// Массовая загрузка документов
router.post('/bulk-upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Файлы не загружены' });
    }

    const { category, organization_id } = req.body;
    const organizationId = organization_id || req.user.organization_id;
    
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Сохраняем документ
        const documentResult = await pool.query(
          `INSERT INTO documents 
           (title, category, file_path, file_size, organization_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id`,
          [
            file.originalname.replace(/\.[^/.]+$/, ""),
            category || 'Общие документы',
            file.path,
            file.size,
            organizationId
          ]
        );

        const documentId = documentResult.rows[0].id;

        // Запускаем обработку для наполнения базы знаний
        autoKnowledgeService.processDocument(
          documentId,
          file.path,
          file.originalname,
          organizationId
        ).catch(err => {
          console.error(`Auto-knowledge error for document ${documentId}:`, err);
        });

        results.push({
          id: documentId,
          name: file.originalname,
          size: file.size,
          status: 'processing'
        });

      } catch (error) {
        errors.push({
          name: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      message: `Загружено ${results.length} документов, база знаний обновляется`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ message: 'Ошибка при массовой загрузке' });
  }
});

// Получить статус обработки документа
router.get('/status/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.title, d.category, 
              q.id as question_id, q.question,
              c.id as category_id
       FROM documents d
       LEFT JOIN faq q ON d.question_id = q.id
       LEFT JOIN faq c ON q.parent_id = c.id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Документ не найден' });
    }

    const doc = result.rows[0];
    res.json({
      document: {
        id: doc.id,
        title: doc.title,
        category: doc.category
      },
      knowledge: {
        hasCategory: !!doc.category_id,
        hasQuestion: !!doc.question_id,
        categoryId: doc.category_id,
        questionId: doc.question_id,
        question: doc.question
      }
    });

  } catch (error) {
    console.error('Error getting document status:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
