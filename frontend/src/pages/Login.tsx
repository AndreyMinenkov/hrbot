import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authLogin(login, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Шапка как в WhatsApp */}
      <div className="login-header">
        <div className="login-header__logo">
          <i className="fas fa-comment-dots"></i>
        </div>
        <h1 className="login-header__title">HR Чат</h1>
        <p className="login-header__subtitle">Сервис-Интегратор</p>
      </div>

      {/* Основной контент */}
      <div className="login-content">
        <div className="login-form">
          <h2 className="login-form__title">Вход в систему</h2>

          {error && (
            <div className="login-form__error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-form__field">
              <label className="login-form__label">Электронная почта</label>
              <div className="login-form__input-wrapper">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  className="login-form__input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  placeholder="ivan@s-int.ru"
                />
              </div>
            </div>

            <div className="login-form__field">
              <label className="login-form__label">Пароль</label>
              <div className="login-form__input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  className="login-form__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="login-form__button"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner spinner"></i>
                  Вход...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Войти
                </>
              )}
            </button>
          </form>

          <div className="login-form__forgot">
            <a href="#">Забыли пароль?</a>
          </div>
        </div>
      </div>

      {/* Футер */}
      <div className="login-footer">
        <div className="login-footer__links">
          <a href="#">Помощь</a>
          <a href="#">Конфиденциальность</a>
          <a href="#">Условия</a>
        </div>
        <div>© 2026 Сервис-Интегратор</div>
      </div>
    </div>
  );
};

export default Login;
