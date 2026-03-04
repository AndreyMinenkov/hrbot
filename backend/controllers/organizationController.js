const pool = require('../config/db');

// Получить все организации
exports.getAll = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, created_at FROM organizations ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении организаций:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получить организацию по ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, created_at FROM organizations WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Организация не найдена' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при получении организации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Создать новую организацию (только админ)
exports.create = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Название организации обязательно' });
        }

        const result = await pool.query(
            'INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at',
            [name]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при создании организации:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Организация с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Обновить организацию (только админ)
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Название организации обязательно' });
        }

        const result = await pool.query(
            'UPDATE organizations SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Организация не найдена' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении организации:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Организация с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Удалить организацию (только админ)
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        // Проверяем, есть ли пользователи, привязанные к этой организации
        const usersCheck = await pool.query(
            'SELECT COUNT(*) FROM users WHERE organization_id = $1',
            [id]
        );

        if (parseInt(usersCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                message: 'Нельзя удалить организацию, к которой привязаны сотрудники. Сначала переназначьте их.' 
            });
        }

        const result = await pool.query(
            'DELETE FROM organizations WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Организация не найдена' });
        }

        res.json({ message: 'Организация успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении организации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};
