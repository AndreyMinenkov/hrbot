const express = require('express');
const router = express.Router();
const templateService = require('../services/documentTemplateService');
const authMiddleware = require('../middleware/auth');

// Все роуты требуют авторизации
router.use(authMiddleware);

// Получить доступные типы документов для пользователя
router.get('/types', async (req, res) => {
  try {
    const templates = await templateService.getTemplates(req.user.organization_id);
    
    // Группируем по типам
    const types = {};
    templates.forEach(t => {
      if (!types[t.template_type]) {
        types[t.template_type] = {
          type: t.template_type,
          templates: []
        };
      }
      types[t.template_type].templates.push({
        id: t.id,
        name: t.name,
        description: t.description
      });
    });
    
    res.json(Object.values(types));
  } catch (error) {
    console.error('Error getting document types:', error);
    res.status(500).json({ message: 'Ошибка при получении типов документов' });
  }
});

// Сгенерировать документ по шаблону
router.post('/generate/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const customFields = req.body.fields || {};
    
    const result = await templateService.fillTemplate(
      templateId,
      req.user.id,
      customFields
    );
    
    if (result.missingFields && result.missingFields.length > 0) {
      return res.json({
        warning: true,
        message: `Не заполнены поля: ${result.missingFields.join(', ')}`,
        document: result.content,
        missingFields: result.missingFields,
        template: {
          id: result.template.id,
          name: result.template.name,
          fields: result.template.fields
        }
      });
    }
    
    res.json({
      document: result.content,
      template: {
        id: result.template.id,
        name: result.template.name
      }
    });
    
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ message: 'Ошибка при генерации документа' });
  }
});

// Проверить, можно ли сгенерировать документ по тексту запроса
router.post('/check-intent', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Запрос обязателен' });
    }
    
    // Здесь будем использовать DeepSeek для анализа намерения
    // Пока вернем заглушку
    const keywords = ['заявление', 'бланк', 'отпуск', 'больничный', 'справка'];
    const foundKeywords = keywords.filter(k => query.toLowerCase().includes(k));
    
    if (foundKeywords.length > 0) {
      // Получаем доступные шаблоны
      const templates = await templateService.getTemplates(req.user.organization_id);
      
      if (templates.length > 0) {
        return res.json({
          canGenerate: true,
          intent: 'document',
          keywords: foundKeywords,
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            type: t.template_type
          }))
        });
      }
    }
    
    res.json({ canGenerate: false });
    
  } catch (error) {
    console.error('Error checking intent:', error);
    res.status(500).json({ message: 'Ошибка при проверке намерения' });
  }
});

module.exports = router;
