import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
}

const AdminTemplateForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    template_type: 'vacation',
    fields: [],
    is_active: true
  });
  const [file, setFile] = useState<File | null>(null);
  const [fieldInput, setFieldInput] = useState('');
  const [fields, setFields] = useState<string[]>([]);

  useEffect(() => {
    if (isEdit) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/templates/${id}`);
      setTemplate(response.data);
      setFields(response.data.fields || []);
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (fieldInput.trim() && !fields.includes(fieldInput.trim())) {
      setFields([...fields, fieldInput.trim()]);
      setFieldInput('');
    }
  };

  const handleRemoveField = (fieldToRemove: string) => {
    setFields(fields.filter(f => f !== fieldToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append('name', template.name || '');
    formData.append('description', template.description || '');
    formData.append('template_type', template.template_type || 'vacation');
    formData.append('fields', JSON.stringify(fields));
    formData.append('is_active', String(template.is_active));
    
    if (file) {
      formData.append('file', file);
    }

    try {
      if (isEdit) {
        await api.put(`/admin/templates/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/admin/templates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      navigate('/admin/templates');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="faq-loading">Загрузка...</div>;
  }

  return (
    <div className="admin-faq">
      <div className="faq-actions">
        <div className="faq-actions__left">
          <h2 className="faq-content__title">
            <i className="fas fa-file-alt"></i>
            {isEdit ? 'Редактировать шаблон' : 'Новый шаблон'}
          </h2>
        </div>
      </div>

      <div className="faq-content">
        <div className="faq-content__list" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} className="faq-form">
            {/* Название */}
            <div className="faq-form-group">
              <label>
                <i className="fas fa-heading"></i>
                Название шаблона
              </label>
              <input
                type="text"
                value={template.name}
                onChange={e => setTemplate({...template, name: e.target.value})}
                placeholder="Например: Заявление на отпуск"
                required
              />
            </div>

            {/* Тип документа */}
            <div className="faq-form-group">
              <label>
                <i className="fas fa-tag"></i>
                Тип документа
              </label>
              <select
                value={template.template_type}
                onChange={e => setTemplate({...template, template_type: e.target.value})}
              >
                <option value="vacation">Отпуск</option>
                <option value="sick">Больничный</option>
                <option value="financial">Мат. помощь</option>
                <option value="other">Другое</option>
              </select>
            </div>

            {/* Описание */}
            <div className="faq-form-group">
              <label>
                <i className="fas fa-align-left"></i>
                Описание
              </label>
              <textarea
                value={template.description}
                onChange={e => setTemplate({...template, description: e.target.value})}
                placeholder="Краткое описание шаблона"
                rows={3}
              />
            </div>

            {/* Загрузка файла */}
            <div className="faq-form-group">
              <label>
                <i className="fas fa-upload"></i>
                Файл шаблона {!isEdit && '(обязательно)'}
              </label>
              {!file && template.file_path && (
                <div className="faq-file-preview" style={{ marginBottom: '12px' }}>
                  <div className="faq-file-preview__icon">
                    <i className="fas fa-file-word"></i>
                  </div>
                  <div className="faq-file-preview__info">
                    <div className="faq-file-preview__name">
                      {template.file_path.split('/').pop()}
                    </div>
                    <div className="faq-file-preview__size">
                      <i className="fas fa-check" style={{ color: 'var(--whatsapp-teal)' }}></i>
                      Текущий файл
                    </div>
                  </div>
                </div>
              )}
              <div className="faq-file-upload">
                <input
                  type="file"
                  id="file-upload"
                  accept=".docx,.txt"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Нажмите для выбора файла</span>
                  <small>.docx или .txt, макс. 5MB</small>
                </label>
              </div>
              {file && (
                <div className="faq-file-preview" style={{ marginTop: '12px' }}>
                  <div className="faq-file-preview__icon">
                    <i className="fas fa-file-word"></i>
                  </div>
                  <div className="faq-file-preview__info">
                    <div className="faq-file-preview__name">{file.name}</div>
                    <div className="faq-file-preview__size">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <div 
                    className="faq-file-preview__remove"
                    onClick={() => setFile(null)}
                    title="Удалить"
                  >
                    <i className="fas fa-times"></i>
                  </div>
                </div>
              )}
            </div>

            {/* Поля для заполнения */}
            <div className="faq-buttons-section">
              <div className="faq-buttons-title">
                <i className="fas fa-tags"></i>
                Поля для заполнения
              </div>
              <div className="faq-buttons-list">
                {fields.map(field => (
                  <span key={field} className="faq-button-chip">
                    {field}
                    <span 
                      className="faq-button-chip__remove"
                      onClick={() => handleRemoveField(field)}
                    >
                      <i className="fas fa-times"></i>
                    </span>
                  </span>
                ))}
                {fields.length === 0 && (
                  <div className="faq-buttons-empty">
                    Поля не добавлены
                  </div>
                )}
              </div>
              <div className="faq-button-add">
                <input
                  type="text"
                  className="faq-button-input"
                  value={fieldInput}
                  onChange={e => setFieldInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddField()}
                  placeholder="Название поля, например: FULL_NAME"
                />
                <button
                  type="button"
                  className="faq-button-add-btn"
                  onClick={handleAddField}
                >
                  <i className="fas fa-plus"></i>
                  Добавить
                </button>
              </div>
              <span className="faq-button-hint">
                Поля в шаблоне должны быть в формате {'{FULL_NAME}'}
              </span>
            </div>

            {/* Активность */}
            <div className="faq-type-toggle" style={{ width: '200px' }}>
              <div
                className={`faq-type-option ${template.is_active ? 'faq-type-option--selected' : ''}`}
                onClick={() => setTemplate({...template, is_active: true})}
              >
                <i className="fas fa-check-circle"></i>
                Активен
              </div>
              <div
                className={`faq-type-option ${!template.is_active ? 'faq-type-option--selected' : ''}`}
                onClick={() => setTemplate({...template, is_active: false})}
              >
                <i className="fas fa-ban"></i>
                Неактивен
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="faq-form-actions">
              <button
                type="button"
                className="faq-form-actions__cancel"
                onClick={() => navigate('/admin/templates')}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="faq-form-actions__save"
                disabled={saving || (!isEdit && !file)}
              >
                {saving ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminTemplateForm;
