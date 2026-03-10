import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminTemplates.css';

interface Template {
  id: number;
  name: string;
  description: string;
  template_type: string;
  file_path: string;
  fields: string[];
  is_active: boolean;
  created_at: string;
}

const AdminTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить шаблон?')) return;
    
    try {
      await api.delete(`/admin/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      vacation: 'fa-umbrella-beach',
      sick: 'fa-thermometer-half',
      financial: 'fa-coins',
      other: 'fa-file'
    };
    return icons[type] || 'fa-file';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      vacation: 'Отпуск',
      sick: 'Больничный',
      financial: 'Мат. помощь',
      other: 'Другое'
    };
    return names[type] || type;
  };

  return (
    <div className="admin-faq">
      {/* Шапка как в AdminFaq */}
      <div className="faq-actions">
        <div className="faq-actions__left">
          <h2 className="faq-content__title">
            <i className="fas fa-file-alt"></i>
            Шаблоны документов
          </h2>
          <span className="faq-content__count">
            {templates.length} шт.
          </span>
        </div>
        <div className="faq-actions__right">
          <button 
            className="faq-button-add-btn"
            onClick={() => navigate('/admin/templates/new')}
          >
            <i className="fas fa-plus"></i>
            Загрузить шаблон
          </button>
        </div>
      </div>

      {/* Список шаблонов */}
      <div className="faq-content">
        <div className="faq-content__list">
          {loading ? (
            <div className="faq-loading">Загрузка...</div>
          ) : (
            templates.map(template => (
              <div key={template.id} className="faq-question-item">
                <div className="faq-question-item__header">
                  <span className="faq-question-item__category">
                    <i className={`fas ${getTypeIcon(template.template_type)}`}></i>
                    {getTypeName(template.template_type)}
                  </span>
                  <div className="faq-question-item__actions">
                    <span 
                      className="faq-question-item__action faq-question-item__action--edit"
                      onClick={() => navigate(`/admin/templates/edit/${template.id}`)}
                      title="Редактировать"
                    >
                      <i className="fas fa-edit"></i>
                    </span>
                    <span 
                      className="faq-question-item__action faq-question-item__action--delete"
                      onClick={() => handleDelete(template.id)}
                      title="Удалить"
                    >
                      <i className="fas fa-trash"></i>
                    </span>
                  </div>
                </div>
                
                <div className="faq-question-item__question">
                  <i className="fas fa-file-word"></i>
                  {template.name}
                  {!template.is_active && (
                    <span className="faq-button-view-item">Неактивен</span>
                  )}
                </div>
                
                <div className="faq-question-item__answer">
                  {template.description || 'Нет описания'}
                </div>

                {/* Поля шаблона */}
                {template.fields && template.fields.length > 0 && (
                  <div className="faq-buttons-view">
                    <div className="faq-buttons-view-label">
                      <i className="fas fa-tags"></i>
                      Поля для заполнения:
                    </div>
                    <div className="faq-buttons-view-list">
                      {template.fields.map(field => (
                        <span key={field} className="faq-button-view-item">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ссылка на файл */}
                <div className="faq-file-preview" style={{ marginTop: '12px' }}>
                  <div className="faq-file-preview__icon">
                    <i className="fas fa-file-word"></i>
                  </div>
                  <div className="faq-file-preview__info">
                    <div className="faq-file-preview__name">
                      {template.file_path.split('/').pop()}
                    </div>
                    <div className="faq-file-preview__size">
                      <i className="fas fa-download"></i> 
                      <a 
                        href={`/uploads/templates/${template.file_path.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--whatsapp-teal)', textDecoration: 'none' }}
                      >
                        Скачать шаблон
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTemplates;
