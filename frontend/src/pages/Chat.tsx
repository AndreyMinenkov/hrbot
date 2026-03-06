import React, { useState, useRef, useEffect } from 'react';
import { faq, stats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  file_path?: string | null;
  status?: 'sent' | 'delivered' | 'read';
  buttons?: Array<{ text: string; id?: number }>;
  file_name?: string;
}

const Chat: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Здравствуйте! Задайте мне вопрос, и я постараюсь найти ответ в базе знаний.',
      sender: 'bot',
      timestamp: new Date(),
      status: 'read'
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Закрытие меню и эмодзи-пикера при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async (text?: string, buttonId?: number) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response;
      
      // Если есть ID кнопки, пытаемся получить вопрос по ID
      if (buttonId) {
        try {
          console.log('Fetching FAQ by ID:', buttonId);
          const directResponse = await faq.getById(buttonId);
          if (directResponse.data) {
            response = { data: [directResponse.data] };
            console.log('Found by ID:', directResponse.data);
          } else {
            response = await faq.search(messageText);
          }
        } catch (error) {
          console.error('Error fetching by ID, falling back to search:', error);
          response = await faq.search(messageText);
        }
      } else {
        response = await faq.search(messageText);
      }

      if (response.data.length > 0) {
        const faqItem = response.data[0];
        
        // Получаем имя файла из пути
        let fileName = null;
        if (faqItem.file_path) {
          const parts = faqItem.file_path.split('/');
          fileName = parts[parts.length - 1];
        }
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: faqItem.answer,
          sender: 'bot',
          timestamp: new Date(),
          file_path: faqItem.file_path,
          file_name: fileName,
          status: 'read',
          buttons: faqItem.buttons && faqItem.buttons.length > 0 ? faqItem.buttons : undefined
        };

        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id ? { ...msg, status: 'read' } : msg
          )
        );

        setMessages(prev => [...prev, botMessage]);
        
        // Сохраняем статистику
        try {
          await stats.saveChat(messageText, botMessage.text);
        } catch (statsError) {
          console.error('Error saving stats:', statsError);
        }
      } else {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Извините, я не нашел ответ на ваш вопрос. Пожалуйста, обратитесь к HR-специалисту.',
          sender: 'bot',
          timestamp: new Date(),
          status: 'read'
        };

        setMessages(prev => [...prev, botMessage]);
        
        try {
          await stats.saveChat(messageText, botMessage.text);
        } catch (statsError) {
          console.error('Error saving stats:', statsError);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
        sender: 'bot',
        timestamp: new Date(),
        status: 'read'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (button: { text: string; id?: number }) => {
    console.log('Button clicked:', button);
    handleSend(button.text, button.id);
  };

  const handleDownloadFile = (filePath: string) => {
    window.open(`http://31.130.155.16:5001${filePath}`, '_blank');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleMenuAction = (action: 'profile' | 'admin' | 'logout') => {
    setShowMenu(false);
    switch(action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
    }
  };

  return (
    <div className="chat-page">
      {/* Шапка чата */}
      <div className="chat-header">
        <div className="chat-header__left">
          <div className="chat-header__back" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="chat-header__avatar"></div>
          <div className="chat-header__info">
            <div className="chat-header__title">HR Бот</div>
            <div className="chat-header__subtitle">онлайн</div>
          </div>
        </div>
        <div className="chat-header__icons" ref={menuRef}>
          <i className="fas fa-ellipsis-vertical" onClick={() => setShowMenu(!showMenu)}></i>

          {/* Выпадающее меню */}
          {showMenu && (
            <div className="chat-header__dropdown">
              <div className="dropdown-item" onClick={() => handleMenuAction('profile')}>
                <i className="fas fa-user"></i>
                <span>Мой профиль</span>
              </div>
              {isAdmin() && (
                <div className="dropdown-item" onClick={() => handleMenuAction('admin')}>
                  <i className="fas fa-cog"></i>
                  <span>Админ-панель</span>
                </div>
              )}
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => handleMenuAction('logout')}>
                <i className="fas fa-sign-out-alt"></i>
                <span>Выйти</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Область сообщений */}
      <div className="chat-messages">
        <div className="date-divider">
          <span>Сегодня</span>
        </div>

        {messages.map(message => (
          <div key={message.id}>
            <div
              className={`message-wrapper ${
                message.sender === 'user' ? 'message-wrapper--outgoing' : 'message-wrapper--incoming'
              }`}
            >
              <div className={`message ${
                message.sender === 'user' ? 'message--outgoing' : 'message--incoming'
              }`}>
                {message.file_path && (
                  <div className="message__file">
                    <div className="message__file-icon">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <div className="message__file-info">
                      <div className="message__file-name">{message.file_name || 'Документ'}</div>
                      <button
                        className="message__file-download"
                        onClick={() => handleDownloadFile(message.file_path!)}
                      >
                        <i className="fas fa-download"></i> Скачать
                      </button>
                    </div>
                  </div>
                )}
                <div className="message__text">{message.text}</div>
                <div className="message__footer">
                  <span className="message__time">{formatTime(message.timestamp)}</span>
                  {message.sender === 'user' && (
                    <span className={`message__status message__status--${message.status}`}></span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Отображение кнопок под сообщением бота */}
            {message.sender === 'bot' && message.buttons && message.buttons.length > 0 && (
              <div className="message-buttons">
                {message.buttons.map((button, index) => (
                  <button
                    key={index}
                    className="message-button"
                    onClick={() => handleButtonClick(button)}
                    disabled={loading}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-wrapper--incoming">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Панель ввода */}
      <div className="chat-footer">
        <div className="chat-footer__icon">
          <i className="fas fa-paperclip"></i>
        </div>
        <div className="chat-footer__input-container">
          <input
            ref={inputRef}
            type="text"
            className="chat-footer__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Сообщение"
            disabled={loading}
          />
          <div
            className="chat-footer__emoji"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <i className="fas fa-smile"></i>
          </div>

          {/* Эмодзи-пикер */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="emoji-picker-container">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
        {input.trim() ? (
          <div className="chat-footer__icon chat-footer__icon--active" onClick={() => handleSend()}>
            <i className="fas fa-paper-plane"></i>
          </div>
        ) : (
          <div className="chat-footer__icon">
            {/* Пустой div */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
