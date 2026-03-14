const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Подключаем роуты
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const faqRoutes = require('./routes/faqRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/stats', statsRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'HR-бот API работает',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      employee: 'GET /api/employee/data',
      faq: {
        search: 'GET /api/faq/search?query=...',
        categories: 'GET /api/faq/categories'
      },
      documents: {
        categories: 'GET /api/documents/categories',
        byCategory: 'GET /api/documents/category/:category',
        download: 'GET /api/documents/download/:id',
        admin: 'GET /api/documents/admin/all'
      },
      stats: {
        admin: 'GET /api/stats/admin',
        chat: 'POST /api/stats/chat/save'
      },
      admin: {
        faq: 'GET /api/admin/faq',
        users: 'GET /api/admin/users'
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT} (доступен извне)`);
});

// Подключаем роуты организаций
const organizationRoutes = require('./routes/organizationRoutes');
app.use('/api/organizations', organizationRoutes);

// Подключаем роуты профиля
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/profile', profileRoutes);

// Подключаем роуты для шаблонов документов
const adminTemplateRoutes = require('./routes/adminTemplateRoutes');
const documentGenerateRoutes = require('./routes/documentGenerateRoutes');

app.use('/api/admin/templates', adminTemplateRoutes);
app.use('/api/documents/generate', documentGenerateRoutes);

console.log('=== Routes initialized ===');
console.log('- Admin templates: /api/admin/templates');
console.log('- Document generation: /api/documents/generate');

// Подключаем AI роуты
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);
console.log('- AI analysis: /api/ai/analyze-document');

// Подключаем роуты чата
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);
console.log('- Chat history: /api/chat/history, /api/chat/save');

// Подключаем роуты для загрузки документов с авто-наполнением базы знаний
const documentUploadRoutes = require('./routes/documentUploadRoutes');
app.use('/api/documents/admin', documentUploadRoutes);
console.log('- Document upload with auto-knowledge: /api/documents/admin/upload, /api/documents/admin/bulk-upload, /api/documents/admin/status/:id');

// Подключаем роут для поиска по документам
const documentSearchRoutes = require('./routes/documentSearchRoutes');
app.use('/api/documents/search', documentSearchRoutes);
console.log('- Document semantic search: /api/documents/search');
