import React, { useEffect, useState } from 'react';
import { documents } from '../services/api';
import './Documents.css';

interface Document {
  id: number;
  title: string;
  category: string;
  file_path: string;
  file_size: number;
  downloads_count: number;
  file_type?: string;
  created_at?: string;
}

const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('docs');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadDocuments(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await documents.getCategories();
      setCategories(response.data);
      if (response.data.length > 0) {
        setSelectedCategory(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (category: string) => {
    try {
      const response = await documents.getByCategory(category);
      setDocs(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleDownload = async (id: number, title: string) => {
    try {
      const response = await documents.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) return 'file-pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'file-word';
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'file-excel';
    if (filename.endsWith('.jpg') || filename.endsWith('.png')) return 'file-image';
    return 'file-alt';
  };

  const getFileIconClass = (filename: string) => {
    if (filename.endsWith('.pdf')) return 'document-item__icon--pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'document-item__icon--word';
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'document-item__icon--excel';
    if (filename.endsWith('.jpg') || filename.endsWith('.png')) return 'document-item__icon--image';
    return '';
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="documents-page">
      {/* Шапка */}
      <div className="documents-header">
        <div className="documents-header__back" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left"></i>
        </div>
        <div className="documents-header__title">Документы</div>
        <div className="documents-header__search">
          <i className="fas fa-search"></i>
        </div>
      </div>

      {/* Вкладки медиа/документы/ссылки */}
      <div className="documents-tabs">
        <div 
          className={`documents-tab ${activeTab === 'media' ? 'documents-tab--active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Медиа
        </div>
        <div 
          className={`documents-tab ${activeTab === 'docs' ? 'documents-tab--active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          Документы
        </div>
        <div 
          className={`documents-tab ${activeTab === 'links' ? 'documents-tab--active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          Ссылки
        </div>
      </div>

      {/* Категории документов (для вкладки Документы) */}
      {activeTab === 'docs' && (
        <div className="documents-categories">
          {categories.map(cat => (
            <div 
              key={cat} 
              className="document-category"
              onClick={() => setSelectedCategory(cat)}
            >
              <div className="document-category__icon document-category__icon--folder">
                <i className="fas fa-folder"></i>
              </div>
              <div className="document-category__info">
                <div className="document-category__name">{cat}</div>
                <div className="document-category__count">
                  <i className="fas fa-file"></i>
                  {/* Здесь должно быть реальное количество */}
                  12 файлов
                </div>
              </div>
              <div className="document-category__arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сетка медиафайлов */}
      {activeTab === 'media' && (
        <div className="documents-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="document-grid-item">
              <img src={`https://picsum.photos/200/200?random=${i}`} alt="media" />
              <div className="document-grid-item__overlay">
                <i className="fas fa-play-circle"></i> 
                <span>Видео {i}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Список документов */}
      {activeTab === 'docs' && selectedCategory && (
        <div className="documents-list">
          {docs.length === 0 ? (
            <div className="documents-empty">
              <i className="fas fa-folder-open"></i>
              <h3>Нет документов</h3>
              <p>В этой категории пока нет файлов</p>
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="document-item">
                <div className={`document-item__icon ${getFileIconClass(doc.title)}`}>
                  <i className={`fas fa-${getFileIcon(doc.title)}`}></i>
                </div>
                <div className="document-item__info">
                  <div className="document-item__name">{doc.title}</div>
                  <div className="document-item__meta">
                    <span className="document-item__size">
                      <i className="fas fa-weight-hanging"></i>
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span className="document-item__date">
                      <i className="fas fa-calendar"></i>
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div 
                  className="document-item__download"
                  onClick={() => handleDownload(doc.id, doc.title)}
                >
                  <i className="fas fa-download"></i>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ссылки */}
      {activeTab === 'links' && (
        <div className="links-list">
          <div className="link-item">
            <div className="link-item__icon">
              <i className="fas fa-link"></i>
            </div>
            <div className="link-item__info">
              <div className="link-item__title">Портал сотрудника</div>
              <div className="link-item__url">https://portal.s-int.ru</div>
              <div className="link-item__meta">
                <span>Добавлено: 01.03.2026</span>
              </div>
            </div>
            <div className="link-item__arrow">
              <i className="fas fa-external-link-alt"></i>
            </div>
          </div>
          <div className="link-item">
            <div className="link-item__icon">
              <i className="fas fa-link"></i>
            </div>
            <div className="link-item__info">
              <div className="link-item__title">HR-портал</div>
              <div className="link-item__url">https://hr.s-int.ru</div>
              <div className="link-item__meta">
                <span>Добавлено: 28.02.2026</span>
              </div>
            </div>
            <div className="link-item__arrow">
              <i className="fas fa-external-link-alt"></i>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предпросмотра */}
      {previewDocument && (
        <div className="document-preview-modal">
          <div className="preview-header">
            <div className="preview-header__left">
              <div className="preview-header__back" onClick={() => setPreviewDocument(null)}>
                <i className="fas fa-arrow-left"></i>
              </div>
              <div className="preview-header__title">{previewDocument.title}</div>
            </div>
            <div className="preview-header__actions">
              <i className="fas fa-share-alt"></i>
              <i className="fas fa-download" onClick={() => {
                handleDownload(previewDocument.id, previewDocument.title);
                setPreviewDocument(null);
              }}></i>
              <i className="fas fa-trash"></i>
            </div>
          </div>
          <div className="preview-content">
            <i className="fas fa-file-pdf" style={{ fontSize: '5rem', color: 'white' }}></i>
          </div>
          <div className="preview-footer">
            {formatFileSize(previewDocument.file_size)} • {previewDocument.downloads_count} скачиваний
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
