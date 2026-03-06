import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { faq, adminFaq } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './FAQ.css';

interface FaqItem {
  id: number;
  keywords: string;
  question: string;
  answer: string;
  category: string;
  file_path: string | null;
}

interface Category {
  id: number;
  name: string;
  icon?: string;
  count?: number;
}

const FAQ: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FaqItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [categoryQuestions, setCategoryQuestions] = useState<FaqItem[]>([]);

  // Загрузка категорий с бэкенда
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await faq.getCategories();
        // Добавляем иконки к категориям на основе названия
        const categoriesWithIcons = response.data.map((cat: string, index: number) => ({
          id: index + 1,
          name: cat,
          icon: getIconForCategory(cat),
          count: 5 + Math.floor(Math.random() * 10) // Это можно убрать, если count приходит с API
        }));
        setCategories(categoriesWithIcons);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const getIconForCategory = (category: string): string => {
    const icons: Record<string, string> = {
      'Отпуск': 'umbrella-beach',
      'Больничный': 'hospital',
      'Зарплата': 'money-bill-wave',
      'Документы': 'file-alt',
      'График работы': 'clock',
      'Обучение': 'graduation-cap',
      'Кадровые вопросы': 'user-tie',
      'Соцпакет': 'gift',
      'Командировки': 'plane',
      'Пенсия': 'user-clock'
    };
    return icons[category] || 'folder';
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      setSearchMode(true);
      handleSearch(q);
    }
  }, [location]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchMode(true);
    setActiveCategory(null);

    try {
      const response = await faq.search(searchQuery);
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: string) => {
    setActiveCategory(category);
    setSearchMode(false);
    setSelectedItem(null);
    // Здесь нужно загрузить вопросы категории через API
    // Пока используем моковые данные для демонстрации
    const mockQuestions: FaqItem[] = [
      {
        id: 1,
        question: 'Как оформить отпуск?',
        answer: 'Для оформления отпуска необходимо написать заявление на имя руководителя за 14 дней до предполагаемой даты отпуска. Заявление можно подать через HR-портал или лично в отделе кадров.',
        category: category,
        keywords: 'отпуск, заявление, отдых',
        file_path: null
      },
      {
        id: 2,
        question: 'Сколько дней отпуска положено?',
        answer: 'Стандартный отпуск составляет 28 календарных дней. Для некоторых категорий сотрудников предусмотрен удлиненный отпуск.',
        category: category,
        keywords: 'отпуск, дни, количество',
        file_path: null
      },
      {
        id: 3,
        question: 'Можно ли разделить отпуск на части?',
        answer: 'Да, отпуск можно разделить на части. При этом одна из частей должна быть не менее 14 календарных дней.',
        category: category,
        keywords: 'отпуск, части, разделение',
        file_path: null
      }
    ];
    setCategoryQuestions(mockQuestions);
  };

  const handleQuestionClick = (item: FaqItem) => {
    setSelectedItem(item);
  };

  const handleEditQuestion = (item: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем переход к просмотру
    // Здесь будет переход на страницу редактирования в админке
    navigate('/admin/faq');
  };

  const handleDeleteQuestion = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем переход к просмотру
    
    if (!window.confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      return;
    }
    
    try {
      // Здесь будет вызов API для удаления
      // await adminFaq.delete(id);
      alert('Вопрос удален (тест)');
      // Обновляем список вопросов
      setCategoryQuestions(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Ошибка при удалении вопроса');
    }
  };

  const handleBack = () => {
    if (selectedItem) {
      setSelectedItem(null);
    } else if (searchMode) {
      setSearchMode(false);
      setQuery('');
      setResults([]);
    } else if (activeCategory) {
      setActiveCategory(null);
    }
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Если выбран конкретный вопрос - показываем детальный просмотр
  if (selectedItem) {
    return (
      <div className="faq-page">
        <div className="faq-header">
          <div className="faq-header__back" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="faq-header__title">HR Бот</div>
          <div className="faq-header__search">
            <i className="fas fa-search" onClick={() => setSearchMode(true)}></i>
          </div>
        </div>

        <div className="faq-detail">
          <div className="faq-message">
            <div className="faq-message__title">{selectedItem.question}</div>
            <div className="faq-message__content">
              <p>{selectedItem.answer}</p>
              {selectedItem.file_path && (
                <a
                  href={`http://31.130.155.16:5001${selectedItem.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '12px',
                    color: 'var(--whatsapp-teal)',
                    textDecoration: 'none'
                  }}
                >
                  <i className="fas fa-paperclip"></i> Скачать бланк
                </a>
              )}
            </div>
            <div className="faq-message__footer">
              <span>{formatTime()}</span>
              <i className="fas fa-star"></i>
              <i className="fas fa-share"></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Если режим поиска - показываем результаты
  if (searchMode) {
    return (
      <div className="faq-page">
        <div className="faq-header">
          <div className="faq-header__back" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="faq-header__title">Поиск</div>
          <div className="faq-header__search">
            <i className="fas fa-search"></i>
          </div>
        </div>

        <div className="faq-search">
          <div className="faq-search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Поиск..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
              autoFocus
            />
          </div>
        </div>

        <div className="search-results">
          {loading ? (
            <div className="faq-empty">
              <i className="fas fa-spinner fa-spin"></i>
              <h3>Поиск...</h3>
            </div>
          ) : results.length === 0 ? (
            <div className="faq-empty">
              <i className="fas fa-search"></i>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить запрос</p>
            </div>
          ) : (
            results.map(item => (
              <div
                key={item.id}
                className="search-result-item"
                onClick={() => handleQuestionClick(item)}
              >
                <div className="search-result-item__category">{item.category}</div>
                <div className="search-result-item__question">{item.question}</div>
                <div className="search-result-item__answer-preview">{item.answer}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Если выбрана категория - показываем вопросы категории с кнопками для админа
  if (activeCategory) {
    return (
      <div className="faq-page">
        <div className="faq-header">
          <div className="faq-header__back" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="faq-header__title">{activeCategory}</div>
          <div className="faq-header__search">
            <i className="fas fa-search" onClick={() => setSearchMode(true)}></i>
          </div>
        </div>

        <div className="faq-questions">
          {categoryQuestions.map(item => (
            <div key={item.id} className="faq-question-item">
              <div className="faq-question-item__header">
                <div className="faq-question-item__category">{item.category}</div>
                {isAdmin() && (
                  <div className="faq-question-item__actions">
                    <div 
                      className="faq-question-item__action faq-question-item__action--edit" 
                      onClick={(e) => handleEditQuestion(item, e)}
                      title="Редактировать"
                    >
                      <i className="fas fa-pen"></i>
                    </div>
                    <div 
                      className="faq-question-item__action faq-question-item__action--delete" 
                      onClick={(e) => handleDeleteQuestion(item.id, e)}
                      title="Удалить"
                    >
                      <i className="fas fa-trash"></i>
                    </div>
                  </div>
                )}
              </div>
              <div 
                className="faq-question-item__question"
                onClick={() => handleQuestionClick(item)}
              >
                <i className="fas fa-question-circle"></i>
                {item.question}
              </div>
              <div 
                className="faq-question-item__answer"
                onClick={() => handleQuestionClick(item)}
              >
                {item.answer.length > 100 ? item.answer.substring(0, 100) + '...' : item.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Главная страница FAQ с категориями из API
  return (
    <div className="faq-page">
      <div className="faq-header">
        <div className="faq-header__back" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </div>
        <div className="faq-header__title">База знаний</div>
        <div className="faq-header__search">
          <i className="fas fa-search" onClick={() => setSearchMode(true)}></i>
        </div>
      </div>

      <div className="faq-search">
        <div className="faq-search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Поиск..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(query)}
          />
        </div>
      </div>

      <div className="faq-categories">
        {categoriesLoading ? (
          <div className="faq-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Загрузка категорий...</h3>
          </div>
        ) : categories.length === 0 ? (
          <div className="faq-empty">
            <i className="fas fa-folder-open"></i>
            <h3>Нет категорий</h3>
            <p>База знаний пока пуста</p>
          </div>
        ) : (
          categories.map(cat => (
            <div
              key={cat.id}
              className="faq-category"
              onClick={() => handleCategoryClick(cat.name)}
            >
              <div className="faq-category__icon">
                <i className={`fas fa-${cat.icon}`}></i>
              </div>
              <div className="faq-category__info">
                <div className="faq-category__name">{cat.name}</div>
                <div className="faq-category__count">
                  <i className="fas fa-file-alt"></i>
                  {cat.count || 0} статей
                </div>
              </div>
              <div className="faq-category__arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FAQ;
