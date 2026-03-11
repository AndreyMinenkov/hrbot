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
  const [editOrgId, setEditOrgId] = useState<number | undefined>(undefined);
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
      setEditOrgId(profileResponse.data.organization?.id || undefined);
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
      fetchData();
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
        organization_id: editOrgId
      });
      setIsEditing(false);
      
      // Обновляем локальное состояние
      if (data) {
        const selectedOrg = organizationsList.find(org => org.id === editOrgId);
        setData({
          ...data,
          department: editDepartment,
          organization_id: editOrgId,
          organization: selectedOrg ? { id: selectedOrg.id, name: selectedOrg.name } : undefined
        });
      }
      
      fetchData(); // Для подстраховки
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
    <div className="profile-page">
      {/* Шапка профиля как в WhatsApp */}
      <div className="profile-header">
        <div className="profile-header__back" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </div>
        <div className="profile-header__title">Мой профиль</div>
        <div className="profile-header__edit" onClick={() => setIsEditing(true)}>
          <i className="fas fa-pen"></i>
        </div>
      </div>

      <div className="profile-content">
        {/* Аватар профиля */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" />
            ) : data.avatar_url ? (
              <img src={data.avatar_url} alt="Avatar" />
            ) : (
              <div className="profile-avatar__placeholder">
                {data.full_name.charAt(0)}
              </div>
            )}
            <div className="profile-avatar__overlay">
              <i className="fas fa-camera"></i>
            </div>
          </div>

          <div className="profile-name">{data.full_name}</div>
          <div className="profile-status">
            <i className="fas fa-circle"></i>
            {data.role === 'admin' ? 'Администратор' : 'Сотрудник'}
          </div>

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

        {/* Информационные секции */}
        <div className="profile-section">
          <div className="profile-section__title">Основная информация</div>
          <div className="profile-section__content">
            {/* ФИО */}
            <div className="profile-info-item">
              <div className="profile-info-item__icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="profile-info-item__content">
                <div className="profile-info-item__label">ФИО</div>
                <div className="profile-info-item__value">{data.full_name}</div>
              </div>
              <div className="profile-info-item__arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>

            {/* Логин */}
            <div className="profile-info-item">
              <div className="profile-info-item__icon">
                <i className="fas fa-envelope"></i>
              </div>
              <div className="profile-info-item__content">
                <div className="profile-info-item__label">Логин</div>
                <div className="profile-info-item__value">{data.login}</div>
              </div>
              <div className="profile-info-item__arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>

            {/* Отдел (редактирование или просмотр) */}
            {isEditing ? (
              <div className="profile-info-item">
                <div className="profile-info-item__icon">
                  <i className="fas fa-building"></i>
                </div>
                <div className="profile-info-item__content">
                  <div className="profile-info-item__label">Отдел</div>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="edit-field__input"
                    placeholder="Введите отдел"
                  />
                </div>
              </div>
            ) : (
              <div className="profile-info-item">
                <div className="profile-info-item__icon">
                  <i className="fas fa-building"></i>
                </div>
                <div className="profile-info-item__content">
                  <div className="profile-info-item__label">Отдел</div>
                  <div className="profile-info-item__value">
                    {data.department || 'Не указан'}
                  </div>
                </div>
                <div className="profile-info-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            )}

            {/* Организация (редактирование или просмотр) */}
            {isEditing ? (
              <div className="profile-info-item">
                <div className="profile-info-item__icon">
                  <i className="fas fa-company"></i>
                </div>
                <div className="profile-info-item__content">
                  <div className="profile-info-item__label">Организация</div>
                  <select
                    value={editOrgId || ''}
                    onChange={(e) => setEditOrgId(e.target.value ? Number(e.target.value) : undefined)}
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
              </div>
            ) : (
              <div className="profile-info-item">
                <div className="profile-info-item__icon">
                  <i className="fas fa-company"></i>
                </div>
                <div className="profile-info-item__content">
                  <div className="profile-info-item__label">Организация</div>
                  <div className="profile-info-item__value">
                    {data.organization?.name || 'Не указана'}
                  </div>
                </div>
                <div className="profile-info-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="profile-actions">
          {isEditing ? (
            <>
              <div className="profile-action-item" onClick={handleSave}>
                <div className="profile-action-item__icon profile-action-item__icon--primary">
                  <i className="fas fa-check"></i>
                </div>
                <div className="profile-action-item__content">
                  <div className="profile-action-item__title">Сохранить</div>
                  <div className="profile-action-item__subtitle">
                    Сохранить изменения профиля
                  </div>
                </div>
                <div className="profile-action-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>

              <div className="profile-action-item" onClick={() => setIsEditing(false)}>
                <div className="profile-action-item__icon profile-action-item__icon--danger">
                  <i className="fas fa-times"></i>
                </div>
                <div className="profile-action-item__content">
                  <div className="profile-action-item__title">Отмена</div>
                  <div className="profile-action-item__subtitle">
                    Отменить редактирование
                  </div>
                </div>
                <div className="profile-action-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="profile-action-item" onClick={() => setIsEditing(true)}>
                <div className="profile-action-item__icon profile-action-item__icon--primary">
                  <i className="fas fa-edit"></i>
                </div>
                <div className="profile-action-item__content">
                  <div className="profile-action-item__title">Редактировать профиль</div>
                  <div className="profile-action-item__subtitle">
                    Изменить отдел и организацию
                  </div>
                </div>
                <div className="profile-action-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>

              <div className="profile-action-item" onClick={handleGoToChat}>
                <div className="profile-action-item__icon profile-action-item__icon--primary">
                  <i className="fas fa-comment"></i>
                </div>
                <div className="profile-action-item__content">
                  <div className="profile-action-item__title">Перейти в чат</div>
                  <div className="profile-action-item__subtitle">
                    Вернуться к диалогу с ботом
                  </div>
                </div>
                <div className="profile-action-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>

              <div className="profile-action-item" onClick={handleLogout}>
                <div className="profile-action-item__icon profile-action-item__icon--danger">
                  <i className="fas fa-sign-out-alt"></i>
                </div>
                <div className="profile-action-item__content">
                  <div className="profile-action-item__title">Выйти</div>
                  <div className="profile-action-item__subtitle">
                    Завершить сеанс
                  </div>
                </div>
                <div className="profile-action-item__arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
