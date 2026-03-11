const pool = require('../config/db');

// Получить данные сотрудника для профиля
exports.getEmployeeData = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT 
                u.id,
                u.full_name,
                u.login,
                u.role,
                u.vacation_days_total,
                u.vacation_days_left,
                u.avatar_url,
                u.department,
                u.organization_id,
                o.name as organization_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Сотрудник не найден' });
        }

        const user = result.rows[0];
        
        // Формируем ответ
        const response = {
            id: user.id,
            full_name: user.full_name,
            login: user.login,
            role: user.role,
            vacation_days_total: user.vacation_days_total,
            vacation_days_left: user.vacation_days_left,
            avatar_url: user.avatar_url,
            department: user.department,
            organization: user.organization_id ? {
                id: user.organization_id,
                name: user.organization_name
            } : null
        };

        res.json(response);
    } catch (error) {
        console.error('Ошибка при получении данных сотрудника:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
