const pool = require('../config/db');

// Получение профиля пользователя с информацией об организации
exports.getProfile = async (req, res) => {
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
                o.id as org_id,
                o.name as organization_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.id = $1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Форматируем ответ
        const user = result.rows[0];
        const profile = {
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

        res.json(profile);
    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Обновление профиля пользователя
exports.updateProfile = async (req, res) => {
    try {
        const { department, organization_id } = req.body;
        const userId = req.user.id;

        // Проверяем, что organization_id существует, если передан
        if (organization_id) {
            const orgCheck = await pool.query(
                'SELECT id FROM organizations WHERE id = $1',
                [organization_id]
            );
            if (orgCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Выбранная организация не существует' });
            }
        }

        // Обновляем только переданные поля
        const updates = [];
        const values = [];
        let paramCounter = 1;

        if (department !== undefined) {
            updates.push(`department = $${paramCounter}`);
            values.push(department);
            paramCounter++;
        }

        if (organization_id !== undefined) {
            updates.push(`organization_id = $${paramCounter}`);
            values.push(organization_id || null); // Если null - сбрасываем организацию
            paramCounter++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Нет данных для обновления' });
        }

        values.push(userId);
        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING id, department, organization_id
        `;

        const result = await pool.query(query, values);

        // Получаем обновленный профиль с названием организации
        const updatedProfile = await pool.query(`
            SELECT 
                u.department,
                o.id as org_id,
                o.name as organization_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.id = $1
        `, [userId]);

        const profile = updatedProfile.rows[0];
        res.json({
            message: 'Профиль обновлен успешно',
            department: profile.department,
            organization: profile.org_id ? {
                id: profile.org_id,
                name: profile.organization_name
            } : null
        });

    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
