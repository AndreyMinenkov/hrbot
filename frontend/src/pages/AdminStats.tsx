import React, { useEffect, useState } from 'react';
import { stats } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './AdminStats.css';

interface StatsData {
  dialogs: {
    today: number;
    week: number;
  };
  popular_questions: Array<{
    question: string;
    count: number;
  }>;
  documents: {
    total_downloads: number;
    total_documents: number;
  };
  users: {
    total: number;
  };
  daily_activity: Array<{
    date: string;
    count: number | string;
  }>;
}

const AdminStats: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await stats.getAdmin();
      setData(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Безопасное получение значений с проверкой на undefined
  const dialogsToday = data?.dialogs?.today ?? 0;
  const dialogsWeek = data?.dialogs?.week ?? 0;
  const usersTotal = data?.users?.total ?? 0;
  const downloadsTotal = data?.documents?.total_downloads ?? 0;
  const documentsTotal = data?.documents?.total_documents ?? 0;
  const popularQuestions = data?.popular_questions ?? [];
  const dailyActivity = data?.daily_activity ?? [];

  // Вычисляем процентное соотношение для популярных вопросов
  const totalQuestions = popularQuestions.reduce((sum, q) => sum + q.count, 0);
  const questionsWithPercentage = popularQuestions.map(q => ({
    ...q,
    percentage: totalQuestions > 0 ? Math.round((q.count / totalQuestions) * 100) : 0
  }));

  // Вычисляем изменение в процентах (для демонстрации)
  const dialogsChange = dialogsWeek > dialogsToday ? 
    Math.round((dialogsWeek - dialogsToday) / dialogsWeek * 100) : 0;

  if (loading) return <div className="loading">Загрузка статистики...</div>;

  return (
    <div className="admin-stats">
      {/* Заголовок с периодом и кнопкой назад */}
      <div className="stats-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.3rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
            }}
            className="mobile-back-button"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="stats-title">
            <i className="fas fa-chart-bar"></i>
            Статистика
          </div>
        </div>
        <div className="stats-period">
          <button 
            className={`stats-period__btn ${period === 'today' ? 'stats-period__btn--active' : ''}`}
            onClick={() => setPeriod('today')}
          >
            Сегодня
          </button>
          <button 
            className={`stats-period__btn ${period === 'week' ? 'stats-period__btn--active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            Неделя
          </button>
          <button 
            className={`stats-period__btn ${period === 'month' ? 'stats-period__btn--active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            Месяц
          </button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="stats-kpi">
        <div className="kpi-card">
          <div className="kpi-card__icon">
            <i className="fas fa-comment-dots"></i>
          </div>
          <div className="kpi-card__content">
            <div className="kpi-card__label">Диалогов</div>
            <div className="kpi-card__value">
              {period === 'today' && dialogsToday}
              {period === 'week' && dialogsWeek}
              {period === 'month' && dialogsWeek * 4} {/* Примерно */}
            </div>
            <div className={`kpi-card__change ${dialogsChange > 0 ? 'kpi-card__change--positive' : 'kpi-card__change--negative'}`}>
              <i className={`fas fa-arrow-up`}></i>
              {dialogsChange}% к прошлому периоду
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="kpi-card__content">
            <div className="kpi-card__label">Пользователи</div>
            <div className="kpi-card__value">{usersTotal}</div>
            <div className="kpi-card__change kpi-card__change--positive">
              <i className="fas fa-check-circle"></i>
              Зарегистрировано
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon">
            <i className="fas fa-download"></i>
          </div>
          <div className="kpi-card__content">
            <div className="kpi-card__label">Скачиваний</div>
            <div className="kpi-card__value">{downloadsTotal}</div>
            <div className="kpi-card__change kpi-card__change--positive">
              <i className="fas fa-file-alt"></i>
              Документов: {documentsTotal}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div className="kpi-card__content">
            <div className="kpi-card__label">Активность</div>
            <div className="kpi-card__value">
              {dailyActivity.length > 0 ? dailyActivity[0]?.count : 0}
            </div>
            <div className="kpi-card__change">
              <i className="fas fa-clock"></i>
              сегодня
            </div>
          </div>
        </div>
      </div>

      {/* График активности */}
      {dailyActivity.length > 0 && (
        <div className="stats-charts">
          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">
                <i className="fas fa-calendar-alt"></i>
                Активность по дням
              </div>
            </div>
            <div className="daily-activity" style={{ display: 'flex', gap: '8px', minHeight: '150px', alignItems: 'flex-end' }}>
              {dailyActivity.slice(0, 7).map((day, idx) => {
                const count = typeof day.count === 'string' ? parseInt(day.count) : day.count;
                const maxCount = Math.max(...dailyActivity.map(d => 
                  typeof d.count === 'string' ? parseInt(d.count) : d.count
                ), 1);
                const height = (count / maxCount) * 150;
                const date = new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' });
                
                return (
                  <div key={idx} className="hour-bar" style={{ flex: 1 }}>
                    <div className="hour-bar__value" style={{ height: `${height}px` }}></div>
                    <div className="hour-bar__label">{date}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--whatsapp-teal)' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Таблица популярных вопросов */}
      <div className="stats-table-section">
        <div className="stats-table-header">
          <div className="stats-table-title">
            <i className="fas fa-fire"></i>
            Популярные вопросы
          </div>
        </div>

        <div className="stats-table">
          <table>
            <thead>
              <tr>
                <th>Вопрос</th>
                <th>Количество</th>
                <th>% от всех</th>
              </tr>
            </thead>
            <tbody>
              {questionsWithPercentage.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                    Нет данных о популярных вопросах
                  </td>
                </tr>
              ) : (
                questionsWithPercentage.map((q, index) => (
                  <tr key={index}>
                    <td>{q.question}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{q.count}</span>
                        <div className="table-progress">
                          <div className="table-progress__bar" style={{ width: `${q.percentage}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td>{q.percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Информация о документах */}
      <div className="stats-table-section">
        <div className="stats-table-header">
          <div className="stats-table-title">
            <i className="fas fa-file-alt"></i>
            Документы
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
          <div className="kpi-card" style={{ margin: 0 }}>
            <div className="kpi-card__icon">
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="kpi-card__content">
              <div className="kpi-card__label">Всего документов</div>
              <div className="kpi-card__value">{documentsTotal}</div>
            </div>
          </div>
          <div className="kpi-card" style={{ margin: 0 }}>
            <div className="kpi-card__icon">
              <i className="fas fa-download"></i>
            </div>
            <div className="kpi-card__content">
              <div className="kpi-card__label">Всего скачиваний</div>
              <div className="kpi-card__value">{downloadsTotal}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
