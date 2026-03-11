const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const deepseekService = require('../services/deepseekService');

router.post('/analyze-document', authMiddleware, async (req, res) => {
  try {
    const { filename, content } = req.body;

    const prompt = `Проанализируй содержимое файла "${filename}" и определи параметры документа.
    
    Содержимое файла:
    ${content}
    
    Определи:
    1. Тип документа (одно из: vacation, sick, financial, other)
    2. Категория (короткое название, например "Кадровые документы", "Отпуска", "Больничные")
    3. Рекомендуемое название для документа (на русском)
    4. Список полей, которые нужно заполнять (найди все {ПОЛЯ} в тексте)
    
    Ответь строго в формате JSON без каких-либо пояснений и без Markdown-разметки:
    {
      "type": "vacation",
      "category": "Отпуска",
      "title": "Заявление на отпуск",
      "fields": ["FULL_NAME", "DATE_FROM", "DATE_TO"]
    }`;

    const analysis = await deepseekService.ask('analyzer', prompt, '');
    
    // Пробуем распарсить JSON из ответа, убирая Markdown
    let result;
    try {
      // Убираем Markdown-разметку (```json и ```)
      let cleanedAnalysis = analysis.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      
      // Ищем JSON в ответе
      const jsonMatch = cleanedAnalysis.match(/\{.*\}/s);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('JSON parse error:', e.message);
      console.log('Raw analysis:', analysis);
      
      // Если не получилось, возвращаем базовые значения
      result = {
        type: 'other',
        category: 'Общие',
        title: filename.replace(/\.[^/.]+$/, ""),
        fields: []
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

module.exports = router;
