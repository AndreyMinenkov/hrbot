module.exports = (req, res, next) => {
    // req.user должен быть установлен в authMiddleware
    if (!req.user) {
        return res.status(401).json({ message: 'Не авторизован' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }

    next();
};
