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
    const fileName = result.rows[0].title + '.docx';
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл не найден' });
    }
    
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
