const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function getEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/embeddings',
      {
        model: 'deepseek-embedding',
        input: text.substring(0, 8000) // Обрезаем длинные тексты
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    return null;
  }
}

async function generateEmbeddings() {
  console.log('Начинаем генерацию эмбеддингов...');
  
  // Получаем записи без эмбеддингов
  const faqs = await pool.query(
    "SELECT id, question, answer FROM faq WHERE embedding IS NULL"
  );
  
  console.log(`Найдено ${faqs.rows.length} записей для обработки`);
  
  for (const [index, faq] of faqs.rows.entries()) {
    console.log(`\n[${index + 1}/${faqs.rows.length}] Обработка ID ${faq.id}...`);
    
    const text = `${faq.question || ''} ${faq.answer || ''}`.trim();
    if (!text) {
      console.log('  Пропуск: пустой текст');
      continue;
    }
    
    const embedding = await getEmbedding(text);
    if (embedding) {
      await pool.query(
        'UPDATE faq SET embedding = $1 WHERE id = $2',
        [JSON.stringify(embedding), faq.id]
      );
      console.log('  ✓ Эмбеддинг сохранен');
    } else {
      console.log('  ✗ Ошибка получения эмбеддинга');
    }
    
    // Небольшая задержка, чтобы не превысить лимиты API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\nГенерация завершена!');
  await pool.end();
}

generateEmbeddings().catch(console.error);
