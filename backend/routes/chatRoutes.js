const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Получить историю чата пользователя
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 15;

    const result = await pool.query(
      `SELECT 
        id,
        message,
        bot_response,
        timestamp
       FROM chat_history 
       WHERE user_id = $1 
       ORDER BY timestamp ASC 
       LIMIT $2`,
      [userId, limit]
    );

    // Преобразуем в формат сообщений для чата
    const messages = [];
    result.rows.forEach(row => {
      if (row.message) {
        messages.push({
          id: `user-${row.id}`,
          text: row.message,
          sender: 'user',
          timestamp: row.timestamp
        });
      }
      if (row.bot_response) {
        messages.push({
          id: `bot-${row.id}`,
          text: row.bot_response,
          sender: 'bot',
          timestamp: row.timestamp
        });
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Сохранить сообщение в историю
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, botResponse } = req.body;

    await pool.query(
      `INSERT INTO chat_history (user_id, message, bot_response)
       VALUES ($1, $2, $3)`,
      [userId, message, botResponse]
    );

    // Удаляем старые сообщения, оставляем только последние 50
    await pool.query(
      `DELETE FROM chat_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM chat_history 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 50
       )`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
