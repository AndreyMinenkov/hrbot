const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Скачать документ по ID (с авторизацией)
router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT file_path, title FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Документ не найден' });
    }

    const filePath = result.rows[0].file_path;

    // Получаем оригинальное имя файла из пути
    const originalFileName = path.basename(filePath);

    // Извлекаем расширение из оригинального файла
    const fileExtension = path.extname(originalFileName);

    // Формируем имя для скачивания: название документа + расширение
    const downloadFileName = result.rows[0].title + fileExtension;

    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ message: 'Файл не найден на сервере' });
    }

    // RFC 5987 формат для UTF-8 имен файлов
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFileName)}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`);
    
    // Отправляем файл
    res.sendFile(filePath);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
