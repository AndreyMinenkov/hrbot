import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Анимация прогресса
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 800);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        {/* Анимированный логотип */}
        <div className="splash-logo">
          <svg width="180" height="180" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Фон с градиентом */}
            <rect x="60" y="100" width="392" height="292" rx="24" fill="url(#gradient)" stroke="#00a884" strokeWidth="20" strokeOpacity="0.8"/>
            
            {/* Декоративные линии */}
            <path d="M120 160 L392 160" stroke="#00a884" strokeWidth="8" strokeDasharray="12 12"/>
            <path d="M120 220 L392 220" stroke="#00a884" strokeWidth="8" strokeDasharray="12 12"/>
            <path d="M120 280 L392 280" stroke="#00a884" strokeWidth="8" strokeDasharray="12 12"/>
            
            {/* Колеса с анимацией вращения */}
            <g className="wheel wheel-left">
              <circle cx="176" cy="392" r="28" fill="#00a884"/>
              <circle cx="176" cy="392" r="16" fill="#F5F7FA"/>
              <circle cx="176" cy="392" r="6" fill="#00a884"/>
              <line x1="148" y1="392" x2="204" y2="392" stroke="#F5F7FA" strokeWidth="4"/>
              <line x1="176" y1="364" x2="176" y2="420" stroke="#F5F7FA" strokeWidth="4"/>
            </g>
            
            <g className="wheel wheel-right">
              <circle cx="336" cy="392" r="28" fill="#00a884"/>
              <circle cx="336" cy="392" r="16" fill="#F5F7FA"/>
              <circle cx="336" cy="392" r="6" fill="#00a884"/>
              <line x1="308" y1="392" x2="364" y2="392" stroke="#F5F7FA" strokeWidth="4"/>
              <line x1="336" y1="364" x2="336" y2="420" stroke="#F5F7FA" strokeWidth="4"/>
            </g>
            
            {/* Кабина с пульсирующим окном */}
            <rect x="360" y="140" width="60" height="100" fill="#00a884" rx="12"/>
            <circle cx="390" cy="190" r="12" fill="#F5F7FA" className="window-pulse"/>
            
            {/* Логотип с анимацией появления */}
            <text 
              x="256" 
              y="340" 
              textAnchor="middle" 
              fill="#00a884" 
              fontSize="36" 
              fontWeight="bold" 
              fontFamily="Inter"
              className="logo-text"
            >
              S-INT
            </text>
            
            {/* Градиент */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5F7FA" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#E0E5EC" stopOpacity="0.9"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Текст с анимацией */}
        <h1 className="splash-title">
          <span className="title-word">Сервис-Интегратор</span>
          <span className="title-word">HR</span>
        </h1>
        
        <p className="splash-subtitle">
          <span className="subtitle-word">транспортная</span>
          <span className="subtitle-word">компания</span>
        </p>
        
        {/* Прогресс-бар */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          >
            <div className="progress-glow"></div>
          </div>
        </div>
        
        {/* Статус загрузки */}
        <p className="loading-status">
          {progress < 30 && "Загрузка ресурсов..."}
          {progress >= 30 && progress < 60 && "Подготовка данных..."}
          {progress >= 60 && progress < 90 && "Почти готово..."}
          {progress >= 90 && "Запуск..."}
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
