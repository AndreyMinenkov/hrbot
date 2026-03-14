const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const autoKnowledgeService = require('../services/autoKnowledgeService');

// Поиск документов по тексту запроса
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 3) {
      return res.json([]);
    }

    console.log(`Searching documents for query: "${query}"`);

    // Ищем документы через сервис
    const documents = await autoKnowledgeService.searchDocuments(
      query,
      req.user.organization_id
    );

    // Форматируем результат для отправки
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      question: doc.question,
      answer: doc.answer,
      file_path: doc.file_path,
      download_url: `/api/documents/download/${doc.id}`,
      relevance: doc.rank || 0
    }));

    res.json(formattedDocs);

  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ message: 'Ошибка при поиске документов' });
  }
});

// Получить документы по категории
router.get('/by-category/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    
    const result = await pool.query(
      `SELECT d.id, d.title, d.category, d.file_path,
              q.question, q.answer
       FROM documents d
       LEFT JOIN faq q ON d.question_id = q.id
       WHERE d.category ILIKE $1 
         AND (d.organization_id = $2 OR d.organization_id IS NULL)
       ORDER BY d.title`,
      [`%${category}%`, req.user.organization_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting documents by category:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить рекомендации документов на основе вопроса
router.post('/recommend', authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ message: 'Вопрос обязателен' });
    }

    // Используем тот же поиск, но с AI пониманием контекста
    const documents = await autoKnowledgeService.searchDocuments(
      question,
      req.user.organization_id
    );

    // Берем топ-3 наиболее релевантных
    const recommendations = documents.slice(0, 3).map(doc => ({
      id: doc.id,
      title: doc.title,
      question: doc.question,
      download_url: `/api/documents/download/${doc.id}`
    }));

    res.json(recommendations);

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
