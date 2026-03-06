import React, { useState, useEffect } from 'react';
import { profile, employee, organizations } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

interface UserData {
  id: number;
  full_name: string;
  login: string;
  role: string;
  vacation_days_total: number;
  vacation_days_left: number;
  avatar_url?: string;
  department?: string;
  organization_id?: number;
  organization?: {
    id: number;
    name: string;
  };
}

interface Organization {
  id: number;
  name: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<UserData | null>(null);
  const [organizationsList, setOrganizationsList] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editDepartment, setEditDepartment] = useState('');
  const [editOrgId, setEditOrgId] = useState<number | string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileResponse, orgsResponse] = await Promise.all([
        employee.getData(),
        organizations.getAll()
      ]);
      setData(profileResponse.data);
      setEditDepartment(profileResponse.data.department || '');
      setEditOrgId(profileResponse.data.organization?.id || '');
      setOrganizationsList(orgsResponse.data);
      setError('');
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      await profile.updateAvatar(formData);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchData(); // Обновляем данные
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Ошибка загрузки аватара');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await profile.updateData({
        department: editDepartment,
        organization_id: editOrgId ? Number(editOrgId) : null
      });
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Ошибка обновления');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error || !data) {
    return <div className="error">{error || 'Нет данных'}</div>;
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>Мой профиль</h1>
        <button className="logout-button" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>

      <div className="profile-content">
        <div className="avatar-section">
          <div className="avatar-container">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="avatar-preview" />
            ) : data.avatar_url ? (
              <img src={data.avatar_url} alt="Avatar" className="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {data.full_name.charAt(0)}
              </div>
            )}
          </div>

          <div className="avatar-upload">
            <input
              type="file"
              id="avatar-input"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="avatar-input" className="avatar-upload__label">
              <i className="fas fa-camera"></i> Выбрать фото
            </label>
            {avatarFile && (
              <button
                className="avatar-upload__save"
                onClick={handleAvatarUpload}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Сохранить фото'}
              </button>
            )}
          </div>
        </div>

        <div className="info-section">
          <div className="info-row">
            <span className="info-label">ФИО:</span>
            <span className="info-value">{data.full_name}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Логин:</span>
            <span className="info-value">{data.login}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Роль:</span>
            <span className="info-value">
              {data.role === 'admin' ? 'Администратор' : 'Сотрудник'}
            </span>
          </div>

          {isEditing ? (
            <>
              <div className="info-row">
                <span className="info-label">Отдел:</span>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="edit-input"
                />
              </div>

              <div className="info-row">
                <span className="info-label">Организация:</span>
                <select
                  value={editOrgId}
                  onChange={(e) => setEditOrgId(e.target.value)}
                  className="edit-select"
                >
                  <option value="">Не выбрана</option>
                  {organizationsList.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="edit-actions">
                <button className="save-button" onClick={handleSave}>
                  Сохранить
                </button>
                <button className="cancel-button" onClick={() => setIsEditing(false)}>
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="info-row">
                <span className="info-label">Отдел:</span>
                <span className="info-value">{data.department || 'Не указан'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Организация:</span>
                <span className="info-value">
                  {data.organization?.name || 'Не указана'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="vacation-section">
          <h2>Отпуск</h2>
          <div className="vacation-stats">
            <div className="stat">
              <span className="stat-label">Всего дней:</span>
              <span className="stat-value">{data.vacation_days_total}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Осталось:</span>
              <span className="stat-value highlight">{data.vacation_days_left}</span>
            </div>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar__fill" 
              style={{ 
                width: `${(data.vacation_days_left / data.vacation_days_total) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        {!isEditing && (
          <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
            <i className="fas fa-edit"></i> Редактировать профиль
          </button>
        )}
        <button className="chat-btn" onClick={handleGoToChat}>
          <i className="fas fa-comment"></i> Перейти в чат
        </button>
      </div>
    </div>
  );
};

export default Profile;
