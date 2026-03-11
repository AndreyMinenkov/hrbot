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
          LEFT JOIN documents d ON f.file_path = d.file_path
          WHERE f.embedding IS NOT NULL
            AND f.file_path IS NOT NULL
            AND (f.organization_id IS NULL OR f.organization_id = $2)
          ORDER BY f.embedding <=> $1
          LIMIT 1
        `;
        params = [JSON.stringify(queryEmbedding), userOrgId];
        console.log('Searching for documents only with organization filter');
      } else {
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
            AND (organization_id IS NULL OR organization_id = $2)
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

      result.rows.forEach(row => {
        if (queryType === 'document') {
          console.log(`FAQ ID: ${row.faq_id}, Doc ID: ${row.doc_id}, Similarity: ${Math.round(row.similarity * 100)}%`);
        } else {
          console.log(`ID: ${row.id}, Similarity: ${Math.round(row.similarity * 100)}%`);
        }
      });

      return result.rows.map((row, index) => {
        if (queryType === 'document') {
          let fileInfo = row.doc_id ? `\n[Скачать файл](/api/documents/download/${row.doc_id})` : '';
          return `[Документ ${index + 1} (ID: ${row.faq_id}, схожесть: ${Math.round(row.similarity * 100)}%)]
Категория: ${row.category || 'Общая'}
${row.question ? `Вопрос: ${row.question}` : ''}
Ответ: ${row.answer}${fileInfo}`;
        } else {
          let fileInfo = row.file_path ? `\n[Скачать файл](/uploads/templates/${row.file_path.split('/').pop()})` : '';
          return `[Документ ${index + 1} (ID: ${row.id}, схожесть: ${Math.round(row.similarity * 100)}%)]
Категория: ${row.category || 'Общая'}
${row.question ? `Вопрос: ${row.question}` : ''}
Ответ: ${row.answer}${fileInfo}`;
        }
      }).join('\n\n---\n\n');

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

      const words = query.split(' ').filter(word => word.length > 2);
      let params = [`%${query}%`, `${query}%`];
      let wordConditions = '';

      if (words.length > 0) {
        wordConditions = words.map((word, i) =>
          `(keywords ILIKE $${i+3} OR question ILIKE $${i+3} OR answer ILIKE $${i+3})`
        ).join(' OR ');
        words.forEach(word => params.push(`%${word}%`));
      }

      const fileCondition = queryType === 'document' ? ' AND f.file_path IS NOT NULL' : '';
      const orgCondition = userOrgId ? ' AND (f.organization_id IS NULL OR f.organization_id = $' + (params.length + 1) + ')' : '';

      let sql = `
        SELECT f.id, f.question, f.answer, f.category, f.keywords, f.file_path, d.id as doc_id
        FROM faq f
        LEFT JOIN documents d ON f.file_path = d.file_path
        WHERE (keywords ILIKE $1
           OR question ILIKE $1
           OR answer ILIKE $1
           OR category ILIKE $1
           ${wordConditions ? ` OR ${wordConditions}` : ''})
           ${fileCondition}
           ${orgCondition}
        ORDER BY
          CASE
            WHEN question ILIKE $2 THEN 1
            WHEN keywords ILIKE $2 THEN 2
            ELSE 3
          END
        LIMIT 15
      `;

      if (userOrgId) {
        params.push(userOrgId);
      }

      const result = await pool.query(sql, params);

      console.log(`Found ${result.rows.length} records via legacy search`);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows.map((row, index) => {
        let fileInfo = '';
        if (row.doc_id) {
          fileInfo = `\n[Скачать файл](/api/documents/download/${row.doc_id})`;
        } else if (row.file_path) {
          fileInfo = `\n[Скачать файл](/uploads/templates/${row.file_path.split('/').pop()})`;
        }
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
      - Если документ не найден для организации пользователя, сообщи что документа нет
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
