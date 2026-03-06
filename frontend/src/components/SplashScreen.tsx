import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <svg width="140" height="140" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Контур - стилизованный */}
            <rect x="80" y="120" width="352" height="272" rx="16" fill="white" stroke="#0B2B5C" strokeWidth="24"/>
            
            {/* Полосы, как на контейнерах */}
            <rect x="120" y="160" width="80" height="16" fill="#D52B1E" rx="8"/>
            <rect x="120" y="200" width="80" height="16" fill="#D52B1E" rx="8"/>
            <rect x="120" y="240" width="80" height="16" fill="#D52B1E" rx="8"/>
            
            {/* Колеса */}
            <circle cx="176" cy="392" r="24" fill="#0B2B5C"/>
            <circle cx="336" cy="392" r="24" fill="#0B2B5C"/>
            
            {/* Кабина */}
            <rect x="360" y="160" width="48" height="80" fill="#0B2B5C" rx="8"/>
            <circle cx="384" cy="200" r="8" fill="#F5F7FA"/>
            
            {/* Текст S-INT */}
            <text x="256" y="360" textAnchor="middle" fill="#0B2B5C" fontSize="32" fontWeight="bold" fontFamily="Inter">S-INT</text>
          </svg>
        </div>
        <h1>Сервис-Интегратор HR</h1>
        <p className="splash-subtitle">транспортная компания</p>
      </div>
    </div>
  );
};

export default SplashScreen;
