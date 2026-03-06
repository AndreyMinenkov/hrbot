import React, { useState, useEffect } from 'react';
import { adminUsers, organizations } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './AdminOrganizations.css';

interface Organization {
  id: number;
  name: string;
  created_at: string;
  employee_count?: number;
  document_count?: number;
}

interface User {
  id: number;
  full_name: string;
  login: string;
  role: string;
  organization_id?: number;
  organization_name?: string;
}

const AdminOrganizations: React.FC = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgEmployees, setOrgEmployees] = useState<User[]>([]);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  // Загрузка организаций и пользователей
  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsResponse, usersResponse] = await Promise.all([
        organizations.getAll(),
        adminUsers.getAll()
      ]);
      
      const orgsData = orgsResponse.data;
      const usersData = usersResponse.data;
      
      setUsers(usersData);
      
      // Подсчитываем количество сотрудников для каждой организации
      const orgsWithStats = orgsData.map((org: Organization) => {
        const employeeCount = usersData.filter((u: User) => u.organization_id === org.id).length;
        
        return {
          ...org,
          employee_count: employeeCount,
          document_count: 0 // Пока оставим 0, позже добавим реальные документы
        };
      });
      
      setOrgs(orgsWithStats);
      setError('');
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Фильтрация по поиску
  const filteredOrgs = orgs.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Статистика
  const totalEmployees = users.length;
  const newThisMonth = users.filter(u => {
    const created = new Date(u.id); // Замените на реальное поле created_at
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  // Создание новой организации
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await organizations.create(formData.name.trim());
      setFormData({ name: '' });
      setShowModal(false);
      loadData();
    } catch (err) {
      setError('Ошибка при создании организации');
      console.error(err);
    }
  };

  // Начало редактирования
  const startEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name });
    setShowModal(true);
  };

  // Сохранение изменений
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg || !formData.name.trim()) return;

    try {
      await organizations.update(editingOrg.id, formData.name.trim());
      setEditingOrg(null);
      setFormData({ name: '' });
      setShowModal(false);
      loadData();
    } catch (err) {
      setError('Ошибка при обновлении организации');
      console.error(err);
    }
  };

  // Удаление организации
  const handleDelete = async (id: number, name: string) => {
    const hasEmployees = users.some(u => u.organization_id === id);
    
    if (hasEmployees) {
      alert(`Нельзя удалить организацию "${name}", так как к ней привязаны сотрудники`);
      return;
    }

    if (!window.confirm(`Удалить организацию "${name}"?`)) {
      return;
    }

    try {
      await organizations.delete(id);
      loadData();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка при удалении организации');
      }
      console.error(err);
    }
  };

  // Просмотр сотрудников организации
  const showEmployees = (org: Organization) => {
    const employees = users.filter(u => u.organization_id === org.id);
    setOrgEmployees(employees);
    setSelectedOrg(org);
    setShowEmployeesModal(true);
  };

  // Закрытие модалки
  const closeModal = () => {
    setShowModal(false);
    setEditingOrg(null);
    setFormData({ name: '' });
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && orgs.length === 0) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="admin-organizations">
      {/* Поиск */}
      <div className="organizations-search">
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Поиск организации..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="org-stats">
        <div className="org-stat-card">
          <div className="org-stat-card__title">Всего организаций</div>
          <div className="org-stat-card__value">{orgs.length}</div>
          <div className="org-stat-card__change">
            <i className="fas fa-building"></i>
            Активных
          </div>
        </div>
        <div className="org-stat-card">
          <div className="org-stat-card__title">Сотрудников</div>
          <div className="org-stat-card__value">{totalEmployees}</div>
          <div className="org-stat-card__change">
            <i className="fas fa-users"></i>
            +{newThisMonth} новых
          </div>
        </div>
        <div className="org-stat-card">
          <div className="org-stat-card__title">Документов</div>
          <div className="org-stat-card__value">0</div>
          <div className="org-stat-card__change">
            <i className="fas fa-file-alt"></i>
            В разработке
          </div>
        </div>
        <div className="org-stat-card">
          <div className="org-stat-card__title">Среднее</div>
          <div className="org-stat-card__value">
            {orgs.length ? Math.round(totalEmployees / orgs.length) : 0}
          </div>
          <div className="org-stat-card__change">
            <i className="fas fa-chart-line"></i>
            сотрудников на организацию
          </div>
        </div>
      </div>

      {/* Кнопка добавления */}
      <div style={{ padding: '0 20px 16px' }}>
        <button className="admin-btn admin-btn--primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i>
          Добавить организацию
        </button>
      </div>

      {/* Список организаций */}
      <div className="organizations-list">
        {filteredOrgs.length === 0 ? (
          <div className="organizations-empty">
            <i className="fas fa-building"></i>
            <h3>Организации не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          filteredOrgs.map(org => (
            <div key={org.id} className="organization-item">
              <div className="organization-item__icon">
                <i className="fas fa-building"></i>
              </div>
              <div className="organization-item__info">
                <div className="organization-item__name-row">
                  <span className="organization-item__name">{org.name}</span>
                  <span className="organization-item__date">
                    <i className="fas fa-calendar"></i>
                    {formatDate(org.created_at)}
                  </span>
                </div>
                <div className="organization-item__details">
                  <span 
                    className="organization-item__detail organization-item__detail--clickable"
                    onClick={() => showEmployees(org)}
                    title="Показать сотрудников"
                  >
                    <i className="fas fa-users"></i>
                    {org.employee_count || 0} сотрудников
                  </span>
                  <span className="organization-item__detail">
                    <i className="fas fa-file-alt"></i>
                    {org.document_count || 0} документов
                  </span>
                </div>
              </div>
              <div className="organization-item__actions">
                <div 
                  className="org-action org-action--edit" 
                  onClick={() => startEdit(org)}
                  title="Редактировать"
                >
                  <i className="fas fa-pen"></i>
                </div>
                <div 
                  className="org-action org-action--delete" 
                  onClick={() => handleDelete(org.id, org.name)}
                  title="Удалить"
                >
                  <i className="fas fa-trash"></i>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно организации */}
      {showModal && (
        <div className="org-modal">
          <div className="org-modal__content">
            <div className="org-modal__header">
              <div className="org-modal__title">
                <i className="fas fa-building"></i>
                {editingOrg ? 'Редактировать' : 'Новая организация'}
              </div>
              <div className="org-modal__close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </div>
            </div>

            <div className="org-modal__body">
              <form onSubmit={editingOrg ? handleUpdate : handleCreate} className="org-form">
                <div className="org-form-group">
                  <label>
                    <i className="fas fa-tag"></i>
                    Название организации
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="Введите название"
                    required
                    autoFocus
                  />
                </div>

                {editingOrg && (
                  <div className="org-stats-preview">
                    <div className="org-stat-item">
                      <div className="org-stat-item__value">{orgs.find(o => o.id === editingOrg.id)?.employee_count || 0}</div>
                      <div className="org-stat-item__label">Сотрудников</div>
                    </div>
                    <div className="org-stat-item">
                      <div className="org-stat-item__value">{orgs.find(o => o.id === editingOrg.id)?.document_count || 0}</div>
                      <div className="org-stat-item__label">Документов</div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="login-form__error">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                  </div>
                )}

                <div className="org-form-actions">
                  <button type="submit" className="org-form-actions__save">
                    {editingOrg ? 'Сохранить' : 'Создать'}
                  </button>
                  <button type="button" className="org-form-actions__cancel" onClick={closeModal}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно со списком сотрудников */}
      {showEmployeesModal && selectedOrg && (
        <div className="org-modal">
          <div className="org-modal__content">
            <div className="org-modal__header">
              <div className="org-modal__title">
                <i className="fas fa-users"></i>
                Сотрудники: {selectedOrg.name}
              </div>
              <div className="org-modal__close" onClick={() => setShowEmployeesModal(false)}>
                <i className="fas fa-times"></i>
              </div>
            </div>

            <div className="org-modal__body">
              {orgEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ui-dark-gray)' }}>
                  <i className="fas fa-user-slash" style={{ fontSize: '3rem', marginBottom: '12px' }}></i>
                  <h3>Нет сотрудников</h3>
                  <p>В этой организации пока нет сотрудников</p>
                </div>
              ) : (
                <div className="org-employees">
                  {orgEmployees.map(emp => (
                    <div key={emp.id} className="org-employee-item">
                      <div className="org-employee-item__avatar">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div className="org-employee-item__info">
                        <div className="org-employee-item__name">{emp.full_name}</div>
                        <div className="org-employee-item__role">
                          <i className="fas fa-envelope"></i> {emp.login}
                          <span style={{ marginLeft: '12px' }}>
                            <i className="fas fa-tag"></i> {emp.role === 'admin' ? 'Админ' : 'Сотрудник'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganizations;
