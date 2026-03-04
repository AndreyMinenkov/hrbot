const pool = require('../config/db');

// Получение данных сотрудника (остаток отпуска)
exports.getEmployeeData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            'SELECT id, full_name, login, role, vacation_days_total, vacation_days_left, avatar_url FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Сотрудник не найден' });
        }

        res.json({
            full_name: result.rows[0].full_name,
            vacation_days_total: result.rows[0].vacation_days_total,
            vacation_days_left: result.rows[0].vacation_days_left,
            avatar_url: result.rows[0].avatar_url
        });
        
    } catch (error) {
        console.error('Ошибка при получении данных сотрудника:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
