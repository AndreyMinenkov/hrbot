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
        sender,
        text,
        created_at as timestamp
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [userId, limit]
    );

    console.log(`Found ${result.rows.length} messages for user ${userId}`);

    // Возвращаем как есть, без преобразования
    res.json(result.rows);
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

    console.log(`Saving message for user ${userId}: "${message.substring(0, 30)}..."`);

    // Вставляем сообщение пользователя
    await pool.query(
      `INSERT INTO chat_history (user_id, sender, text)
       VALUES ($1, 'user', $2)`,
      [userId, message]
    );

    // Вставляем ответ бота
    await pool.query(
      `INSERT INTO chat_history (user_id, sender, text)
       VALUES ($1, 'bot', $2)`,
      [userId, botResponse]
    );

    // Удаляем старые сообщения, оставляем только последние 50
    await pool.query(
      `DELETE FROM chat_history
       WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM chat_history
         WHERE user_id = $1
         ORDER BY created_at DESC
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
