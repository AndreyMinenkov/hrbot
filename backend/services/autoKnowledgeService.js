const pool = require('../config/db');
const deepseekService = require('./deepseekService');
const fs = require('fs').promises;
const path = require('path');

class AutoKnowledgeService {
  
  // Основной метод обработки документа
  async processDocument(documentId, filePath, fileName, organizationId = null) {
    try {
      console.log(`Processing document: ${fileName} (ID: ${documentId})`);
      
      // 1. Читаем содержимое файла
      const content = await this.extractTextFromFile(filePath, fileName);
      
      // 2. Анализируем документ через DeepSeek
      const analysis = await this.analyzeDocument(fileName, content);
      
      // 3. Создаем или получаем категорию
      const categoryId = await this.getOrCreateCategory(analysis.category, organizationId);
      
      // 4. Создаем вопрос в категории
      const questionId = await this.createQuestion(categoryId, analysis, documentId, organizationId);
      
      // 5. Обновляем документ - привязываем к вопросу
      await this.linkDocumentToQuestion(documentId, questionId);
      
      // 6. Сохраняем содержимое для поиска
      await this.saveDocumentContent(documentId, content, analysis.keywords);
      
      console.log(`Document ${fileName} processed successfully. Category: ${analysis.category}, Question ID: ${questionId}`);
      
      return {
        success: true,
        categoryId,
        questionId,
        analysis
      };
      
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Извлечение текста из файла (заглушка, потом добавим парсеры)
  async extractTextFromFile(filePath, fileName) {
    // Пока просто возвращаем информацию, что это документ
    // В будущем здесь будет реальное извлечение текста из docx, pdf и т.д.
    return `Документ: ${fileName}. Требуется реализовать извлечение текста.`;
  }
  
  // Анализ документа через DeepSeek
  async analyzeDocument(fileName, content) {
    const prompt = `Проанализируй документ "${fileName}" и определи следующие параметры:

Содержимое документа:
${content}

Требуется определить:
1. Категория документа (например: "Отпуска", "Командировки", "Больничные", "Увольнение", "Финансовые вопросы", "Кадровые вопросы" и т.д.) - выбери наиболее подходящую категорию на русском языке
2. Вопрос, который может задать сотрудник по этому документу (например: "Как написать заявление на отпуск?")
3. Краткий ответ на этот вопрос (1-2 предложения)
4. Ключевые слова для поиска (массив слов через запятую)
5. Название документа (как оно будет отображаться в списке)

Ответь строго в формате JSON без пояснений:
{
  "category": "Отпуска",
  "question": "Как написать заявление на отпуск?",
  "answer": "Для оформления отпуска необходимо заполнить заявление на отпуск. Форму можно скачать по ссылке ниже.",
  "keywords": ["отпуск", "заявление", "отдых", "отпускные"],
  "title": "Заявление на ежегодный оплачиваемый отпуск"
}`;

    const analysisText = await deepseekService.ask('knowledge-base', prompt, fileName);
    
    // Парсим JSON из ответа
    try {
      // Очищаем от Markdown
      let cleaned = analysisText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      const jsonMatch = cleaned.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // Убеждаемся, что keywords это массив
        if (result.keywords && !Array.isArray(result.keywords)) {
          result.keywords = result.keywords.split(',').map(k => k.trim());
        }
        return result;
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    
    // Возвращаем значения по умолчанию, если не удалось распарсить
    return {
      category: "Общие документы",
      question: `Как использовать документ ${fileName}?`,
      answer: "Документ загружен в систему. Вы можете скачать его по ссылке.",
      keywords: [fileName.replace(/\.[^/.]+$/, "")],
      title: fileName.replace(/\.[^/.]+$/, "")
    };
  }
  
  // Получить существующую категорию или создать новую
  async getOrCreateCategory(categoryName, organizationId) {
    // Ищем существующую категорию в FAQ по полю category, где parent_id IS NULL
    let result = await pool.query(
      `SELECT id FROM faq 
       WHERE category = $1 AND parent_id IS NULL AND (organization_id = $2 OR organization_id IS NULL)
       LIMIT 1`,
      [categoryName, organizationId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Если не нашли по category, ищем по question (для старых записей)
    result = await pool.query(
      `SELECT id FROM faq 
       WHERE question = $1 AND parent_id IS NULL AND (organization_id = $2 OR organization_id IS NULL)
       LIMIT 1`,
      [categoryName, organizationId]
    );
    
    if (result.rows.length > 0) {
      // Обновляем поле category у найденной записи
      await pool.query(
        `UPDATE faq SET category = $1 WHERE id = $2`,
        [categoryName, result.rows[0].id]
      );
      return result.rows[0].id;
    }
    
    // Создаем новую категорию (как корневой элемент FAQ)
    result = await pool.query(
      `INSERT INTO faq (question, answer, parent_id, category, organization_id, keywords)
       VALUES ($1, $2, NULL, $3, $4, $5)
       RETURNING id`,
      [categoryName, '', categoryName, organizationId, categoryName]
    );
    
    return result.rows[0].id;
  }
  
  // Создать вопрос в категории
  async createQuestion(categoryId, analysis, documentId, organizationId) {
    // Проверяем, нет ли уже похожего вопроса
    const similarResult = await pool.query(
      `SELECT id FROM faq 
       WHERE parent_id = $1 AND question ILIKE $2 AND organization_id = $3
       LIMIT 1`,
      [categoryId, `%${analysis.question.slice(0, 20)}%`, organizationId]
    );
    
    if (similarResult.rows.length > 0) {
      return similarResult.rows[0].id;
    }
    
    // Генерируем эмбеддинг для вопроса через существующий сервис
    console.log('Generating embedding for question:', analysis.question);
    let embedding = null;
    try {
      embedding = await deepseekService.getEmbedding(analysis.question);
      console.log('Embedding generated successfully');
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
    
    // Создаем новый вопрос
    const result = await pool.query(
      `INSERT INTO faq (question, answer, parent_id, category, organization_id, document_id, keywords, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        analysis.question,
        analysis.answer,
        categoryId,
        analysis.category,
        organizationId,
        documentId,
        analysis.keywords || [],
        embedding ? JSON.stringify(embedding) : null
      ]
    );
    
    return result.rows[0].id;
  }
  
  // Привязать документ к вопросу
  async linkDocumentToQuestion(documentId, questionId) {
    // Обновляем документ - добавляем ID вопроса
    await pool.query(
      `UPDATE documents SET question_id = $1 WHERE id = $2`,
      [questionId, documentId]
    );
  }
  
  // Сохранить содержимое документа для поиска
  async saveDocumentContent(documentId, content, keywords) {
    // Создаем таблицу, если её нет
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_contents (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        content_text TEXT NOT NULL,
        keywords TEXT[],
        search_vector tsvector GENERATED ALWAYS AS (to_tsvector('russian', content_text)) STORED,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_document_contents_search ON document_contents USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS idx_document_contents_doc_id ON document_contents(document_id);
    `);
    
    // Преобразуем keywords в массив PostgreSQL
    const keywordsArray = Array.isArray(keywords) ? keywords : 
                         (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : []);
    
    // Вставляем или обновляем содержимое
    await pool.query(
      `INSERT INTO document_contents (document_id, content_text, keywords)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id) 
       DO UPDATE SET content_text = EXCLUDED.content_text, 
                     keywords = EXCLUDED.keywords,
                     updated_at = CURRENT_TIMESTAMP`,
      [documentId, content, keywordsArray]
    );
  }
  
  // Поиск документов по тексту вопроса
  async searchDocuments(query, organizationId = null) {
    // Сначала ищем через DeepSeek для семантического понимания
    const searchPrompt = `Дан запрос пользователя: "${query}"
    
Найди наиболее подходящие документы из базы знаний по смыслу.
Верни JSON с массивом ID документов и их релевантностью.`;

    const searchResult = await deepseekService.ask('search', searchPrompt, query);
    
    // Пока используем простой текстовый поиск как запасной вариант
    const textResult = await pool.query(
      `SELECT d.id, d.title, d.category, d.file_path, q.question, q.answer,
              ts_rank(dc.search_vector, to_tsquery('russian', $1)) as rank
       FROM documents d
       LEFT JOIN faq q ON d.question_id = q.id
       LEFT JOIN document_contents dc ON d.id = dc.document_id
       WHERE (dc.search_vector @@ to_tsquery('russian', $1) 
              OR q.question ILIKE $2 
              OR q.answer ILIKE $2
              OR d.title ILIKE $2)
         AND (d.organization_id = $3 OR d.organization_id IS NULL OR $3 IS NULL)
       ORDER BY rank DESC NULLS LAST
       LIMIT 5`,
      [
        query.split(' ').join(' & '),
        `%${query}%`,
        organizationId
      ]
    );
    
    return textResult.rows;
  }
}

module.exports = new AutoKnowledgeService();
