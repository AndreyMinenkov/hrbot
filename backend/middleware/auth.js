const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Получаем токен из заголовка Authorization
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Нет токена авторизации' });
        }

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Добавляем данные пользователя в запрос
        req.user = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Недействительный токен' });
    }
};
