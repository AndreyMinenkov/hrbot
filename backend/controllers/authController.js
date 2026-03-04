const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Вход в систему
exports.login = async (req, res) => {
    try {
        const { login, password } = req.body;

        // Проверяем, что логин и пароль переданы
        if (!login || !password) {
            return res.status(400).json({ message: 'Логин и пароль обязательны' });
        }

        // Ищем пользователя в базе с информацией об организации
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.full_name, 
                u.login, 
                u.password_hash, 
                u.role, 
                u.vacation_days_total, 
                u.vacation_days_left, 
                u.avatar_url,
                u.department,
                u.organization_id,
                o.name as organization_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.login = $1
        `, [login]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];

        // Проверяем пароль
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        }

        // Создаем JWT токен
        const token = jwt.sign(
            {
                id: user.id,
                login: user.login,
                role: user.role,
                full_name: user.full_name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Формируем объект пользователя без пароля
        const userResponse = {
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

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получение информации о текущем пользователе
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
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
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const user = result.rows[0];
        
        // Формируем ответ с организацией
        const userResponse = {
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

        res.json(userResponse);

    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
