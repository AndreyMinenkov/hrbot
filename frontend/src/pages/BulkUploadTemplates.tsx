import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminTemplates.css';

interface Organization {
  id: number;
  name: string;
}

interface FileAnalysis {
  file: File;
  name: string;
  type: string;
  category: string;
  title: string;
  fields: string[];
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  error?: string;
  organization_id?: number;
}

const BulkUploadTemplates: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [files, setFiles] = useState<FileAnalysis[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/organizations');
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).map(file => ({
        file,
        name: file.name,
        type: 'other',
        category: 'Общие',
        title: file.name.replace(/\.[^/.]+$/, ""),
        fields: [],
        status: 'pending' as const,
        organization_id: selectedOrg ? Number(selectedOrg) : undefined
      }));
      setFiles(selectedFiles);
    }
  };

  const analyzeFile = async (fileAnalysis: FileAnalysis) => {
    fileAnalysis.status = 'analyzing';
    setFiles([...files]);

    try {
      const response = await api.post('/ai/analyze-document', {
        filename: fileAnalysis.file.name,
        content: ''
      });

      fileAnalysis.type = response.data.type || 'other';
      fileAnalysis.category = response.data.category || 'Общие';
      fileAnalysis.title = response.data.title || fileAnalysis.title;
      fileAnalysis.fields = response.data.fields || [];
      fileAnalysis.status = 'ready';
    } catch (error) {
      fileAnalysis.status = 'error';
      fileAnalysis.error = 'Ошибка анализа';
    }

    setFiles([...files]);
  };

  const analyzeAll = async () => {
    for (let i = 0; i < files.length; i++) {
      await analyzeFile(files[i]);
      setProgress(((i + 1) / files.length) * 100);
    }
  };

  const uploadAll = async () => {
    setUploading(true);
    let success = 0;
    let failed = 0;
    const uploadedIds: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status !== 'ready') continue;

      const formData = new FormData();
      formData.append('file', f.file);
      formData.append('title', f.title);
      formData.append('category', f.category);
      formData.append('organization_id', f.organization_id?.toString() || '');
      
      const fieldsJson = JSON.stringify(f.fields || []);
      console.log("Sending fields:", fieldsJson);
      formData.append('fields', fieldsJson);

      try {
        const response = await api.post('/documents/admin/create', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data && response.data.id) {
          uploadedIds.push(response.data.id);
          console.log(`File ${f.name} uploaded with ID: ${response.data.id}`);
        }
        success++;
      } catch (error) {
        console.error('Upload error for file:', f.name, error);
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(((i + 1) / files.length) * 100);
    }

    alert(`Загружено: ${success}, ошибок: ${failed}\nID загруженных файлов: ${uploadedIds.join(', ')}`);
    setUploading(false);
    onClose();
  };

  const updateField = (index: number, field: string, value: any) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], [field]: value };
    setFiles(newFiles);
  };

  return (
    <div className="faq-modal" onClick={onClose}>
      <div className="faq-modal__content" onClick={e => e.stopPropagation()}>
        <div className="faq-modal__header">
          <div className="faq-modal__title">
            <i className="fas fa-cloud-upload-alt"></i>
            Массовая загрузка документов
          </div>
          <div className="faq-modal__close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </div>
        </div>

        <div className="faq-modal__body">
          {/* Выбор организации */}
          <div className="faq-form-group" style={{ marginBottom: '20px' }}>
            <label>
              <i className="fas fa-building"></i>
              Организация
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              style={{ width: '100%', padding: '10px' }}
            >
              <option value="">Общая для всех организаций</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {files.length === 0 ? (
            <div className="faq-file-upload">
              <input
                type="file"
                id="bulk-upload"
                multiple
                accept=".docx,.txt,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="bulk-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Выберите файлы для загрузки</span>
                <small>.docx, .txt, .pdf - можно выбрать несколько</small>
              </label>
            </div>
          ) : (
            <>
              <div className="bulk-progress">
                <div className="progress-container" style={{ marginBottom: '20px' }}>
                  <div className="progress-bar" style={{ width: `${progress}%` }}>
                    <div className="progress-glow"></div>
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="bulk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Файл</th>
                      <th>Тип</th>
                      <th>Категория</th>
                      <th>Название</th>
                      <th>Поля</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f, idx) => (
                      <tr key={idx}>
                        <td>{f.name}</td>
                        <td>
                          <select
                            value={f.type}
                            onChange={e => updateField(idx, 'type', e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="vacation">Отпуск</option>
                            <option value="sick">Больничный</option>
                            <option value="financial">Мат. помощь</option>
                            <option value="other">Другое</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={f.category}
                            onChange={e => updateField(idx, 'category', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={f.title}
                            onChange={e => updateField(idx, 'title', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          {f.fields.join(', ')}
                        </td>
                        <td>
                          {f.status === 'pending' && <span>⏳ Ожидает</span>}
                          {f.status === 'analyzing' && <span>🔍 Анализ...</span>}
                          {f.status === 'ready' && <span style={{ color: 'var(--whatsapp-teal)' }}>✅ Готов</span>}
                          {f.status === 'error' && <span style={{ color: 'red' }}>❌ Ошибка</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="faq-form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="faq-form-actions__cancel"
                  onClick={onClose}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="faq-form-actions__save"
                  onClick={analyzeAll}
                  disabled={files.every(f => f.status !== 'pending')}
                >
                  <i className="fas fa-robot"></i> Анализировать все
                </button>
                <button
                  type="button"
                  className="faq-form-actions__save"
                  onClick={uploadAll}
                  disabled={uploading || !files.some(f => f.status === 'ready')}
                >
                  {uploading ? 'Загрузка...' : 'Загрузить все'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadTemplates;
