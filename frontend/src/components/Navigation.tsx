import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

interface NavigationProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ 
  title, 
  showBack = true, 
  showHome = true 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Мобильная нижняя навигация
  const renderBottomNav = () => (
    <div className="bottom-nav">
      <div 
        className={`bottom-nav__item ${isActive('/') ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="bottom-nav__badge" data-count="3">
          <i className="fas fa-comment-dots"></i>
        </div>
        <span>Чаты</span>
      </div>
      <div 
        className={`bottom-nav__item ${isActive('/faq') ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('/faq')}
      >
        <i className="fas fa-question-circle"></i>
        <span>FAQ</span>
      </div>
      <div 
        className={`bottom-nav__item ${isActive('/documents') ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('/documents')}
      >
        <i className="fas fa-file-alt"></i>
        <span>Документы</span>
      </div>
      <div 
        className={`bottom-nav__item ${isActive('/profile') ? 'bottom-nav__item--active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <i className="fas fa-user"></i>
        <span>Профиль</span>
      </div>
    </div>
  );

  // Десктопная боковая навигация
  const renderSideNav = () => (
    <div className="side-nav">
      <div className="side-nav__header">
        <div className="side-nav__user">
          <div className="side-nav__avatar">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </div>
          <div className="side-nav__info">
            <div className="side-nav__name">{user?.full_name?.split(' ')[0] || 'Пользователь'}</div>
            <div className="side-nav__status">
              <i className="fas fa-circle"></i>
              {user?.role === 'admin' ? 'Администратор' : 'Сотрудник'}
            </div>
          </div>
          {/* Кнопка выхода перенесена в правую часть шапки */}
          <div className="side-nav__logout" onClick={logout} title="Выйти">
            <i className="fas fa-sign-out-alt"></i>
          </div>
        </div>
      </div>

      <div className="side-nav__search">
        <div className="side-nav__search-bar">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Поиск" />
        </div>
      </div>

      <div className="side-nav__menu">
        <div 
          className={`side-nav__item ${isActive('/') ? 'side-nav__item--active' : ''}`}
          onClick={() => navigate('/')}
        >
          <i className="fas fa-comment-dots"></i>
          <span>Чаты</span>
          <span className="side-nav__badge">3</span>
        </div>
        <div 
          className={`side-nav__item ${isActive('/faq') ? 'side-nav__item--active' : ''}`}
          onClick={() => navigate('/faq')}
        >
          <i className="fas fa-question-circle"></i>
          <span>FAQ</span>
        </div>
        <div 
          className={`side-nav__item ${isActive('/documents') ? 'side-nav__item--active' : ''}`}
          onClick={() => navigate('/documents')}
        >
          <i className="fas fa-file-alt"></i>
          <span>Документы</span>
        </div>
        <div 
          className={`side-nav__item ${isActive('/profile') ? 'side-nav__item--active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          <i className="fas fa-user"></i>
          <span>Профиль</span>
        </div>

        <div className="side-nav__divider"></div>

        {isAdmin() && (
          <>
            <div 
              className={`side-nav__item ${location.pathname.startsWith('/admin') ? 'side-nav__item--active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <i className="fas fa-cog"></i>
              <span>Админ-панель</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Десктопная версия */}
      {renderSideNav()}
      
      {/* Мобильная версия - нижняя навигация */}
      {renderBottomNav()}
    </>
  );
};

export default Navigation;
