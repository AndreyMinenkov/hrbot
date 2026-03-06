import React, { useState, useEffect } from 'react';
import { employee } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface EmployeeData {
  full_name: string;
  login: string;
  role: string;
  vacation_days_total: number;
  vacation_days_left: number;
  avatar_url?: string;
  department?: string;
  organization?: {
    id: number;
    name: string;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await employee.getData();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewProfile = () => {
    navigate('/profile');
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!data) {
    return <div className="error">Нет данных</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {data.full_name}!</h1>
        <div className="header-actions">
          <button onClick={handleViewProfile} className="profile-btn">
            <i className="fas fa-user"></i> Профиль
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="info-card">
          <div className="info-card__header">
            <i className="fas fa-user-circle"></i>
            <h2>Основная информация</h2>
          </div>
          <div className="info-card__body">
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
            {data.department && (
              <div className="info-row">
                <span className="info-label">Отдел:</span>
                <span className="info-value">{data.department}</span>
              </div>
            )}
            {data.organization && (
              <div className="info-row">
                <span className="info-label">Организация:</span>
                <span className="info-value">{data.organization.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="info-card__header">
            <i className="fas fa-umbrella-beach"></i>
            <h2>Отпуск</h2>
          </div>
          <div className="info-card__body">
            <div className="info-row">
              <span className="info-label">Всего дней:</span>
              <span className="info-value">{data.vacation_days_total}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Осталось дней:</span>
              <span className="info-value highlight">{data.vacation_days_left}</span>
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
      </div>

      <div className="quick-actions">
        <button className="action-btn" onClick={handleGoToChat}>
          <i className="fas fa-comments"></i>
          <span>Перейти в чат</span>
        </button>
        <button className="action-btn" onClick={handleViewProfile}>
          <i className="fas fa-cog"></i>
          <span>Настройки</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
