const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const templateService = require('../services/documentTemplateService');
const authMiddleware = require('../middleware/auth');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/templates');
    // Создаем папку, если её нет
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Разрешаем только текстовые файлы и docx
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.docx' || ext === '.odt') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .docx, .odt files are allowed'));
    }
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

// Получить все шаблоны для организации админа
router.get('/', async (req, res) => {
  try {
    const templates = await templateService.getTemplates(req.user.organization_id);
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ message: 'Ошибка при получении шаблонов' });
  }
});

// Получить шаблон по ID
router.get('/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(
      req.params.id, 
      req.user.organization_id
    );
    if (!template) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ message: 'Ошибка при получении шаблона' });
  }
});

// Создать новый шаблон
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл шаблона обязателен' });
    }

    const templateData = {
      organization_id: req.user.organization_id,
      name: req.body.name,
      description: req.body.description,
      template_type: req.body.template_type,
      fields: req.body.fields ? JSON.parse(req.body.fields) : [],
      is_active: req.body.is_active === 'true'
    };

    const template = await templateService.createTemplate(templateData, req.file);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Ошибка при создании шаблона' });
  }
});

// Обновить шаблон
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const templateData = {
      name: req.body.name,
      description: req.body.description,
      template_type: req.body.template_type,
      fields: req.body.fields ? JSON.parse(req.body.fields) : [],
      is_active: req.body.is_active === 'true'
    };

    const template = await templateService.updateTemplate(
      req.params.id,
      req.user.organization_id,
      templateData,
      req.file
    );

    if (!template) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Ошибка при обновлении шаблона' });
  }
});

// Удалить шаблон
router.delete('/:id', async (req, res) => {
  try {
    const template = await templateService.deleteTemplate(
      req.params.id,
      req.user.organization_id
    );

    if (!template) {
      return res.status(404).json({ message: 'Шаблон не найден' });
    }

    res.json({ message: 'Шаблон удален' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Ошибка при удалении шаблона' });
  }
});

module.exports = router;
