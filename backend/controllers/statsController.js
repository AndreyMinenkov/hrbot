const pool = require('../config/db');

// Получение статистики (только для админа)
exports.getStats = async (req, res) => {
    try {
        // Диалоги с ботом за сегодня (считаем уникальные пары user+bot по времени)
        const todayDialogs = await pool.query(
            `SELECT COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as count 
             FROM chat_history
             WHERE DATE(created_at) = CURRENT_DATE
             AND user_id IS NOT NULL`
        );

        // Диалоги с ботом за неделю
        const weekDialogs = await pool.query(
            `SELECT COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as count 
             FROM chat_history
             WHERE created_at >= NOW() - INTERVAL '7 days'
             AND user_id IS NOT NULL`
        );

        // Самые популярные вопросы (топ-5) — только сообщения от user
        const popularQuestions = await pool.query(
            `SELECT text as message, COUNT(*) as count
             FROM chat_history
             WHERE sender = 'user'
             GROUP BY text
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

        // Активность по дням (последние 7 дней) — считаем все сообщения
        const dailyActivity = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM chat_history
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        res.json({
            dialogs: {
                today: parseInt(todayDialogs.rows[0].count) || 0,
                week: parseInt(weekDialogs.rows[0].count) || 0
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

// Запись истории чата (соответствует api.ts)
exports.saveChat = async (req, res) => {
    try {
        const { query, response } = req.body;
        const user_id = req.user.id;

        // Проверяем, что query не пустой
        if (!query) {
            return res.status(400).json({ message: 'Запрос не может быть пустым' });
        }

        // Сохраняем сообщение пользователя
        await pool.query(
            'INSERT INTO chat_history (user_id, sender, text) VALUES ($1, $2, $3)',
            [user_id, 'user', query]
        );

        // Сохраняем ответ бота (если есть)
        if (response) {
            await pool.query(
                'INSERT INTO chat_history (user_id, sender, text) VALUES ($1, $2, $3)',
                [user_id, 'bot', response]
            );
        }

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
            `SELECT ch.id, ch.sender, ch.text, ch.created_at as timestamp, u.full_name
             FROM chat_history ch
             JOIN users u ON ch.user_id = u.id
             WHERE ch.user_id = $1
             ORDER BY ch.created_at DESC`,
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
            `SELECT ch.id, ch.sender, ch.text, ch.created_at as timestamp,
                    u.id as user_id, u.full_name, u.login
             FROM chat_history ch
             JOIN users u ON ch.user_id = u.id
             ORDER BY ch.created_at DESC
             LIMIT 100`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении истории чатов:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
