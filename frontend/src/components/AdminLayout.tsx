import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <h2>HR Бот</h2>
          <span>Админ-панель</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" className={({ isActive }) =>
            `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
          } end>
            <i className="fas fa-chart-pie"></i>
            <span>Статистика</span>
          </NavLink>

          <NavLink to="/admin/faq" className={({ isActive }) =>
            `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
          }>
            <i className="fas fa-question-circle"></i>
            <span>База знаний</span>
          </NavLink>

          <NavLink to="/admin/users" className={({ isActive }) =>
            `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
          }>
            <i className="fas fa-users"></i>
            <span>Пользователи</span>
          </NavLink>

          <NavLink to="/admin/organizations" className={({ isActive }) =>
            `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
          }>
            <i className="fas fa-building"></i>
            <span>Организации</span>
          </NavLink>

          <NavLink to="/admin/templates" className={({ isActive }) =>
            `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
          }>
            <i className="fas fa-file-alt"></i>
            <span>Шаблоны документов</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <NavLink to="/chat" className="admin-nav__link">
            <i className="fas fa-comment"></i>
            <span>Перейти в чат</span>
          </NavLink>
          <button onClick={handleLogout} className="admin-logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
