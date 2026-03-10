const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const OLLAMA_API_URL = 'http://localhost:11434/api/embeddings';

// Хранилище истории диалогов
const dialogHistory = new Map();

class DeepSeekService {
  constructor() {
    this.apiKey = DEEPSEEK_API_KEY;
  }

  async getEmbedding(text) {
    try {
      console.log('=== Getting embedding from Ollama ===');
      console.log('Text length:', text.length);
      
      const response = await axios.post(
        OLLAMA_API_URL,
        {
          model: 'bge-m3',
          prompt: text
        },
        {
          timeout: 30000
        }
      );
      
      console.log('Embedding received, length:', response.data.embedding.length);
      return response.data.embedding;
    } catch (error) {
      console.error('Ollama embedding error:', error.message);
      return null;
    }
  }

  // Определение типа запроса (документ или вопрос)
  detectQueryType(query) {
    const docKeywords = [
      'дай', 'скачать', 'бланк', 'шаблон', 'форму', 'заявление',
      'doc', 'docx', 'файл', 'документ', 'образец', 'скача'
    ];
    
    const lowerQuery = query.toLowerCase();
    
    // Проверяем, есть ли ключевые слова запроса документа
    const hasDocIntent = docKeywords.some(keyword => lowerQuery.includes(keyword));
    
    return hasDocIntent ? 'document' : 'question';
  }

  async findRelevantContext(query, pool) {
    try {
      const queryType = this.detectQueryType(query);
      console.log('=== Semantic search with embeddings ===');
      console.log('Query:', query);
      console.log('Query type:', queryType);

      const queryEmbedding = await this.getEmbedding(query);
      
      if (!queryEmbedding) {
        console.log('Embedding failed, falling back to legacy search');
        return this.findRelevantContextLegacy(query, pool, queryType);
      }

      // Разные запросы в зависимости от типа
      let sql;
      if (queryType === 'document') {
        // Ищем только записи с файлами
        sql = `
          SELECT 
            id, 
            question, 
            answer, 
            category, 
            keywords, 
            file_path,
            1 - (embedding <=> $1) as similarity
          FROM faq
          WHERE embedding IS NOT NULL
            AND file_path IS NOT NULL
          ORDER BY embedding <=> $1
          LIMIT 5
        `;
        console.log('Searching for documents only');
      } else {
        // Ищем все записи
        sql = `
          SELECT 
            id, 
            question, 
            answer, 
            category, 
            keywords, 
            file_path,
            1 - (embedding <=> $1) as similarity
          FROM faq
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> $1
          LIMIT 10
        `;
        console.log('Searching for all FAQs');
      }

      const result = await pool.query(sql, [JSON.stringify(queryEmbedding)]);

      console.log(`Found ${result.rows.length} records via semantic search`);

      if (result.rows.length === 0) {
        return this.findRelevantContextLegacy(query, pool, queryType);
      }

      result.rows.forEach(row => {
        console.log(`ID: ${row.id}, Similarity: ${Math.round(row.similarity * 100)}%, Has file: ${!!row.file_path}`);
      });

      return result.rows.map((row, index) => {
        let fileInfo = row.file_path ? `\n[Скачать файл](/api/documents/download/3)` : '';
        return `[Документ ${index + 1} (ID: ${row.id}, схожесть: ${Math.round(row.similarity * 100)}%)]
Категория: ${row.category || 'Общая'}
${row.question ? `Вопрос: ${row.question}` : ''}
Ответ: ${row.answer}${fileInfo}`;
      }).join('\n\n---\n\n');

    } catch (error) {
      console.error('Error in semantic search:', error);
      return this.findRelevantContextLegacy(query, pool, 'question');
    }
  }

  async findRelevantContextLegacy(query, pool, queryType = 'question') {
    try {
      console.log('=== Legacy keyword search ===');
      console.log('Query:', query);
      console.log('Query type:', queryType);

      const words = query.split(' ').filter(word => word.length > 2);
      let params = [`%${query}%`, `${query}%`];
      let wordConditions = '';

      if (words.length > 0) {
        wordConditions = words.map((word, i) =>
          `(keywords ILIKE $${i+3} OR question ILIKE $${i+3} OR answer ILIKE $${i+3})`
        ).join(' OR ');
        words.forEach(word => params.push(`%${word}%`));
      }

      // Для документов добавляем условие на наличие файла
      const fileCondition = queryType === 'document' ? ' AND file_path IS NOT NULL' : '';

      const result = await pool.query(
        `SELECT id, question, answer, category, keywords, file_path
         FROM faq
         WHERE (keywords ILIKE $1
            OR question ILIKE $1
            OR answer ILIKE $1
            OR category ILIKE $1
            ${wordConditions ? ` OR ${wordConditions}` : ''})
            ${fileCondition}
         ORDER BY
           CASE
             WHEN question ILIKE $2 THEN 1
             WHEN keywords ILIKE $2 THEN 2
             ELSE 3
           END
         LIMIT 15`,
        params
      );

      console.log(`Found ${result.rows.length} records via legacy search`);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows.map((row, index) => {
        let fileInfo = row.file_path ? `\n[Скачать файл](/api/documents/download/3)` : '';
        return `[Документ ${index + 1} (ID: ${row.id})]
Категория: ${row.category || 'Общая'}
${row.question ? `Вопрос: ${row.question}` : ''}
Ответ: ${row.answer}${fileInfo}`;
      }).join('\n\n---\n\n');
    } catch (error) {
      console.error('Error finding context:', error);
      return null;
    }
  }

  async ask(userId, prompt, context = '') {
    try {
      console.log('=== DEEPSEEK_API_KEY used:', this.apiKey ? this.apiKey.substring(0,10) + '...' : 'undefined');
      
      let history = dialogHistory.get(userId) || [];
      history.push({ role: 'user', content: prompt });

      if (history.length > 10) {
        history = history.slice(-10);
      }

      console.log('=== DeepSeek Request ===');
      console.log('User ID:', userId);
      console.log('Prompt:', prompt);
      console.log('History length:', history.length);

      const systemPrompt = `Ты - HR-бот компании. Отвечай на вопросы сотрудников, используя ТОЛЬКО предоставленную базу знаний.

      **ВАЖНО:**
      - Если пользователь просит документ (скачать, дай, бланк) - обязательно дай ссылку на файл в формате Markdown: [Название файла](ссылка)
      - Если в базе знаний есть файл - покажи его как кликабельную ссылку
      - Для общих вопросов давай инструкции

      База знаний (информация из официальных источников):
      ${context || 'Информация не найдена в базе знаний'}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.3,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const answer = response.data.choices[0].message.content;

      history.push({ role: 'assistant', content: answer });
      dialogHistory.set(userId, history);

      console.log('=== DeepSeek Response ===');
      console.log(answer.substring(0, 200) + '...');

      return answer;
    } catch (error) {
      console.error('DeepSeek API error:', error.message);
      return "Извините, сервис временно недоступен. Пожалуйста, обратитесь к HR напрямую.";
    }
  }

  clearHistory(userId) {
    dialogHistory.delete(userId);
  }
}

module.exports = new DeepSeekService();
