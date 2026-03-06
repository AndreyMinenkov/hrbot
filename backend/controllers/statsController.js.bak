const pool = require('../config/db');

// Получение статистики (только для админа)
exports.getStats = async (req, res) => {
    try {
        // Диалоги с ботом за сегодня
        const todayDialogs = await pool.query(
            `SELECT COUNT(*) as count FROM chat_history 
             WHERE DATE(timestamp) = CURRENT_DATE`
        );
        
        // Диалоги с ботом за неделю
        const weekDialogs = await pool.query(
            `SELECT COUNT(*) as count FROM chat_history 
             WHERE timestamp >= NOW() - INTERVAL '7 days'`
        );
        
        // Самые популярные вопросы (топ-5)
        const popularQuestions = await pool.query(
            `SELECT message, COUNT(*) as count 
             FROM chat_history 
             GROUP BY message 
             ORDER BY count DESC 
             LIMIT 5`
        );
        
        // Количество скачанных документов
        const totalDownloads = await pool.query(
            'SELECT SUM(downloads_count) as total FROM documents'
        );
        
        // Количество документов в библиотеке
        const totalDocuments = await pool.query(
            'SELECT COUNT(*) as count FROM documents'
        );
        
        // Количество пользователей
        const totalUsers = await pool.query(
            'SELECT COUNT(*) as count FROM users'
        );
        
        // Активность по дням (последние 7 дней)
        const dailyActivity = await pool.query(
            `SELECT DATE(timestamp) as date, COUNT(*) as count 
             FROM chat_history 
             WHERE timestamp >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(timestamp)
             ORDER BY date DESC`
        );
        
        res.json({
            dialogs: {
                today: parseInt(todayDialogs.rows[0].count),
                week: parseInt(weekDialogs.rows[0].count)
            },
            popular_questions: popularQuestions.rows.map(row => ({
                question: row.message,
                count: parseInt(row.count)
            })),
            documents: {
                total_downloads: parseInt(totalDownloads.rows[0].total) || 0,
                total_documents: parseInt(totalDocuments.rows[0].count)
            },
            users: {
                total: parseInt(totalUsers.rows[0].count)
            },
            daily_activity: dailyActivity.rows
        });
        
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Запись истории чата
exports.saveChatHistory = async (req, res) => {
    try {
        const { message, bot_response } = req.body;
        const user_id = req.user.id;
        
        await pool.query(
            'INSERT INTO chat_history (user_id, message, bot_response) VALUES ($1, $2, $3)',
            [user_id, message, bot_response]
        );
        
        res.status(201).json({ message: 'История сохранена' });
    } catch (error) {
        console.error('Ошибка при сохранении истории:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получение истории чата пользователя (для админа)
exports.getUserChatHistory = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const result = await pool.query(
            `SELECT ch.id, ch.message, ch.bot_response, ch.timestamp, u.full_name 
             FROM chat_history ch
             JOIN users u ON ch.user_id = u.id
             WHERE ch.user_id = $1
             ORDER BY ch.timestamp DESC`,
            [user_id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении истории чата:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получение всей истории чатов (для админа)
exports.getAllChatHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ch.id, ch.message, ch.bot_response, ch.timestamp, 
                    u.id as user_id, u.full_name, u.login
             FROM chat_history ch
             JOIN users u ON ch.user_id = u.id
             ORDER BY ch.timestamp DESC
             LIMIT 100`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении истории чатов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
