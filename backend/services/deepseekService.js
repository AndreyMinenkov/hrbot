const axios = require('axios');
const pool = require('../config/db');

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

  detectQueryType(query) {
    const docKeywords = [
      'дай', 'скачать', 'бланк', 'шаблон', 'форму', 'заявление',
      'doc', 'docx', 'файл', 'документ', 'образец', 'скача'
    ];

    const lowerQuery = query.toLowerCase();
    const hasDocIntent = docKeywords.some(keyword => lowerQuery.includes(keyword));

    return hasDocIntent ? 'document' : 'question';
  }

  async findRelevantContext(query, pool, userId) {
    try {
      const queryType = this.detectQueryType(query);
      console.log('=== Semantic search with embeddings ===');
      console.log('Query:', query);
      console.log('Query type:', queryType);
      console.log('User ID:', userId);

      // Получаем организацию пользователя
      const userResult = await pool.query(
        'SELECT organization_id FROM users WHERE id = $1',
        [userId]
      );
      const userOrgId = userResult.rows[0]?.organization_id || null;
      console.log('User organization:', userOrgId);

      const queryEmbedding = await this.getEmbedding(query);

      if (!queryEmbedding) {
        console.log('Embedding failed, falling back to legacy search');
        return this.findRelevantContextLegacy(query, pool, queryType, userOrgId);
      }

      let sql;
      let params;

      if (queryType === 'document') {
        sql = `
          SELECT
            f.id as faq_id,
            f.question,
            f.answer,
            f.category,
            f.keywords,
            f.file_path,
            d.id as doc_id,
            d.title as doc_title,
            1 - (f.embedding <=> $1) as similarity
          FROM faq f
          LEFT JOIN documents d ON f.document_id = d.id
          WHERE f.embedding IS NOT NULL
            AND f.document_id IS NOT NULL
            AND (f.organization_id IS NULL OR f.organization_id = $2)
          ORDER BY f.embedding <=> $1
          LIMIT 3
        `;
        params = [JSON.stringify(queryEmbedding), userOrgId];
        console.log('Searching for documents with organization filter');
      } else {
        sql = `
          SELECT
            id,
            question,
            answer,
            category,
            keywords,
            file_path,
            document_id,
            1 - (embedding <=> $1) as similarity
          FROM faq
          WHERE embedding IS NOT NULL
            AND (organization_id IS NULL OR organization_id = $2)
            AND parent_id IS NOT NULL
          ORDER BY embedding <=> $1
          LIMIT 10
        `;
        params = [JSON.stringify(queryEmbedding), userOrgId];
        console.log('Searching for all FAQs with organization filter');
      }

      const result = await pool.query(sql, params);

      console.log(`Found ${result.rows.length} records via semantic search`);

      if (result.rows.length === 0) {
        return this.findRelevantContextLegacy(query, pool, queryType, userOrgId);
      }

      // Формируем контекст для DeepSeek
      let contextText = 'Найденная информация из базы знаний:\n\n';
      
      result.rows.forEach((row, index) => {
        contextText += `[ИСТОЧНИК ${index + 1}]\n`;
        contextText += `Категория: ${row.category || 'Общая'}\n`;
        if (row.question) contextText += `Вопрос: ${row.question}\n`;
        contextText += `Ответ: ${row.answer}\n`;
        
        // Добавляем информацию о файле, если есть
        if (row.document_id) {
          contextText += `Связанный файл: /api/documents/download/${row.document_id}\n`;
        }
        contextText += '\n';
      });

      return contextText;

    } catch (error) {
      console.error('Error in semantic search:', error);
      return this.findRelevantContextLegacy(query, pool, 'question', null);
    }
  }

  async findRelevantContextLegacy(query, pool, queryType = 'question', userOrgId = null) {
    try {
      console.log('=== Legacy keyword search ===');
      console.log('Query:', query);
      console.log('Query type:', queryType);
      console.log('User organization:', userOrgId);

      // 1. Ищем в FAQ (только вопросы, не категории)
      const words = query.split(' ').filter(word => word.length > 2);
      let params = [`%${query}%`, `${query}%`];
      let wordConditions = '';

      if (words.length > 0) {
        wordConditions = words.map((word, i) =>
          `(f.keywords ILIKE $${i+3} OR f.question ILIKE $${i+3} OR f.answer ILIKE $${i+3})`
        ).join(' OR ');
        words.forEach(word => params.push(`%${word}%`));
      }

      const orgCondition = userOrgId ? ' AND (f.organization_id IS NULL OR f.organization_id = $' + (params.length + 1) + ')' : '';

      let sql = `
        SELECT f.id, f.question, f.answer, f.category, f.keywords, f.document_id
        FROM faq f
        WHERE parent_id IS NOT NULL
          AND (f.keywords ILIKE $1
           OR f.question ILIKE $1
           OR f.answer ILIKE $1
           OR f.category ILIKE $1
           ${wordConditions ? ` OR ${wordConditions}` : ''})
           ${orgCondition}
        ORDER BY
          CASE
            WHEN f.question ILIKE $2 THEN 1
            WHEN f.keywords ILIKE $2 THEN 2
            ELSE 3
          END
        LIMIT 5
      `;

      if (userOrgId) {
        params.push(userOrgId);
      }

      const faqResult = await pool.query(sql, params);
      console.log(`Found ${faqResult.rows.length} FAQ records`);

      // 2. Формируем контекст
      let contextText = '';
      
      if (faqResult.rows.length > 0) {
        contextText = 'Найденная информация из базы знаний:\n\n';
        faqResult.rows.forEach((faq, index) => {
          contextText += `[ИСТОЧНИК ${index + 1}]\n`;
          contextText += `Категория: ${faq.category || 'Общая'}\n`;
          contextText += `Вопрос: ${faq.question}\n`;
          contextText += `Ответ: ${faq.answer}\n`;
          if (faq.document_id) {
            contextText += `Ссылка на документ: /api/documents/download/${faq.document_id}\n`;
          }
          contextText += '\n';
        });
      }

      // 3. Ищем документы напрямую в таблице documents
      const searchTerms = words.length > 0 ? words : ['отпуск', 'заявление', 'больничный', 'документ'];
      const termConditions = searchTerms.map((_, i) => `title ILIKE $${i+1}`).join(' OR ');
      const docParams = searchTerms.map(term => `%${term}%`);
      
      const docsResult = await pool.query(
        `SELECT id, title, category FROM documents
         WHERE ${termConditions}
           AND (organization_id = $${searchTerms.length + 1} OR organization_id IS NULL)
         LIMIT 5`,
        [...docParams, userOrgId]
      );
      
      console.log(`Found ${docsResult.rows.length} documents in database`);
      
      if (docsResult.rows.length > 0) {
        contextText += '\n📁 ДОСТУПНЫЕ ДОКУМЕНТЫ ДЛЯ СКАЧИВАНИЯ:\n';
        docsResult.rows.forEach(doc => {
          contextText += `- [${doc.title}](/api/documents/download/${doc.id}) (${doc.category || 'Общие'})\n`;
        });
      }

      return contextText || 'Информация не найдена в базе знаний';

    } catch (error) {
      console.error('Error finding context:', error);
      return 'Информация не найдена в базе знаний';
    }
  }

  async ask(userId, prompt, context = '') {
    try {
      console.log('=== DEEPSEEK_API_KEY used:', this.apiKey ? this.apiKey.substring(0,10) + '...' : 'undefined');
      console.log('Context length:', context ? context.length : 0);
      console.log('Context preview:', context ? context.substring(0, 200) : 'empty');

      let history = dialogHistory.get(userId) || [];
      
      history.push({ role: 'user', content: prompt });

      if (history.length > 10) {
        history = history.slice(-10);
      }

      console.log('=== DeepSeek Request ===');
      console.log('User ID:', userId);
      console.log('Prompt:', prompt);
      console.log('History length:', history.length);

      const systemPrompt = `Ты - дружелюбный HR-бот компании. Общайся с сотрудниками естественно и тепло.

**ВАЖНО:**
- Отвечай как живой человек, а не как робот
- Используй информацию из базы знаний, но формулируй своими словами
- **НИКОГДА НЕ ВЫДУМЫВАЙ ССЫЛКИ НА ДОКУМЕНТЫ** - используй ТОЛЬКО ссылки из раздела "ДОСТУПНЫЕ ДОКУМЕНТЫ"
- Если в разделе "ДОСТУПНЫЕ ДОКУМЕНТЫ" есть ссылки - обязательно предложи их скачать
- Ссылки давай в формате: [Название документа](/api/documents/download/ID)
- Если информации в базе знаний нет - предложи обратиться к HR-специалисту
- Можешь задавать уточняющие вопросы
- Будь кратким, но дружелюбным

База знаний (используй эту информацию для ответов):
${context}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
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
