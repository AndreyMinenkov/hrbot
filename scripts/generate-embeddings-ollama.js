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

async function getEmbeddingOllama(text) {
  try {
    const response = await axios.post(
      'http://localhost:11434/api/embeddings',
      {
        model: 'bge-m3',
        prompt: text.substring(0, 8000)
      },
      {
        timeout: 30000
      }
    );
    return response.data.embedding;
  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    return null;
  }
}

async function generateEmbeddings() {
  console.log('Начинаем генерацию эмбеддингов через Ollama (bge-m3)...');

  // Получаем все записи из faq
  const faqs = await pool.query(
    "SELECT id, question, answer FROM faq"
  );

  console.log(`Найдено ${faqs.rows.length} записей для обработки`);

  let successCount = 0;
  let errorCount = 0;

  for (const [index, faq] of faqs.rows.entries()) {
    console.log(`\n[${index + 1}/${faqs.rows.length}] Обработка ID ${faq.id}...`);

    const text = `${faq.question || ''} ${faq.answer || ''}`.trim();
    if (!text) {
      console.log('  Пропуск: пустой текст');
      continue;
    }

    const embedding = await getEmbeddingOllama(text);
    if (embedding) {
      await pool.query(
        'UPDATE faq SET embedding = $1 WHERE id = $2',
        [JSON.stringify(embedding), faq.id]
      );
      console.log('  ✓ Эмбеддинг сохранен');
      successCount++;
    } else {
      console.log('  ✗ Ошибка получения эмбеддинга');
      errorCount++;
    }

    // Небольшая задержка, чтобы не нагружать сервер
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n=== Генерация завершена ===');
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📊 Всего обработано: ${faqs.rows.length}`);
  
  await pool.end();
}

generateEmbeddings().catch(console.error);
