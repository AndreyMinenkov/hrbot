import React, { useEffect, useState } from 'react';
import { adminFaq } from '../services/api';
import FaqMindmap from '../components/FaqMindmap';
import './AdminFaq.css';

interface FaqItem {
  id: number;
  keywords: string;
  question: string | null;
  answer: string;
  category: string | null;
  file_path: string | null;
  parent_id: number | null;
  buttons: Array<{ id: number; text: string }> | null;
  created_at: string;
  hasChildren?: boolean;
}

interface Category {
  id: number;
  name: string;
  count: number;
}

interface BranchNode {
  id: number;
  keywords: string;
  question: string;
  answer: string;
  children: BranchNode[];
  isEditing?: boolean;
  isAdding?: boolean;
  newChild?: { keywords: string; question: string; answer: string; };
  buttons?: Array<{ text: string; action?: string }>;
  newButtonText?: string;
}

const AdminFaq: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<FaqItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showMindmap, setShowMindmap] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRootQuestion, setSelectedRootQuestion] = useState<FaqItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<FaqItem | null>(null);
  const [branchTree, setBranchTree] = useState<BranchNode[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newQuestionData, setNewQuestionData] = useState({
    keywords: '',
    question: '',
    answer: '',
  });

  // Загрузка категорий
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await adminFaq.getRoot();

      const catsWithCounts = await Promise.all(
        response.data.map(async (item: any) => {
          try {
            const childrenResponse = await adminFaq.getChildren(item.id);
            return {
              id: item.id,
              name: item.keywords,
              count: childrenResponse.data.length || 0
            };
          } catch (error) {
            return {
              id: item.id,
              name: item.keywords,
              count: 0
            };
          }
        })
      );

      setCategories(catsWithCounts);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка вопросов для выбранной категории
  const loadQuestions = async (categoryId: number) => {
    try {
      const response = await adminFaq.getChildren(categoryId);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  // Открыть простой редактор для вопроса без ветки
  const openEditQuestion = (question: FaqItem) => {
    setEditingQuestion(question);
    setShowEditModal(true);
  };

  // Открыть Mindmap для любого вопроса
  const openMindmap = (question: FaqItem) => {
    setSelectedRootQuestion(question);
    setShowMindmap(true);
  };

  // Выбор категории
  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    loadQuestions(category.id);
  };

  // Клик по вопросу
  const handleQuestionClick = (question: FaqItem) => {
    // Простой клик открывает редактор
    openEditQuestion(question);
  };

  // Клик по кнопке ветки
  const handleBranchClick = (e: React.MouseEvent, question: FaqItem) => {
    e.stopPropagation(); // Не даем всплыть клику до вопроса
    openMindmap(question);
  };

  // Создание категории
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const formData = new FormData();
    formData.append('keywords', newCategoryName);
    formData.append('answer', 'Категория');
    formData.append('question', '');
    formData.append('category', '');
    formData.append('parent_id', '');

    try {
      await adminFaq.create(formData);
      setNewCategoryName('');
      setShowCategoryModal(false);
      loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  // Удаление категории со всеми вопросами
  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Удалить категорию? Все вопросы в ней также будут удалены.')) return;

    try {
      await adminFaq.delete(id);
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
        setQuestions([]);
      }
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Создание родительского вопроса
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) {
      alert('Сначала выберите категорию');
      return;
    }

    const formData = new FormData();
    formData.append('keywords', newQuestionData.keywords);
    formData.append('question', newQuestionData.question);
    formData.append('answer', newQuestionData.answer);
    formData.append('category', selectedCategory.name);
    formData.append('parent_id', selectedCategory.id.toString());

    try {
      await adminFaq.create(formData);
      setNewQuestionData({ keywords: '', question: '', answer: '' });
      setShowQuestionModal(false);
      loadQuestions(selectedCategory.id);
      loadCategories();
    } catch (error) {
      console.error('Error creating question:', error);
    }
  };

  // Обновление вопроса (простой редактор)
  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const formData = new FormData();
    formData.append('keywords', editingQuestion.keywords);
    formData.append('question', editingQuestion.question || '');
    formData.append('answer', editingQuestion.answer);
    formData.append('category', editingQuestion.category || '');

    try {
      await adminFaq.update(editingQuestion.id, formData);
      setShowEditModal(false);
      setEditingQuestion(null);
      if (selectedCategory) {
        loadQuestions(selectedCategory.id);
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-faq">
      <div className="faq-admin-container" style={{ display: 'flex', height: '100%' }}>

        {/* Левая колонка - категории */}
        <div className="faq-tree" style={{ width: '300px', borderRight: '1px solid var(--border-light)' }}>
          <div className="faq-tree__header" style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="faq-tree__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-folder-tree"></i>
              <span>Категории</span>
            </div>
            <button
              className="admin-btn admin-btn--primary"
              style={{ padding: '8px 12px' }}
              onClick={() => setShowCategoryModal(true)}
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>

          <div className="faq-tree__content" style={{ padding: '8px 0', overflowY: 'auto', height: 'calc(100% - 70px)' }}>
            {categories.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ui-dark-gray)' }}>
                <i className="fas fa-folder-open" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                <p>Нет категорий</p>
                <p style={{ fontSize: '0.9rem' }}>Создайте первую категорию</p>
              </div>
            ) : (
              categories.map(cat => (
                <div
                  key={cat.id}
                  className={`tree-item__row ${selectedCategory?.id === cat.id ? 'tree-item__row--selected' : ''}`}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: selectedCategory?.id === cat.id ? 'var(--hover-bg)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }} onClick={() => handleCategoryClick(cat)}>
                    <i className="fas fa-folder" style={{ color: 'var(--whatsapp-teal)', marginRight: '12px' }}></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{cat.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ui-dark-gray)' }}>{cat.count} {cat.count === 1 ? 'вопрос' : 'вопросов'}</div>
                    </div>
                  </div>
                  <button
                    className="tree-item__menu"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <i className="fas fa-trash" style={{ color: '#d32f2f' }}></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Правая колонка - вопросы */}
        <div className="faq-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedCategory ? (
            <>
              <div className="faq-content__header" style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div className="faq-content__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-folder-open" style={{ color: 'var(--whatsapp-teal)' }}></i>
                  <span style={{ fontWeight: 600 }}>{selectedCategory.name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--ui-dark-gray)', marginLeft: '8px' }}>
                    {questions.length} {questions.length === 1 ? 'вопрос' : 'вопросов'}
                  </span>
                </div>
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={() => setShowQuestionModal(true)}
                >
                  <i className="fas fa-plus"></i> Добавить вопрос
                </button>
              </div>

              <div className="faq-content__list" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {questions.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ui-dark-gray)' }}>
                    <i className="fas fa-question-circle" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
                    <h3>Нет вопросов</h3>
                    <p>Добавьте первый вопрос в категорию "{selectedCategory.name}"</p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div 
                      key={q.id} 
                      className="faq-question-item" 
                      onClick={() => handleQuestionClick(q)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fas fa-question-circle" style={{ color: 'var(--whatsapp-teal)' }}></i>
                            {q.question}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>
                            {q.answer.length > 150 ? q.answer.substring(0, 150) + '...' : q.answer}
                          </div>
                          {q.buttons && q.buttons.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                              {q.buttons.map((btn, idx) => (
                                <span key={idx} style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  backgroundColor: 'var(--search-bg)',
                                  borderRadius: '12px',
                                  color: 'var(--whatsapp-teal)'
                                }}>
                                  {btn.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {q.hasChildren && (
                            <div 
                              style={{
                                color: 'var(--whatsapp-green)',
                                fontSize: '1.1rem'
                              }}
                            >
                              <i className="fas fa-code-branch"></i>
                            </div>
                          )}
                          <button
                            onClick={(e) => handleBranchClick(e, q)}
                            style={{
                              background: 'var(--whatsapp-teal)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: 'white',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Создать или редактировать ветку"
                          >
                            <i className="fas fa-code-branch"></i>
                            <span>Ветка</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ui-dark-gray)',
              textAlign: 'center'
            }}>
              <div>
                <i className="fas fa-arrow-left" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
                <h3>Выберите категорию</h3>
                <p>Нажмите на категорию слева, чтобы увидеть вопросы</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для создания категории */}
      {showCategoryModal && (
        <div className="faq-modal">
          <div className="faq-modal__content" style={{ maxWidth: '400px' }}>
            <div className="faq-modal__header">
              <div className="faq-modal__title">
                <i className="fas fa-folder"></i> Новая категория
              </div>
              <div className="faq-modal__close" onClick={() => setShowCategoryModal(false)}>
                <i className="fas fa-times"></i>
              </div>
            </div>
            <div className="faq-modal__body">
              <div className="faq-form-group">
                <label>Название категории</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Например: Отпуска"
                  autoFocus
                />
              </div>
              <div className="faq-form-actions" style={{ marginTop: '20px' }}>
                <button
                  className="faq-form-actions__save"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                >
                  Создать
                </button>
                <button
                  className="faq-form-actions__cancel"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для создания родительского вопроса */}
      {showQuestionModal && (
        <div className="faq-modal">
          <div className="faq-modal__content" style={{ maxWidth: '600px' }}>
            <div className="faq-modal__header">
              <div className="faq-modal__title">
                <i className="fas fa-question-circle"></i>
                Новый вопрос в категории "{selectedCategory?.name}"
              </div>
              <div className="faq-modal__close" onClick={() => setShowQuestionModal(false)}>
                <i className="fas fa-times"></i>
              </div>
            </div>

            <div className="faq-modal__body">
              <form onSubmit={handleAddQuestion} className="faq-form">
                <div className="faq-form-group">
                  <label>Ключевые слова *</label>
                  <input
                    type="text"
                    value={newQuestionData.keywords}
                    onChange={(e) => setNewQuestionData({...newQuestionData, keywords: e.target.value})}
                    placeholder="отпуск, отдых, отгул"
                    required
                  />
                </div>

                <div className="faq-form-group">
                  <label>Вопрос *</label>
                  <input
                    type="text"
                    value={newQuestionData.question}
                    onChange={(e) => setNewQuestionData({...newQuestionData, question: e.target.value})}
                    placeholder="Как оформить отпуск?"
                    required
                  />
                </div>

                <div className="faq-form-group">
                  <label>Ответ *</label>
                  <textarea
                    value={newQuestionData.answer}
                    onChange={(e) => setNewQuestionData({...newQuestionData, answer: e.target.value})}
                    rows={3}
                    required
                  />
                </div>

                <div className="faq-form-actions">
                  <button type="submit" className="faq-form-actions__save">
                    Создать
                  </button>
                  <button type="button" className="faq-form-actions__cancel" onClick={() => setShowQuestionModal(false)}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для редактирования вопроса без ветки */}
      {showEditModal && editingQuestion && (
        <div className="faq-modal">
          <div className="faq-modal__content" style={{ maxWidth: '600px' }}>
            <div className="faq-modal__header">
              <div className="faq-modal__title">
                <i className="fas fa-pen"></i>
                Редактировать вопрос
              </div>
              <div className="faq-modal__close" onClick={() => setShowEditModal(false)}>
                <i className="fas fa-times"></i>
              </div>
            </div>

            <div className="faq-modal__body">
              <form onSubmit={handleUpdateQuestion} className="faq-form">
                <div className="faq-form-group">
                  <label>Ключевые слова *</label>
                  <input
                    type="text"
                    value={editingQuestion.keywords}
                    onChange={(e) => setEditingQuestion({...editingQuestion, keywords: e.target.value})}
                    required
                  />
                </div>

                <div className="faq-form-group">
                  <label>Вопрос *</label>
                  <input
                    type="text"
                    value={editingQuestion.question || ''}
                    onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                    required
                  />
                </div>

                <div className="faq-form-group">
                  <label>Ответ *</label>
                  <textarea
                    value={editingQuestion.answer}
                    onChange={(e) => setEditingQuestion({...editingQuestion, answer: e.target.value})}
                    rows={3}
                    required
                  />
                </div>

                <div className="faq-form-actions">
                  <button type="submit" className="faq-form-actions__save">
                    Сохранить
                  </button>
                  <button type="button" className="faq-form-actions__cancel" onClick={() => setShowEditModal(false)}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mindmap */}
      {showMindmap && selectedRootQuestion && (
        <div className="faq-modal" style={{ padding: 0, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div style={{ width: '90vw', height: '90vh', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
            <FaqMindmap 
              rootId={selectedRootQuestion.id} 
              rootQuestion={selectedRootQuestion.question || ''} 
              onClose={() => setShowMindmap(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaq;
