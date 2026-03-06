import "@fortawesome/fontawesome-free/css/all.min.css";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import SplashScreen from './components/SplashScreen';

const RootComponent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Проверяем, был ли уже показан сплэш-экран в этой сессии
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('splashShown', 'true');
  };

  return (
    <React.StrictMode>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <App />
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<RootComponent />);
