const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/auth');

// Все маршруты требуют авторизации
router.get('/data', authMiddleware, employeeController.getEmployeeData);

module.exports = router;
