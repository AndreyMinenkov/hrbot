const pool = require('../config/db');
const deepseekService = require('../services/deepseekService');

// Поиск по базе знаний с DeepSeek
exports.searchFaq = async (req, res) => {
    console.log("=== searchFaq called ===");
    console.log("Query:", req.query);
    console.log("User:", req.user.id);
    try {
        const { query } = req.query;
        const userId = req.user.id;

        if (!query) {
            return res.status(400).json({ message: 'Поисковый запрос обязателен' });
        }

        // Ищем релевантный контекст в базе знаний
        const context = await deepseekService.findRelevantContext(query, pool);
        
        // Отправляем запрос в DeepSeek с историей диалога
        const answer = await deepseekService.ask(userId, query, context || 'Информация не найдена в базе знаний');

        // Возвращаем ответ
        res.json([{
            id: 0,
            keywords: query,
            question: query,
            answer: answer,
            category: null,
            file_path: null,
            buttons: [],
            hasChildren: false
        }]);

    } catch (error) {
        console.error('Ошибка при поиске в FAQ:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получение всех категорий FAQ
exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT category FROM faq WHERE category IS NOT NULL'
        );
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Ошибка при получении категорий:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Сброс диалога
exports.resetDialog = async (req, res) => {
    try {
        const userId = req.user.id;
        deepseekService.clearHistory(userId);
        res.json({ message: 'Диалог сброшен' });
    } catch (error) {
        console.error('Ошибка при сбросе диалога:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получить FAQ по ID
exports.getFaqById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, keywords, question, answer, category, file_path, buttons
             FROM faq
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при получении FAQ по ID:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
