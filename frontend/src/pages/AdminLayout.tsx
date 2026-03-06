import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuAction = (action: 'profile' | 'logout') => {
    setShowMenu(false);
    switch(action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
    }
  };

  return (
    <div className="admin-layout">
      {/* Горизонтальный хедер на всю ширину */}
      <header className="admin-header">
        <div className="admin-header__left">
          <div className="admin-header__logo">
            <i className="fas fa-chart-bar"></i>
            <span>HR-бот Админ</span>
          </div>
        </div>

        <nav className="admin-header__nav">
          <NavLink to="/admin" className={({ isActive }) => 
            `admin-header__nav-link ${isActive ? 'admin-header__nav-link--active' : ''}`
          } end>
            <i className="fas fa-chart-bar"></i>
            <span>Статистика</span>
          </NavLink>
          
          <NavLink to="/admin/faq" className={({ isActive }) => 
            `admin-header__nav-link ${isActive ? 'admin-header__nav-link--active' : ''}`
          }>
            <i className="fas fa-file-alt"></i>
            <span>База знаний</span>
          </NavLink>
          
          <NavLink to="/admin/users" className={({ isActive }) => 
            `admin-header__nav-link ${isActive ? 'admin-header__nav-link--active' : ''}`
          }>
            <i className="fas fa-users"></i>
            <span>Сотрудники</span>
          </NavLink>
          
          <NavLink to="/admin/organizations" className={({ isActive }) => 
            `admin-header__nav-link ${isActive ? 'admin-header__nav-link--active' : ''}`
          }>
            <i className="fas fa-building"></i>
            <span>Организации</span>
          </NavLink>

          <NavLink to="/" className={({ isActive }) => 
            `admin-header__nav-link`
          }>
            <i className="fas fa-home"></i>
            <span>На главную</span>
          </NavLink>
        </nav>

        <div className="admin-header__right" ref={menuRef}>
          <div className="admin-header__user" onClick={() => setShowMenu(!showMenu)}>
            <div className="admin-header__avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </div>
            <span className="admin-header__username">
              {user?.full_name?.split(' ')[0] || 'Админ'}
            </span>
            <i className="fas fa-chevron-down"></i>
          </div>

          {/* Выпадающее меню пользователя */}
          {showMenu && (
            <div className="admin-header__dropdown">
              <div className="dropdown-item" onClick={() => handleMenuAction('profile')}>
                <i className="fas fa-user"></i>
                <span>Мой профиль</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => handleMenuAction('logout')}>
                <i className="fas fa-sign-out-alt"></i>
                <span>Выйти</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
